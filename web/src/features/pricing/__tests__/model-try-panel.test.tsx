/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useAuthStore } from '@/stores/auth-store'

import { ModelTryPanel } from '../components/model-try-panel'
import type { PricingModel } from '../types'

const streams = vi.hoisted(() => ({
  instances: [] as {
    options: { payload: string }
    closed: boolean
    emit: (type: string, event: Record<string, unknown>) => void
  }[],
}))

// The relay is the only thing outside the panel: a fake event source stands in
// for it and the test plays the server's part.
vi.mock('sse.js', () => ({
  SSE: class FakeSSE {
    options: { payload: string }
    readyState = 1
    closed = false
    private handlers = new Map<string, ((event: unknown) => void)[]>()

    constructor(_url: string, options: { payload: string }) {
      this.options = options
      streams.instances.push(this)
    }

    addEventListener(type: string, handler: (event: unknown) => void) {
      this.handlers.set(type, [...(this.handlers.get(type) ?? []), handler])
    }

    stream() {}

    close() {
      this.closed = true
    }

    emit(type: string, event: Record<string, unknown>) {
      for (const handler of this.handlers.get(type) ?? []) handler(event)
    }
  },
}))

vi.mock('@/lib/api', () => ({
  getFreshAuthHeaders: async () => ({ Authorization: 'Bearer test-token' }),
}))

vi.mock('@/hooks/use-status', () => ({
  useStatus: () => ({ status: { price: 7.3 } }),
}))

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    to,
    search,
    children,
    ...rest
  }: {
    to: string
    search?: Record<string, string>
    children?: React.ReactNode
  }) => (
    <a
      href={search ? `${to}?${new URLSearchParams(search).toString()}` : to}
      {...rest}
    >
      {children}
    </a>
  ),
  useLocation: (options?: {
    select?: (location: { href: string }) => unknown
  }) => {
    const location = { href: '/marketplace?zone=domestic' }
    return options?.select ? options.select(location) : location
  },
}))

const model: PricingModel = {
  id: 1,
  model_name: 'glm-4-plus',
  quota_type: 0,
  model_ratio: 1,
  completion_ratio: 3,
  enable_groups: ['default'],
  group_ratio: { default: 1 },
}

const chunk = (text: string) =>
  JSON.stringify({ choices: [{ delta: { content: text } }] })

function messageBox() {
  return screen.getByRole('textbox', {
    name: 'Type a message to try this model…',
  })
}

async function typeMessage(text: string) {
  await userEvent.type(messageBox(), text)
}

async function sendAndOpenStream(text: string) {
  await typeMessage(text)
  await userEvent.click(screen.getByRole('button', { name: 'Send' }))
  await waitFor(() => expect(streams.instances).toHaveLength(1))
  return streams.instances[0]
}

function signIn() {
  useAuthStore
    .getState()
    .auth.setUser({ id: 1, username: 'tester', role: 1, group: 'default' })
}

describe('ModelTryPanel', () => {
  beforeEach(() => {
    streams.instances.length = 0
    useAuthStore.getState().auth.reset()
  })

  afterEach(() => {
    useAuthStore.getState().auth.reset()
  })

  it('asks a visitor to sign in, and sends nothing, when they try to send', async () => {
    render(<ModelTryPanel model={model} group='default' />)

    await typeMessage('Hello')
    await userEvent.click(screen.getByRole('button', { name: 'Send' }))

    expect(screen.getByText('Sign in to try it')).toBeInTheDocument()
    // The shared Button gives a link-styled action the button role.
    expect(screen.getByRole('button', { name: 'Sign in' })).toHaveAttribute(
      'href',
      expect.stringContaining('/sign-in?redirect=')
    )
    expect(screen.getByRole('button', { name: 'Sign up' })).toHaveAttribute(
      'href',
      '/sign-up'
    )
    await act(async () => {})
    expect(streams.instances).toHaveLength(0)
    expect(messageBox()).toHaveValue('Hello')
  })

  it('shows an estimate for the message being typed before anything is sent', async () => {
    render(<ModelTryPanel model={model} group='default' />)

    await typeMessage('abcdefgh')

    expect(screen.getByText('Est. tokens:')).toHaveTextContent('Est. tokens: 2')
  })

  it('streams the reply into the conversation, then shows the real usage and cost', async () => {
    signIn()
    render(<ModelTryPanel model={model} group='default' />)

    const stream = await sendAndOpenStream('Hello')
    act(() => {
      stream.emit('message', { data: chunk('Hi ') })
      stream.emit('message', { data: chunk('there') })
      stream.emit('message', {
        data: JSON.stringify({
          choices: [],
          usage: { prompt_tokens: 5, completion_tokens: 7 },
        }),
      })
      stream.emit('message', { data: '[DONE]' })
    })

    const log = screen.getByRole('log', { name: 'Try-it conversation' })
    expect(log).toHaveTextContent('Hello')
    expect(log).toHaveTextContent('Hi there')
    // 5 tokens in at $2 and 7 out at $6 per million, at 7.3 yuan per credit.
    expect(screen.getByText('Tokens used:')).toHaveTextContent(
      'Tokens used: 12'
    )
    expect(screen.getByText('Actual cost:')).toHaveTextContent(
      'Actual cost: ¥0.0004'
    )
    expect(JSON.parse(stream.options.payload)).toMatchObject({
      model: 'glm-4-plus',
      group: 'default',
      stream: true,
    })
  })

  it('sends the message when Enter is pressed, but not while confirming an IME candidate', async () => {
    signIn()
    render(<ModelTryPanel model={model} group='default' />)
    await typeMessage('你好')

    fireEvent.keyDown(messageBox(), { key: 'Enter', isComposing: true })
    await act(async () => {})
    expect(streams.instances).toHaveLength(0)

    await userEvent.keyboard('{Enter}')
    await waitFor(() => expect(streams.instances).toHaveLength(1))
  })

  it('sends the chosen temperature', async () => {
    signIn()
    render(<ModelTryPanel model={model} group='default' />)

    fireEvent.change(
      screen.getByRole('slider', { name: 'Sampling temperature' }),
      { target: { value: '0.2' } }
    )
    const stream = await sendAndOpenStream('Hello')

    expect(JSON.parse(stream.options.payload).temperature).toBe(0.2)
  })

  it('shows the relay error, offers a top-up, and returns the text when the balance is too low', async () => {
    signIn()
    render(<ModelTryPanel model={model} group='default' />)

    const stream = await sendAndOpenStream('Hello')
    act(() => {
      stream.emit('error', {
        data: JSON.stringify({
          error: {
            message: 'Balance too low',
            code: 'insufficient_user_quota',
          },
        }),
      })
    })

    expect(screen.getByRole('alert')).toHaveTextContent('Balance too low')
    expect(screen.getByRole('link', { name: 'Top up now' })).toHaveAttribute(
      'href',
      '/wallet'
    )
    expect(messageBox()).toHaveValue('Hello')
    expect(screen.getByRole('button', { name: 'Send' })).toBeEnabled()
  })

  it('shows other errors without a top-up link', async () => {
    signIn()
    render(<ModelTryPanel model={model} group='default' />)

    const stream = await sendAndOpenStream('Hello')
    act(() => {
      stream.emit('error', {
        data: JSON.stringify({
          error: {
            message: 'No channel for this model',
            code: 'model_not_found',
          },
        }),
      })
    })

    expect(screen.getByRole('alert')).toHaveTextContent(
      'No channel for this model'
    )
    expect(
      screen.queryByRole('link', { name: 'Top up now' })
    ).not.toBeInTheDocument()
  })

  it('keeps what already arrived when the reply is stopped', async () => {
    signIn()
    render(<ModelTryPanel model={model} group='default' />)

    const stream = await sendAndOpenStream('Hello')
    act(() => stream.emit('message', { data: chunk('Partial') }))
    await userEvent.click(screen.getByRole('button', { name: 'Stop' }))

    expect(stream.closed).toBe(true)
    expect(
      screen.getByRole('log', { name: 'Try-it conversation' })
    ).toHaveTextContent('Partial')
    expect(screen.getByRole('button', { name: 'Send' })).toBeInTheDocument()
  })

  it('says so when the model answers with nothing', async () => {
    signIn()
    render(<ModelTryPanel model={model} group='default' />)

    const stream = await sendAndOpenStream('Hello')
    act(() => stream.emit('message', { data: '[DONE]' }))

    expect(
      screen.getByRole('log', { name: 'Try-it conversation' })
    ).toHaveTextContent('The model returned no content.')
  })
})

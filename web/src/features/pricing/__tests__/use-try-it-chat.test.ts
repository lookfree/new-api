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
import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useTryItChat } from '../hooks/use-try-it-chat'

const streams = vi.hoisted(() => ({
  instances: [] as {
    url: string
    options: { headers: Record<string, string>; payload: string }
    closed: boolean
    emit: (type: string, event: Record<string, unknown>) => void
  }[],
}))

vi.mock('sse.js', () => ({
  SSE: class FakeSSE {
    url: string
    options: { headers: Record<string, string>; payload: string }
    readyState = 1
    closed = false
    private handlers = new Map<string, ((event: unknown) => void)[]>()

    constructor(
      url: string,
      options: { headers: Record<string, string>; payload: string }
    ) {
      this.url = url
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

const content = (text: string) =>
  JSON.stringify({ choices: [{ delta: { content: text } }] })

function lastStream() {
  const stream = streams.instances.at(-1)
  if (!stream) throw new Error('no stream was opened')
  return stream
}

async function sendMessage(
  hook: ReturnType<typeof renderHook<ReturnType<typeof useTryItChat>, unknown>>,
  text: string
) {
  act(() => hook.result.current.setInput(text))
  await act(async () => {
    await hook.result.current.send()
  })
}

describe('useTryItChat', () => {
  beforeEach(() => {
    streams.instances.length = 0
  })

  it('streams the reply into the conversation and records the real usage', async () => {
    const hook = renderHook(() =>
      useTryItChat({ model: 'glm-4-plus', group: 'vip' })
    )
    await sendMessage(hook, 'Hello')

    const stream = lastStream()
    expect(stream.url).toBe('/pg/chat/completions')
    expect(stream.options.headers.Authorization).toBe('Bearer test-token')
    expect(JSON.parse(stream.options.payload)).toMatchObject({
      model: 'glm-4-plus',
      group: 'vip',
      stream: true,
      temperature: 0.7,
      messages: [{ role: 'user', content: 'Hello' }],
    })
    expect(hook.result.current.streaming).toBe(true)

    act(() => {
      stream.emit('message', { data: content('Hi') })
      stream.emit('message', { data: content(' there') })
      stream.emit('message', {
        data: JSON.stringify({
          choices: [],
          usage: { prompt_tokens: 5, completion_tokens: 7 },
        }),
      })
      stream.emit('message', { data: '[DONE]' })
    })

    expect(hook.result.current.messages).toMatchObject([
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi there' },
    ])
    expect(hook.result.current.turns).toEqual([
      { inputTokens: 5, outputTokens: 7, exact: true },
    ])
    expect(hook.result.current.streaming).toBe(false)
    expect(hook.result.current.input).toBe('')
  })

  it('estimates the cost of a reply that carried no usage', async () => {
    const hook = renderHook(() => useTryItChat({ model: 'glm-4-plus' }))
    await sendMessage(hook, 'abcdefgh')

    act(() => {
      lastStream().emit('message', { data: content('abcdefghijklmnop') })
      lastStream().emit('message', { data: '[DONE]' })
    })

    expect(hook.result.current.turns).toEqual([
      { inputTokens: 2, outputTokens: 4, exact: false },
    ])
  })

  it('sends the earlier turns with the next message', async () => {
    const hook = renderHook(() => useTryItChat({ model: 'glm-4-plus' }))
    await sendMessage(hook, 'one')
    act(() => {
      lastStream().emit('message', { data: content('first') })
      lastStream().emit('message', { data: '[DONE]' })
    })

    await sendMessage(hook, 'two')

    expect(JSON.parse(lastStream().options.payload).messages).toEqual([
      { role: 'user', content: 'one' },
      { role: 'assistant', content: 'first' },
      { role: 'user', content: 'two' },
    ])
  })

  it('does not carry an exchange that got no reply into the next message', async () => {
    const hook = renderHook(() => useTryItChat({ model: 'glm-4-plus' }))
    await sendMessage(hook, 'one')
    act(() => lastStream().emit('message', { data: '[DONE]' }))

    await sendMessage(hook, 'two')

    expect(JSON.parse(lastStream().options.payload).messages).toEqual([
      { role: 'user', content: 'two' },
    ])
  })

  it('takes a failed exchange back out and returns the text to the input', async () => {
    const hook = renderHook(() => useTryItChat({ model: 'glm-4-plus' }))
    await sendMessage(hook, 'Hello')

    act(() => {
      lastStream().emit('error', {
        data: JSON.stringify({
          error: {
            message: 'Balance too low',
            code: 'insufficient_user_quota',
          },
        }),
      })
    })

    expect(hook.result.current.messages).toEqual([])
    expect(hook.result.current.input).toBe('Hello')
    expect(hook.result.current.error).toEqual({
      message: 'Balance too low',
      code: 'insufficient_user_quota',
    })
    expect(hook.result.current.streaming).toBe(false)
    expect(hook.result.current.turns).toEqual([])
  })

  it('keeps a partial reply when the stream fails part-way', async () => {
    const hook = renderHook(() => useTryItChat({ model: 'glm-4-plus' }))
    await sendMessage(hook, 'Hello')

    act(() => {
      lastStream().emit('message', { data: content('Half an ans') })
      lastStream().emit('error', {
        data: JSON.stringify({ error: { message: 'Upstream dropped' } }),
      })
    })

    expect(hook.result.current.messages).toMatchObject([
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Half an ans' },
    ])
    expect(hook.result.current.error?.message).toBe('Upstream dropped')
    expect(hook.result.current.streaming).toBe(false)
  })

  it('stops a reply in progress and keeps what already arrived', async () => {
    const hook = renderHook(() => useTryItChat({ model: 'glm-4-plus' }))
    await sendMessage(hook, 'Hello')
    act(() => lastStream().emit('message', { data: content('Partial') }))

    act(() => hook.result.current.stop())

    expect(lastStream().closed).toBe(true)
    expect(hook.result.current.streaming).toBe(false)
    expect(hook.result.current.messages.at(-1)).toMatchObject({
      role: 'assistant',
      content: 'Partial',
    })
    expect(hook.result.current.turns).toHaveLength(1)
    expect(hook.result.current.turns[0].exact).toBe(false)
  })

  it('stopping before any reply arrives rolls the message back', async () => {
    const hook = renderHook(() => useTryItChat({ model: 'glm-4-plus' }))
    await sendMessage(hook, 'Hello')

    act(() => hook.result.current.stop())

    expect(hook.result.current.messages).toEqual([])
    expect(hook.result.current.input).toBe('Hello')
    expect(hook.result.current.turns).toEqual([])
  })

  it('ignores empty messages and a second send while a reply is streaming', async () => {
    const hook = renderHook(() => useTryItChat({ model: 'glm-4-plus' }))

    await sendMessage(hook, '   ')
    expect(streams.instances).toHaveLength(0)

    await sendMessage(hook, 'Hello')
    await sendMessage(hook, 'Again')

    expect(streams.instances).toHaveLength(1)
    expect(hook.result.current.input).toBe('Again')
  })

  it('sends the chosen temperature', async () => {
    const hook = renderHook(() => useTryItChat({ model: 'glm-4-plus' }))
    act(() => hook.result.current.setTemperature(0.2))

    await sendMessage(hook, 'Hello')

    expect(JSON.parse(lastStream().options.payload).temperature).toBe(0.2)
  })
})

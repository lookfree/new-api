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
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useAuthStore } from '@/stores/auth-store'

import { ModelQuickDialog } from '../components/model-quick-dialog'
import type { PricingModel } from '../types'

const streams = vi.hoisted(() => ({
  instances: [] as { options: { payload: string } }[],
}))

// The icon set ships ESM that Node cannot resolve; the dialog only needs the
// icon slot to render something.
vi.mock('@/lib/lobe-icon', () => ({ getLobeIcon: () => null }))

vi.mock('sse.js', () => ({
  SSE: class FakeSSE {
    options: { payload: string }
    readyState = 1

    constructor(_url: string, options: { payload: string }) {
      this.options = options
      streams.instances.push(this)
    }

    addEventListener() {}

    stream() {}

    close() {}
  },
}))

vi.mock('@/lib/api', () => ({
  getFreshAuthHeaders: async () => ({ Authorization: 'Bearer test-token' }),
}))

vi.mock('@/hooks/use-status', () => ({
  useStatus: () => ({
    status: {
      system_name: 'Test Site',
      server_address: 'https://api.example.test/',
      price: 7.3,
    },
  }),
}))

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    to,
    children,
    ...rest
  }: {
    to: string
    children?: React.ReactNode
  }) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
  useLocation: (options?: {
    select?: (location: { href: string }) => unknown
  }) => {
    const location = { href: '/marketplace' }
    return options?.select ? options.select(location) : location
  },
}))

const model: PricingModel = {
  id: 1,
  model_name: 'glm-4-plus',
  vendor_name: 'Zhipu AI',
  description: 'Flagship model for complex tasks.',
  tags: 'general,long-text',
  quota_type: 0,
  model_ratio: 1,
  completion_ratio: 3,
  enable_groups: ['default', 'vip'],
  group_ratio: { default: 1, vip: 0.5 },
  context_length: 128000,
  supported_endpoint_types: ['openai'],
}

const baseProps = {
  model,
  open: true,
  tokenUnit: 'M' as const,
  showRechargePrice: false,
  priceRate: 1,
  usdExchangeRate: 1,
  usableGroups: ['default', 'vip'],
  onOpenChange: vi.fn(),
  onOpenFullDetails: vi.fn(),
}

function messageBox() {
  return screen.getByRole('textbox', {
    name: 'Type a message to try this model…',
  })
}

describe('ModelQuickDialog', () => {
  beforeEach(() => {
    streams.instances.length = 0
    useAuthStore.getState().auth.reset()
  })

  afterEach(() => {
    useAuthStore.getState().auth.reset()
  })

  it('renders nothing without a model', () => {
    render(<ModelQuickDialog {...baseProps} model={null} />)

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('names the model, its vendor and its zone', () => {
    render(<ModelQuickDialog {...baseProps} zone='domestic' />)

    const dialog = screen.getByRole('dialog', { name: 'glm-4-plus' })
    expect(within(dialog).getByText('Zhipu AI')).toBeInTheDocument()
    expect(within(dialog).getByText('Domestic models')).toBeInTheDocument()
  })

  it('shows no zone for a model outside both zones', () => {
    render(<ModelQuickDialog {...baseProps} zone='other' />)

    expect(screen.queryByText('Domestic models')).not.toBeInTheDocument()
    expect(screen.queryByText('International models')).not.toBeInTheDocument()
  })

  it('describes the model with its own description', () => {
    render(<ModelQuickDialog {...baseProps} />)

    expect(
      screen.getByText('Flagship model for complex tasks.')
    ).toBeInTheDocument()
  })

  it('falls back to a generic sentence when the model has no description', () => {
    render(
      <ModelQuickDialog
        {...baseProps}
        model={{ ...model, description: '  ' }}
      />
    )

    expect(
      screen.getByText(/available through the OpenAI-compatible API/)
    ).toBeInTheDocument()
  })

  it('lists input, output and context in the price table, and leaves out the unknown max output', () => {
    render(<ModelQuickDialog {...baseProps} />)

    expect(screen.getByText('Input')).toBeInTheDocument()
    expect(screen.getByText('Output')).toBeInTheDocument()
    expect(screen.getByText('Context')).toBeInTheDocument()
    expect(screen.getByText('128K')).toBeInTheDocument()
    expect(screen.queryByText('Max output')).not.toBeInTheDocument()
  })

  it('adds the maximum output length when the model states one', () => {
    render(
      <ModelQuickDialog
        {...baseProps}
        model={{ ...model, max_output_tokens: 8192 }}
      />
    )

    expect(screen.getByText('Max output')).toBeInTheDocument()
    expect(screen.getByText('8,192')).toBeInTheDocument()
  })

  it('shows one price per request instead of token prices for a per-request model', () => {
    render(
      <ModelQuickDialog
        {...baseProps}
        model={{ ...model, quota_type: 1, model_price: 0.04 }}
      />
    )

    expect(screen.getByText('per request')).toBeInTheDocument()
    expect(screen.queryByText('Input')).not.toBeInTheDocument()
    expect(screen.queryByText('Output')).not.toBeInTheDocument()
  })

  it('points a tiered-price model to the full details instead of quoting one price', () => {
    render(
      <ModelQuickDialog
        {...baseProps}
        model={{
          ...model,
          billing_mode: 'tiered_expr',
          billing_expr: 'tier("base", p * 2 + c * 8)',
        }}
      />
    )

    expect(screen.getByText('Dynamic Pricing')).toBeInTheDocument()
    expect(
      screen.getByText('See the full details for tier prices.')
    ).toBeInTheDocument()
    expect(screen.queryByText('Input')).not.toBeInTheDocument()
  })

  it('lists the capability tags and the same tags as use cases', () => {
    render(<ModelQuickDialog {...baseProps} />)

    expect(screen.getByText('Capability tags')).toBeInTheDocument()
    expect(screen.getByText('Use cases:').closest('p')).toHaveTextContent(
      'Use cases: general, long-text'
    )
  })

  it('leaves the capability section out for a model without tags', () => {
    render(<ModelQuickDialog {...baseProps} model={{ ...model, tags: '' }} />)

    expect(screen.queryByText('Capability tags')).not.toBeInTheDocument()
    expect(screen.queryByText('Use cases:')).not.toBeInTheDocument()
  })

  it('names the site in the routing note', () => {
    render(<ModelQuickDialog {...baseProps} />)

    expect(
      screen.getByText(/routed through the Test Site gateway/)
    ).toBeInTheDocument()
  })

  it("gives a call example against the site's own address with the model name marked", () => {
    render(<ModelQuickDialog {...baseProps} />)

    expect(screen.getByRole('tab', { name: 'Python' })).toHaveAttribute(
      'aria-selected',
      'true'
    )
    expect(screen.getByRole('tab', { name: 'cURL' })).toBeInTheDocument()
    expect(
      screen.getByText(/base_url="https:\/\/api\.example\.test\/v1"/)
    ).toBeInTheDocument()
    expect(
      screen.getByText('glm-4-plus', { selector: 'code span' })
    ).toBeInTheDocument()
  })

  it('hands over to the full details from the header', async () => {
    render(<ModelQuickDialog {...baseProps} />)

    await userEvent.click(screen.getByRole('button', { name: 'Full details' }))

    expect(baseProps.onOpenFullDetails).toHaveBeenCalledWith(model)
  })

  it('reports a close request from the close button', async () => {
    render(<ModelQuickDialog {...baseProps} />)

    await userEvent.click(screen.getByRole('button', { name: 'Close' }))

    expect(baseProps.onOpenChange).toHaveBeenCalledWith(
      false,
      expect.anything()
    )
  })

  describe('for a model that cannot chat', () => {
    const imageModel: PricingModel = {
      ...model,
      supported_endpoint_types: ['image-generation'],
    }

    it('replaces the chat call example and the try panel with a pointer to the full details', async () => {
      render(<ModelQuickDialog {...baseProps} model={imageModel} />)

      expect(screen.queryByRole('tablist')).not.toBeInTheDocument()
      expect(screen.queryByRole('log')).not.toBeInTheDocument()
      expect(screen.getByText(/is not a chat model/)).toBeInTheDocument()

      const [, noteButton] = screen.getAllByRole('button', {
        name: 'Full details',
      })
      await userEvent.click(noteButton)
      expect(baseProps.onOpenFullDetails).toHaveBeenCalledWith(imageModel)
    })

    it('still shows the price table', () => {
      render(<ModelQuickDialog {...baseProps} model={imageModel} />)

      expect(screen.getByText('Price table')).toBeInTheDocument()
      expect(screen.getByText('Input')).toBeInTheDocument()
    })
  })

  describe('the try panel', () => {
    it('is part of the dialog, locked to the model', () => {
      render(<ModelQuickDialog {...baseProps} />)

      const panel = screen.getByRole('heading', { name: 'Try it out' })
      expect(panel).toBeInTheDocument()
      expect(screen.getByTitle('Locked to this model')).toHaveTextContent(
        'glm-4-plus'
      )
    })

    it("bills the viewer's own group when the model is enabled for it", async () => {
      useAuthStore
        .getState()
        .auth.setUser({ id: 1, username: 'tester', role: 1, group: 'vip' })
      render(<ModelQuickDialog {...baseProps} />)

      await userEvent.type(messageBox(), 'Hello')
      await userEvent.click(screen.getByRole('button', { name: 'Send' }))

      await waitFor(() => expect(streams.instances).toHaveLength(1))
      expect(JSON.parse(streams.instances[0].options.payload).group).toBe('vip')
    })

    it('bills the first usable group when the viewer only has access through another one', async () => {
      useAuthStore
        .getState()
        .auth.setUser({ id: 1, username: 'tester', role: 1, group: 'staff' })
      render(<ModelQuickDialog {...baseProps} />)

      await userEvent.type(messageBox(), 'Hello')
      await userEvent.click(screen.getByRole('button', { name: 'Send' }))

      await waitFor(() => expect(streams.instances).toHaveLength(1))
      expect(JSON.parse(streams.instances[0].options.payload).group).toBe(
        'default'
      )
    })

    it('takes focus and scrolls into view when the dialog opens from the Try button', async () => {
      const scrollIntoView = vi.spyOn(HTMLElement.prototype, 'scrollIntoView')
      render(<ModelQuickDialog {...baseProps} focusTry />)

      await waitFor(() => expect(messageBox()).toHaveFocus())
      await waitFor(() => expect(scrollIntoView).toHaveBeenCalled())
    })

    it('leaves the message box unfocused when the dialog opens from the card', async () => {
      render(<ModelQuickDialog {...baseProps} />)

      const dialog = screen.getByRole('dialog', { name: 'glm-4-plus' })
      await waitFor(() =>
        expect(dialog).toContainElement(document.activeElement as HTMLElement)
      )
      expect(messageBox()).not.toHaveFocus()
    })

    it('moves focus in without scrolling the overlay away from the header', async () => {
      const focus = vi.spyOn(HTMLElement.prototype, 'focus')
      render(<ModelQuickDialog {...baseProps} />)

      await waitFor(() =>
        expect(focus).toHaveBeenCalledWith({ preventScroll: true })
      )
    })
  })
})

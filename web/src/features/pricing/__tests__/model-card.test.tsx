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
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { ModelCard } from '../components/model-card'
import type { PricingModel } from '../types'

// The icon set ships ESM that Node cannot resolve; the card only needs the
// icon slot to render something.
vi.mock('@/lib/lobe-icon', () => ({ getLobeIcon: () => null }))

const tokenModel: PricingModel = {
  id: 1,
  model_name: 'glm-4-plus',
  vendor_name: 'Zhipu AI',
  quota_type: 0,
  model_ratio: 1,
  completion_ratio: 3,
  enable_groups: ['default'],
  tags: 'general,long-text',
  context_length: 128000,
}

describe('ModelCard', () => {
  it('shows context window, input and output price for a token-billed model', () => {
    render(<ModelCard model={tokenModel} onClick={vi.fn()} />)

    expect(screen.getByText('glm-4-plus')).toBeInTheDocument()
    expect(screen.getByText('Zhipu AI')).toBeInTheDocument()
    expect(screen.getByText('Context')).toBeInTheDocument()
    expect(screen.getByText('128K')).toBeInTheDocument()
    expect(screen.getByText('Input')).toBeInTheDocument()
    expect(screen.getByText('Output')).toBeInTheDocument()
    expect(screen.getByText('/ 1M tokens')).toBeInTheDocument()
  })

  it('writes a million-token window as 1M rather than 1000K', () => {
    render(
      <ModelCard
        model={{ ...tokenModel, context_length: 1_000_000 }}
        onClick={vi.fn()}
      />
    )

    expect(screen.getByText('1M')).toBeInTheDocument()
  })

  it('leaves the context cell out when the window is unknown', () => {
    render(
      <ModelCard
        model={{ ...tokenModel, context_length: undefined }}
        onClick={vi.fn()}
      />
    )

    expect(screen.queryByText('Context')).not.toBeInTheDocument()
    expect(screen.getByText('Input')).toBeInTheDocument()
    expect(screen.getByText('Output')).toBeInTheDocument()
  })

  it('quotes the 1K unit when the token unit is K', () => {
    render(<ModelCard model={tokenModel} onClick={vi.fn()} tokenUnit='K' />)

    expect(screen.getByText('/ 1K tokens')).toBeInTheDocument()
  })

  it('shows one price per request, and no per-million note, for a per-request model', () => {
    render(
      <ModelCard
        model={{
          ...tokenModel,
          quota_type: 1,
          model_price: 0.05,
          context_length: undefined,
        }}
        onClick={vi.fn()}
      />
    )

    expect(screen.getByText(/request/)).toBeInTheDocument()
    expect(screen.queryByText('/ 1M tokens')).not.toBeInTheDocument()
  })

  it('opens the details once whether the card or its Try button is clicked', async () => {
    const onClick = vi.fn()
    render(<ModelCard model={tokenModel} onClick={onClick} />)

    await userEvent.click(screen.getByText('glm-4-plus'))
    expect(onClick).toHaveBeenCalledTimes(1)

    await userEvent.click(screen.getByRole('button', { name: /Try/ }))
    expect(onClick).toHaveBeenCalledTimes(2)
  })

  it('sends the Try button to its own handler, leaving the card click alone', async () => {
    const onClick = vi.fn()
    const onTry = vi.fn()
    render(<ModelCard model={tokenModel} onClick={onClick} onTry={onTry} />)

    await userEvent.click(screen.getByRole('button', { name: /Try/ }))

    expect(onTry).toHaveBeenCalledTimes(1)
    expect(onClick).not.toHaveBeenCalled()
  })

  it('keeps the card itself on the plain open handler when a Try handler exists', async () => {
    const onClick = vi.fn()
    const onTry = vi.fn()
    render(<ModelCard model={tokenModel} onClick={onClick} onTry={onTry} />)

    await userEvent.click(screen.getByText('glm-4-plus'))

    expect(onClick).toHaveBeenCalledTimes(1)
    expect(onTry).not.toHaveBeenCalled()
  })
})

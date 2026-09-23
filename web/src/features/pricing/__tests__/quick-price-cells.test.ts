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
import { describe, expect, it } from 'vitest'

import { buildModelCallSamples } from '../lib/call-samples'
import { buildQuickPriceCells } from '../lib/quick-price-cells'
import type { PricingModel } from '../types'

const options = {
  tokenUnit: 'M' as const,
  showRechargePrice: false,
  priceRate: 1,
  usdExchangeRate: 1,
}

const tokenModel: PricingModel = {
  id: 1,
  model_name: 'glm-4-plus',
  quota_type: 0,
  model_ratio: 1,
  completion_ratio: 3,
  enable_groups: ['default'],
  context_length: 128000,
  max_output_tokens: 8192,
}

const kinds = (model: PricingModel) =>
  buildQuickPriceCells(model, options).map((cell) => cell.kind)

describe('buildQuickPriceCells', () => {
  it('lists input, output, context and max output for a token-billed model', () => {
    const cells = buildQuickPriceCells(tokenModel, options)

    expect(cells.map((cell) => cell.kind)).toEqual([
      'input',
      'output',
      'context',
      'maxOutput',
    ])
    expect(cells.find((cell) => cell.kind === 'context')).toEqual({
      kind: 'context',
      value: '128K',
    })
    expect(cells.find((cell) => cell.kind === 'maxOutput')).toEqual({
      kind: 'maxOutput',
      value: '8,192',
    })
  })

  it('adds the cached-input price when the model has one', () => {
    expect(kinds({ ...tokenModel, cache_ratio: 0.1 })).toEqual([
      'input',
      'output',
      'cache',
      'context',
      'maxOutput',
    ])
  })

  it('leaves out the cells whose data the catalog does not have', () => {
    expect(
      kinds({
        ...tokenModel,
        context_length: undefined,
        max_output_tokens: 0,
      })
    ).toEqual(['input', 'output'])
  })

  it('shows one price per request for a per-request model', () => {
    const cells = buildQuickPriceCells(
      { ...tokenModel, quota_type: 1, model_price: 0.05 },
      options
    )

    expect(cells[0]).toEqual({ kind: 'requestPrice', value: '$0.05' })
  })

  it('shows a caption instead of one number for tiered pricing', () => {
    expect(
      kinds({
        ...tokenModel,
        billing_mode: 'tiered_expr',
        billing_expr: 'tier("base", p * 2)',
      })[0]
    ).toBe('dynamic')
  })

  it('shows a caption for usage-based billing with no price configured', () => {
    expect(
      kinds({
        ...tokenModel,
        quota_type: 0,
        billing_mode: 'tiered_expr',
        billing_usage_schema: { seconds: { type: 'number', unit: 'second' } },
      })[0]
    ).toBe('usage')
  })
})

describe('buildModelCallSamples', () => {
  it('points both samples at this deployment and this model', () => {
    const samples = buildModelCallSamples(
      'https://api.example.com',
      'glm-4-plus'
    )

    expect(samples.map((sample) => sample.label)).toEqual(['Python', 'cURL'])
    for (const sample of samples) {
      expect(sample.code).toContain('https://api.example.com/v1')
      expect(sample.code).toContain('glm-4-plus')
    }
  })
})

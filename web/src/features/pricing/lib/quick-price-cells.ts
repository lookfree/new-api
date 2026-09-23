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
import { formatContextLength } from '@/features/home/lib/format'

import { QUOTA_TYPE_VALUES } from '../constants'
import type { PricingModel, TokenUnit } from '../types'
import {
  isDynamicPricingModel,
  isUnconfiguredTaskUsageModel,
} from './dynamic-price'
import { isTokenBasedModel } from './model-helpers'
import { formatPrice, formatRequestPrice } from './price'

/**
 * One cell of the price table in the model dialog. `value` is already
 * formatted; labels and unit captions are the component's job because they are
 * translated.
 */
export type QuickPriceCell =
  | { kind: 'input' | 'output' | 'cache'; value: string }
  | { kind: 'requestPrice'; value: string }
  | { kind: 'dynamic' | 'usage' }
  | { kind: 'context' | 'maxOutput'; value: string }

export type QuickPriceOptions = {
  tokenUnit: TokenUnit
  showRechargePrice: boolean
  priceRate: number
  usdExchangeRate: number
  selectedGroup?: string
}

const COUNT_FORMAT = new Intl.NumberFormat('en-US')

function isKnown(value: number | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
}

/**
 * The price table of the model dialog: unit prices when the model has a single
 * price per token or request, a caption when its billing is tiered or
 * usage-based (the full details show the tiers), then the context window and
 * output limit whenever the catalog knows them.
 */
export function buildQuickPriceCells(
  model: PricingModel,
  options: QuickPriceOptions
): QuickPriceCell[] {
  const cells: QuickPriceCell[] = []

  if (isDynamicPricingModel(model)) {
    cells.push({ kind: 'dynamic' })
  } else if (isUnconfiguredTaskUsageModel(model)) {
    cells.push({ kind: 'usage' })
  } else if (model.quota_type === QUOTA_TYPE_VALUES.REQUEST) {
    cells.push({
      kind: 'requestPrice',
      value: formatRequestPrice(
        model,
        options.showRechargePrice,
        options.priceRate,
        options.usdExchangeRate,
        options.selectedGroup
      ),
    })
  } else if (isTokenBasedModel(model)) {
    const price = (type: 'input' | 'output' | 'cache') =>
      formatPrice(
        model,
        type,
        options.tokenUnit,
        options.showRechargePrice,
        options.priceRate,
        options.usdExchangeRate,
        options.selectedGroup
      )
    cells.push(
      { kind: 'input', value: price('input') },
      { kind: 'output', value: price('output') }
    )
    if (model.cache_ratio != null) {
      cells.push({ kind: 'cache', value: price('cache') })
    }
  }

  if (isKnown(model.context_length)) {
    cells.push({
      kind: 'context',
      value: formatContextLength(model.context_length),
    })
  }
  if (isKnown(model.max_output_tokens)) {
    cells.push({
      kind: 'maxOutput',
      value: COUNT_FORMAT.format(model.max_output_tokens),
    })
  }

  return cells
}

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
import { describe, expect, test } from 'vitest'

import { PAYMENT_TYPES } from '../constants'
import {
  buildPayOptions,
  getPayMethodLabel,
  getPaymentCurrencySymbol,
} from '../lib/pay-options'
import type { TopupInfo } from '../types'

const base: TopupInfo = {
  enable_online_topup: false,
  enable_stripe_topup: false,
  pay_methods: [],
  min_topup: 5,
  stripe_min_topup: 0,
  amount_options: [],
  discount: {},
}

describe('buildPayOptions', () => {
  test('lists nothing while the top-up info has not loaded', () => {
    expect(buildPayOptions(null)).toEqual([])
  })

  test('lists nothing when no gateway is open (payment compliance not confirmed)', () => {
    expect(buildPayOptions(base)).toEqual([])
  })

  test('offers Airwallex as one option that accepts the general minimum', () => {
    const options = buildPayOptions({
      ...base,
      enable_airwallex_topup: true,
      pay_methods: [
        { name: 'Airwallex', type: PAYMENT_TYPES.AIRWALLEX, min_topup: 0 },
      ],
    })

    expect(options).toHaveLength(1)
    expect(options[0]).toMatchObject({
      key: 'pay:airwallex',
      waffoIndex: null,
      minTopup: 5,
    })
  })

  test('takes the higher of a method minimum and the general minimum', () => {
    const [option] = buildPayOptions({
      ...base,
      enable_online_topup: true,
      pay_methods: [{ name: 'Alipay', type: 'alipay', min_topup: 20 }],
    })

    expect(option.minTopup).toBe(20)
  })

  test('adds each Waffo method with its own index after the standard ones', () => {
    const options = buildPayOptions({
      ...base,
      enable_online_topup: true,
      enable_waffo_topup: true,
      waffo_min_topup: 10,
      pay_methods: [{ name: 'Alipay', type: 'alipay', min_topup: 0 }],
      waffo_pay_methods: [{ name: 'Card A' }, { name: 'Card B' }],
    })

    expect(options.map((option) => option.key)).toEqual([
      'pay:alipay',
      'waffo:0',
      'waffo:1',
    ])
    expect(options[2]).toMatchObject({
      waffoIndex: 1,
      minTopup: 10,
      method: { name: 'Card B', type: PAYMENT_TYPES.WAFFO },
    })
  })

  test('ignores Waffo methods while Waffo is switched off', () => {
    const options = buildPayOptions({
      ...base,
      enable_waffo_topup: false,
      waffo_pay_methods: [{ name: 'Card A' }],
    })

    expect(options).toEqual([])
  })
})

describe('getPayMethodLabel', () => {
  const t = (key: string) => `t(${key})`

  test('shows the customer-facing channels for Airwallex, not the provider name', () => {
    expect(
      getPayMethodLabel({ name: 'Airwallex', type: PAYMENT_TYPES.AIRWALLEX }, t)
    ).toBe('t(Alipay, WeChat Pay & bank card)')
  })

  test('keeps the configured name for every other method', () => {
    expect(getPayMethodLabel({ name: 'Alipay', type: 'alipay' }, t)).toBe(
      'Alipay'
    )
  })
})

describe('getPaymentCurrencySymbol', () => {
  test.each([
    [PAYMENT_TYPES.AIRWALLEX, '¥'],
    ['alipay', '¥'],
    [PAYMENT_TYPES.STRIPE, '$'],
    [PAYMENT_TYPES.WAFFO, '$'],
  ])('quotes %s in %s', (type, symbol) => {
    expect(getPaymentCurrencySymbol(type)).toBe(symbol)
  })
})

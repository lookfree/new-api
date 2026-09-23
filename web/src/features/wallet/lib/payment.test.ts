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
import type { TopupInfo } from '../types'
import {
  dispatchSelectedPayment,
  generatePresetAmounts,
  getDefaultPaymentType,
  getInitialTopupAmount,
  getMinTopupAmount,
  isAirwallexPayment,
  isStripePayment,
  isWaffoPayment,
  isWaffoPancakePayment,
} from './payment'

describe('payment type classification', () => {
  test('keeps Waffo and Waffo Pancake on their dedicated flows', () => {
    expect(isWaffoPayment(PAYMENT_TYPES.WAFFO)).toBe(true)
    expect(isWaffoPayment(PAYMENT_TYPES.WAFFO_PANCAKE)).toBe(false)
    expect(isWaffoPancakePayment(PAYMENT_TYPES.WAFFO_PANCAKE)).toBe(true)
    expect(isWaffoPancakePayment(PAYMENT_TYPES.WAFFO)).toBe(false)
    expect(isStripePayment(PAYMENT_TYPES.STRIPE)).toBe(true)
  })
})

describe('payment dispatch', () => {
  test('keeps the selected Waffo method index through confirmation', async () => {
    const calls: string[] = []
    const success = await dispatchSelectedPayment(
      { name: 'Waffo Card', type: PAYMENT_TYPES.WAFFO },
      120,
      3,
      {
        regular: async () => {
          calls.push('regular')
          return false
        },
        waffo: async (amount, index) => {
          calls.push(`waffo:${amount}:${index}`)
          return true
        },
        waffoPancake: async () => {
          calls.push('pancake')
          return false
        },
        airwallex: async () => {
          calls.push('airwallex')
          return false
        },
      }
    )

    expect(success).toBe(true)
    expect(calls).toEqual(['waffo:120:3'])
  })

  test('does not create a Waffo order without a selected method index', async () => {
    let called = false
    const success = await dispatchSelectedPayment(
      { name: 'Waffo Card', type: PAYMENT_TYPES.WAFFO },
      120,
      null,
      {
        regular: async () => false,
        waffo: async () => {
          called = true
          return true
        },
        waffoPancake: async () => false,
        airwallex: async () => false,
      }
    )

    expect(success).toBe(false)
    expect(called).toBe(false)
  })

  test('sends Airwallex through its own processor, not the generic form flow', async () => {
    const calls: string[] = []
    const success = await dispatchSelectedPayment(
      { name: 'Airwallex', type: PAYMENT_TYPES.AIRWALLEX },
      50,
      null,
      {
        regular: async () => {
          calls.push('regular')
          return false
        },
        waffo: async () => false,
        waffoPancake: async () => false,
        airwallex: async (amount) => {
          calls.push(`airwallex:${amount}`)
          return true
        },
      }
    )

    expect(success).toBe(true)
    expect(calls).toEqual(['airwallex:50'])
  })
})

describe('Airwallex availability', () => {
  const base: TopupInfo = {
    enable_online_topup: false,
    enable_stripe_topup: false,
    pay_methods: [],
    min_topup: 5,
    stripe_min_topup: 0,
    amount_options: [],
    discount: {},
  }

  test('recognises the Airwallex payment type', () => {
    expect(isAirwallexPayment(PAYMENT_TYPES.AIRWALLEX)).toBe(true)
    expect(isAirwallexPayment(PAYMENT_TYPES.STRIPE)).toBe(false)
  })

  test('uses the general minimum when Airwallex is the only enabled gateway', () => {
    const info = { ...base, enable_airwallex_topup: true }

    expect(getMinTopupAmount(info)).toBe(5)
    expect(getDefaultPaymentType(info)).toBe(PAYMENT_TYPES.AIRWALLEX)
  })

  test('prefers the first listed method when several are enabled', () => {
    const info: TopupInfo = {
      ...base,
      enable_airwallex_topup: true,
      pay_methods: [{ name: 'Airwallex', type: PAYMENT_TYPES.AIRWALLEX }],
    }

    expect(getDefaultPaymentType(info)).toBe(PAYMENT_TYPES.AIRWALLEX)
  })
})

describe('preset amounts', () => {
  test('offers the prototype defaults when none are configured', () => {
    expect(generatePresetAmounts(1).map((preset) => preset.value)).toEqual([
      10, 50, 100, 200,
    ])
  })

  test('drops defaults below the minimum top-up', () => {
    expect(generatePresetAmounts(50).map((preset) => preset.value)).toEqual([
      50, 100, 200,
    ])
  })

  test('opens on the default preset when it is on offer', () => {
    expect(
      getInitialTopupAmount([{ value: 10 }, { value: 50 }, { value: 100 }], 1)
    ).toBe(50)
  })

  test('opens on the smallest eligible preset when the default is not on offer', () => {
    expect(
      getInitialTopupAmount([{ value: 20 }, { value: 100 }, { value: 30 }], 25)
    ).toBe(30)
  })

  test('opens on the minimum when no preset reaches it', () => {
    expect(getInitialTopupAmount([{ value: 5 }], 20)).toBe(20)
  })
})

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
import { describe, expect, test, vi } from 'vitest'

import {
  AIRWALLEX_CHECKOUT_METHODS,
  buildAirwallexCheckoutOptions,
  buildAirwallexSuccessUrl,
  getAirwallexLocale,
  openAirwallexCheckout,
} from '../lib/airwallex'
import type { AirwallexIntent } from '../types'

const intent: AirwallexIntent = {
  intent_id: 'int_123',
  client_secret: 'cs_secret',
  currency: 'CNY',
}

describe('getAirwallexLocale', () => {
  test.each([
    ['zhCN', 'zh'],
    ['zh-CN', 'zh'],
    ['zh', 'zh'],
    ['en', 'en'],
    ['fr', 'en'],
    [undefined, 'en'],
  ])('maps UI language %s to the %s payment page', (language, expected) => {
    expect(getAirwallexLocale(language)).toBe(expected)
  })
})

describe('buildAirwallexSuccessUrl', () => {
  test('returns to the wallet with the success marker on an HTTPS origin', () => {
    expect(buildAirwallexSuccessUrl('https://zetone.ai')).toBe(
      'https://zetone.ai/wallet?airwallex=success'
    )
  })

  test('omits the URL on a plain-HTTP origin, which the SDK would reject', () => {
    expect(buildAirwallexSuccessUrl('http://47.239.15.54:3300')).toBeUndefined()
    expect(buildAirwallexSuccessUrl('http://localhost:5188')).toBeUndefined()
  })
})

describe('buildAirwallexCheckoutOptions', () => {
  test('opens the intent in CNY for mainland shoppers, limited to card, Alipay and WeChat Pay', () => {
    const options = buildAirwallexCheckoutOptions(intent, {
      origin: 'https://zetone.ai',
      language: 'zhCN',
    })

    expect(options).toEqual({
      env: 'prod',
      mode: 'payment',
      intent_id: 'int_123',
      client_secret: 'cs_secret',
      currency: 'CNY',
      country_code: 'CN',
      locale: 'zh',
      methods: ['card', 'alipaycn', 'wechatpay'],
      successUrl: 'https://zetone.ai/wallet?airwallex=success',
    })
  })

  test('hands the SDK its own copy of the method list so it cannot alter the shared one', () => {
    const options = buildAirwallexCheckoutOptions(intent, {
      origin: 'https://zetone.ai',
      language: 'en',
    })

    expect(options.methods).not.toBe(AIRWALLEX_CHECKOUT_METHODS)
  })
})

describe('openAirwallexCheckout', () => {
  test('initialises the payments module for prod and redirects to the checkout', async () => {
    const redirectToCheckout = vi.fn()
    const init = vi.fn().mockResolvedValue({ payments: { redirectToCheckout } })

    await openAirwallexCheckout(
      intent,
      { origin: 'https://zetone.ai', language: 'en' },
      async () => ({ init })
    )

    expect(init).toHaveBeenCalledWith({
      env: 'prod',
      enabledElements: ['payments'],
      locale: 'en',
    })
    expect(redirectToCheckout).toHaveBeenCalledTimes(1)
    expect(redirectToCheckout).toHaveBeenCalledWith(
      expect.objectContaining({
        intent_id: 'int_123',
        client_secret: 'cs_secret',
        currency: 'CNY',
      })
    )
  })

  test('fails instead of redirecting when the SDK did not load the payments module', async () => {
    const init = vi.fn().mockResolvedValue({})

    await expect(
      openAirwallexCheckout(
        intent,
        { origin: 'https://zetone.ai', language: 'en' },
        async () => ({ init })
      )
    ).rejects.toThrow('unavailable')
  })

  test('propagates an SDK load failure so the caller can tell the customer', async () => {
    await expect(
      openAirwallexCheckout(
        intent,
        { origin: 'https://zetone.ai', language: 'en' },
        async () => {
          throw new Error('network down')
        }
      )
    ).rejects.toThrow('network down')
  })
})

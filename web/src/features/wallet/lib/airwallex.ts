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
import type { InitResult } from '@airwallex/components-sdk'

import type { AirwallexIntent } from '../types'

// ============================================================================
// Airwallex hosted checkout
// ============================================================================

type AirwallexPayments = NonNullable<InitResult['payments']>

/** Options of the SDK's hosted-payment-page redirect, as typed by the SDK. */
export type AirwallexCheckoutOptions = Parameters<
  AirwallexPayments['redirectToCheckout']
>[0]

type AirwallexSdk = {
  init: (options: {
    env: 'prod'
    enabledElements: ['payments']
    locale: 'zh' | 'en'
  }) => Promise<InitResult>
}

/** Query parameter Airwallex's success redirect lands on the wallet with. */
export const AIRWALLEX_RETURN_PARAM = 'airwallex'
export const AIRWALLEX_RETURN_SUCCESS = 'success'

/**
 * The three ways the customer asked to pay: bank card, Alipay and WeChat Pay.
 * Anything else enabled on the merchant account stays off the payment page.
 */
export const AIRWALLEX_CHECKOUT_METHODS: NonNullable<
  AirwallexCheckoutOptions['methods']
> = ['card', 'alipaycn', 'wechatpay']

/** Zetone's customers are mainland users, who pay through CN channels. */
const AIRWALLEX_COUNTRY_CODE = 'CN'

/** The payment page is shown in Chinese for Chinese UI languages, else English. */
export function getAirwallexLocale(language: string | undefined): 'zh' | 'en' {
  return language?.toLowerCase().startsWith('zh') ? 'zh' : 'en'
}

/**
 * Where Airwallex sends the customer after a successful payment. The SDK only
 * accepts an HTTPS URL, so on a plain-HTTP origin (local development, or a
 * server without a certificate yet) no return URL is passed and the customer
 * stays on Airwallex's confirmation page.
 */
export function buildAirwallexSuccessUrl(origin: string): string | undefined {
  if (!origin.startsWith('https://')) return undefined
  return `${origin}/wallet?${AIRWALLEX_RETURN_PARAM}=${AIRWALLEX_RETURN_SUCCESS}`
}

export function buildAirwallexCheckoutOptions(
  intent: AirwallexIntent,
  context: { origin: string; language: string }
): AirwallexCheckoutOptions {
  return {
    env: 'prod',
    mode: 'payment',
    intent_id: intent.intent_id,
    client_secret: intent.client_secret,
    currency: intent.currency,
    country_code: AIRWALLEX_COUNTRY_CODE,
    locale: getAirwallexLocale(context.language),
    methods: [...AIRWALLEX_CHECKOUT_METHODS],
    successUrl: buildAirwallexSuccessUrl(context.origin),
  }
}

/**
 * Send the browser to Airwallex's hosted checkout for an existing PaymentIntent.
 * The SDK is loaded on demand so it stays out of the wallet's initial bundle;
 * `loadSdk` is the seam that lets tests stand in for it.
 */
export async function openAirwallexCheckout(
  intent: AirwallexIntent,
  context: { origin: string; language: string },
  loadSdk: () => Promise<AirwallexSdk> = () =>
    import('@airwallex/components-sdk')
): Promise<void> {
  const sdk = await loadSdk()
  const { payments } = await sdk.init({
    env: 'prod',
    enabledElements: ['payments'],
    locale: getAirwallexLocale(context.language),
  })
  if (!payments) {
    throw new Error('Airwallex payments module is unavailable')
  }
  payments.redirectToCheckout(buildAirwallexCheckoutOptions(intent, context))
}

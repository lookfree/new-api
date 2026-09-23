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
import { PAYMENT_TYPES } from '../constants'
import type { PaymentMethod, TopupInfo } from '../types'
import { getMinTopupAmount } from './payment'

// ============================================================================
// Pay options: every way the customer can pay, as one flat list
// ============================================================================

export interface PayOption {
  /** Stable key for selection state and React lists */
  key: string
  method: PaymentMethod
  /** Index into the Waffo method list, for Waffo options only */
  waffoIndex: number | null
  /** Smallest top-up this option accepts */
  minTopup: number
}

/**
 * Flatten the standard gateways (epay, Stripe, Airwallex, ...) and the
 * individual Waffo methods into the list the recharge card chooses from.
 */
export function buildPayOptions(topupInfo: TopupInfo | null): PayOption[] {
  if (!topupInfo) return []

  const generalMin = getMinTopupAmount(topupInfo)
  const standard: PayOption[] = (topupInfo.pay_methods ?? []).map((method) => ({
    key: `pay:${method.type}`,
    method,
    waffoIndex: null,
    minTopup: Math.max(method.min_topup || 0, generalMin),
  }))

  if (!topupInfo.enable_waffo_topup) return standard

  const waffo: PayOption[] = (topupInfo.waffo_pay_methods ?? []).map(
    (method, index) => ({
      key: `waffo:${index}`,
      method: {
        name: method.name,
        type: PAYMENT_TYPES.WAFFO,
        icon: method.icon,
      },
      waffoIndex: index,
      minTopup: topupInfo.waffo_min_topup || 0,
    })
  )
  return [...standard, ...waffo]
}

/**
 * Name shown for a payment method. Airwallex's hosted page offers bank card,
 * Alipay and WeChat Pay, which is what customers look for, not the provider's
 * name.
 */
export function getPayMethodLabel(
  method: PaymentMethod,
  t: (key: string) => string
): string {
  if (method.type === PAYMENT_TYPES.AIRWALLEX) {
    return t('Alipay, WeChat Pay & bank card')
  }
  return method.name
}

/**
 * Currency symbol the amount to pay is quoted in. Alipay, WeChat Pay,
 * Airwallex and epay charge in yuan; the global card gateways charge in USD.
 */
export function getPaymentCurrencySymbol(paymentType: string): string {
  switch (paymentType) {
    case PAYMENT_TYPES.STRIPE:
    case PAYMENT_TYPES.CREEM:
    case PAYMENT_TYPES.WAFFO:
    case PAYMENT_TYPES.WAFFO_PANCAKE:
      return '$'
    default:
      return '¥'
  }
}

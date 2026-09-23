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
import i18next from 'i18next'
import { useState, useCallback } from 'react'
import { toast } from 'sonner'

import { requestAirwallexPayment, isApiSuccess } from '../api'
import { openAirwallexCheckout } from '../lib/airwallex'

// ============================================================================
// Airwallex Payment Hook
// ============================================================================

export function useAirwallexPayment() {
  const [processing, setProcessing] = useState(false)

  /**
   * Create the pending top-up and its PaymentIntent, then hand the browser to
   * Airwallex's hosted checkout. Resolves true once the redirect has started;
   * the balance is credited later, by Airwallex's webhook.
   */
  const processAirwallexPayment = useCallback(
    async (topupAmount: number): Promise<boolean> => {
      try {
        setProcessing(true)

        const response = await requestAirwallexPayment({
          amount: Math.floor(topupAmount),
        })
        const intent = response.data

        if (
          !isApiSuccess(response) ||
          typeof intent !== 'object' ||
          !intent?.intent_id ||
          !intent.client_secret
        ) {
          // A failed request carries its reason as a plain string in `data`.
          toast.error(
            typeof intent === 'string' && intent
              ? intent
              : i18next.t('Payment request failed')
          )
          return false
        }

        await openAirwallexCheckout(intent, {
          origin: window.location.origin,
          language: i18next.language,
        })
        toast.success(i18next.t('Redirecting to payment page...'))
        return true
      } catch {
        toast.error(i18next.t('Payment request failed'))
        return false
      } finally {
        setProcessing(false)
      }
    },
    []
  )

  return { processing, processAirwallexPayment }
}

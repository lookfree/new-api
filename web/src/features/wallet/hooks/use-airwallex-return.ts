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
import { useQueryClient } from '@tanstack/react-query'
import i18next from 'i18next'
import { useEffect } from 'react'
import { toast } from 'sonner'

import { SELF_QUERY_KEY } from '@/hooks/use-self'

import { WALLET_TRANSACTIONS_QUERY_KEY } from '../constants'
import { pollForCredit } from '../lib/airwallex-return'

// ============================================================================
// Airwallex Return Hook
// ============================================================================

const NOTICE_DELAY_MS = 300

/**
 * When the customer lands back on the wallet from Airwallex's hosted checkout,
 * tell them the payment is being confirmed and keep the balance and the
 * transaction list fresh until the webhook has credited it.
 */
export function useAirwallexReturn(returned: boolean) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!returned) return

    let cancelled = false
    // The Toaster mounts after the page, so a toast fired straight from this
    // mount effect would be dropped.
    const noticeTimer = setTimeout(() => {
      toast.info(
        i18next.t(
          'Payment submitted. Your balance updates once the payment is confirmed.'
        )
      )
    }, NOTICE_DELAY_MS)

    void pollForCredit({
      refresh: async () => {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: SELF_QUERY_KEY }),
          queryClient.invalidateQueries({
            queryKey: WALLET_TRANSACTIONS_QUERY_KEY,
          }),
        ])
      },
      readQuota: () =>
        queryClient.getQueryData<{ data?: { quota?: number } }>(SELF_QUERY_KEY)
          ?.data?.quota,
      wait: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
      isCancelled: () => cancelled,
    }).then((outcome) => {
      if (outcome === 'credited') {
        toast.success(
          i18next.t('Payment received, your balance has been updated')
        )
      }
    })

    return () => {
      cancelled = true
      clearTimeout(noticeTimer)
    }
  }, [returned, queryClient])
}

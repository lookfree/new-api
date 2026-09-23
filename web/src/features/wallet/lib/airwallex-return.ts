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
// ============================================================================
// After Airwallex's hosted checkout
// ============================================================================

/** How often to look again for the credit, and for how many looks. */
export const RETURN_POLL_INTERVAL_MS = 3_000
export const RETURN_POLL_ATTEMPTS = 10

export type ReturnPollOutcome = 'credited' | 'timeout' | 'cancelled'

/**
 * Airwallex confirms a payment to the server by webhook, not to the browser,
 * so the balance moves a moment after the customer lands back on the wallet.
 * Refresh the balance every few seconds until it rises above where it was
 * when the customer came back, or the attempts run out.
 *
 * If the balance was not known yet when the customer arrived, the first value
 * read becomes the baseline: an increase already applied by then simply goes
 * undetected and the poll runs to its end, which is harmless.
 */
export async function pollForCredit(options: {
  refresh: () => Promise<void>
  readQuota: () => number | undefined
  wait: (ms: number) => Promise<void>
  isCancelled: () => boolean
  attempts?: number
  intervalMs?: number
}): Promise<ReturnPollOutcome> {
  const attempts = options.attempts ?? RETURN_POLL_ATTEMPTS
  const intervalMs = options.intervalMs ?? RETURN_POLL_INTERVAL_MS
  let baseline = options.readQuota()

  for (let attempt = 0; attempt < attempts; attempt++) {
    await options.refresh()
    if (options.isCancelled()) return 'cancelled'

    const quota = options.readQuota()
    if (baseline === undefined) {
      baseline = quota
    } else if (quota !== undefined && quota > baseline) {
      return 'credited'
    }

    await options.wait(intervalMs)
    if (options.isCancelled()) return 'cancelled'
  }
  return 'timeout'
}

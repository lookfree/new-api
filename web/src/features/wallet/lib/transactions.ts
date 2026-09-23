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
import type { TopupRecord } from '../types'

// ============================================================================
// Transactions (top-ups and usage, merged into one list)
// ============================================================================

export interface ConsumeLog {
  id: number
  created_at: number
  model_name: string
  /** Quota units spent by the call */
  quota: number
}

interface TransactionBase {
  id: string
  /** Unix seconds */
  timestamp: number
}

export interface TopupTransaction extends TransactionBase {
  kind: 'topup'
  /** A pending top-up has not been paid (or not confirmed) yet. */
  status: 'success' | 'pending'
  paymentMethod: string
  /** Amount credited, in USD (the unit top-ups are recorded in). */
  usd: number
}

export interface ConsumeTransaction extends TransactionBase {
  kind: 'consume'
  model: string
  /** Quota units spent. */
  quota: number
}

export type Transaction = TopupTransaction | ConsumeTransaction

/**
 * Merge the latest top-up orders and usage calls into one list, newest first.
 *
 * Expired orders never produced a payment, so they are dropped; a pending one
 * is kept so a customer who has just paid can see the order while Airwallex's
 * confirmation is on its way.
 */
export function mergeTransactions(
  topups: TopupRecord[],
  consumes: ConsumeLog[],
  limit: number
): Transaction[] {
  const topupRows: TopupTransaction[] = topups
    .filter(
      (record) => record.status === 'success' || record.status === 'pending'
    )
    .map((record) => ({
      id: `topup-${record.id}`,
      kind: 'topup',
      status: record.status === 'success' ? 'success' : 'pending',
      timestamp:
        record.status === 'success'
          ? record.complete_time || record.create_time
          : record.create_time,
      paymentMethod: record.payment_method,
      usd: record.amount,
    }))

  const consumeRows: ConsumeTransaction[] = consumes.map((log) => ({
    id: `consume-${log.id}`,
    kind: 'consume',
    timestamp: log.created_at,
    model: log.model_name,
    quota: log.quota,
  }))

  return [...topupRows, ...consumeRows]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, limit)
}

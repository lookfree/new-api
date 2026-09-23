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

import { mergeTransactions, type ConsumeLog } from '../lib/transactions'
import type { TopupRecord } from '../types'

function topup(fields: Partial<TopupRecord>): TopupRecord {
  return {
    id: 1,
    user_id: 7,
    amount: 50,
    money: 365,
    trade_no: 'AWX1NOabc',
    payment_method: 'airwallex',
    create_time: 1_000,
    status: 'success',
    ...fields,
  }
}

function consume(fields: Partial<ConsumeLog>): ConsumeLog {
  return {
    id: 1,
    created_at: 1_000,
    model_name: 'gpt-4o',
    quota: 100,
    ...fields,
  }
}

describe('mergeTransactions', () => {
  test('interleaves top-ups and usage newest first', () => {
    const rows = mergeTransactions(
      [
        topup({ id: 1, complete_time: 3_000 }),
        topup({ id: 2, complete_time: 1_000 }),
      ],
      [consume({ id: 9, created_at: 2_000 })],
      10
    )

    expect(rows.map((row) => row.id)).toEqual([
      'topup-1',
      'consume-9',
      'topup-2',
    ])
  })

  test('orders a paid top-up by when it completed, not when the order was created', () => {
    const rows = mergeTransactions(
      [topup({ id: 1, create_time: 1_000, complete_time: 5_000 })],
      [consume({ id: 9, created_at: 4_000 })],
      10
    )

    expect(rows[0]).toMatchObject({ id: 'topup-1', timestamp: 5_000 })
  })

  test('keeps a pending order so a customer who just paid can see it, but drops expired ones', () => {
    const rows = mergeTransactions(
      [
        topup({ id: 1, status: 'pending' }),
        topup({ id: 2, status: 'expired' }),
      ],
      [],
      10
    )

    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ id: 'topup-1', status: 'pending' })
  })

  test('carries the fields each row is displayed from', () => {
    const [first, second] = mergeTransactions(
      [
        topup({
          id: 1,
          amount: 50,
          payment_method: 'airwallex',
          complete_time: 2_000,
        }),
      ],
      [consume({ id: 9, created_at: 1_000, model_name: 'glm-4', quota: 2500 })],
      10
    )

    expect(first).toMatchObject({
      kind: 'topup',
      usd: 50,
      paymentMethod: 'airwallex',
    })
    expect(second).toMatchObject({
      kind: 'consume',
      model: 'glm-4',
      quota: 2500,
    })
  })

  test('caps the list at the requested length after merging', () => {
    const rows = mergeTransactions(
      [topup({ id: 1, complete_time: 9_000 })],
      [
        consume({ id: 1, created_at: 8_000 }),
        consume({ id: 2, created_at: 7_000 }),
        consume({ id: 3, created_at: 6_000 }),
      ],
      2
    )

    expect(rows.map((row) => row.id)).toEqual(['topup-1', 'consume-1'])
  })
})

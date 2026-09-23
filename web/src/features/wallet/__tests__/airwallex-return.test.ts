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

import { pollForCredit } from '../lib/airwallex-return'

/** A balance that reads the next value from `readings` after each refresh. */
function fakeBalance(initial: number | undefined, readings: number[]) {
  let current = initial
  let refreshes = 0
  return {
    refresh: async () => {
      current = readings[refreshes]
      refreshes += 1
    },
    readQuota: () => current,
    get refreshes() {
      return refreshes
    },
  }
}

const noWait = async () => {}
const never = () => false

describe('pollForCredit', () => {
  test('stops as soon as the balance rises above where it started', async () => {
    const balance = fakeBalance(100, [100, 100, 600, 600])

    const outcome = await pollForCredit({
      ...balance,
      wait: noWait,
      isCancelled: never,
    })

    expect(outcome).toBe('credited')
    expect(balance.refreshes).toBe(3)
  })

  test('gives up after the last attempt when the credit never arrives', async () => {
    const balance = fakeBalance(100, [100, 100, 100])

    const outcome = await pollForCredit({
      ...balance,
      wait: noWait,
      isCancelled: never,
      attempts: 3,
    })

    expect(outcome).toBe('timeout')
    expect(balance.refreshes).toBe(3)
  })

  test('does not mistake a balance that fell (usage) for a credit', async () => {
    const balance = fakeBalance(100, [90, 80])

    const outcome = await pollForCredit({
      ...balance,
      wait: noWait,
      isCancelled: never,
      attempts: 2,
    })

    expect(outcome).toBe('timeout')
  })

  test('takes the first reading as the baseline when the balance was unknown on arrival', async () => {
    const balance = fakeBalance(undefined, [100, 700])

    const outcome = await pollForCredit({
      ...balance,
      wait: noWait,
      isCancelled: never,
    })

    expect(outcome).toBe('credited')
    expect(balance.refreshes).toBe(2)
  })

  test('stops at once when the page is left', async () => {
    const balance = fakeBalance(100, [100, 100, 100])
    let cancelled = false

    const outcome = await pollForCredit({
      ...balance,
      wait: async () => {
        cancelled = true
      },
      isCancelled: () => cancelled,
    })

    expect(outcome).toBe('cancelled')
    expect(balance.refreshes).toBe(1)
  })
})

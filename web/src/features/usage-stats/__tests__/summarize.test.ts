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
import dayjs from 'dayjs'
import { describe, expect, it } from 'vitest'

import type { QuotaDataItem } from '@/features/dashboard/types'

import {
  OTHER_MODELS_KEY,
  summarizeUsage,
  usageRangeStart,
} from '../lib/summarize'

// Noon on the 23rd keeps "today" and "N days ago" away from midnight edges,
// and the 23rd is far enough into the month that the seven-day window and the
// month-to-date window differ.
const NOW = dayjs('2026-09-23T12:00:00').toDate()

function row(
  daysAgo: number,
  model: string,
  fields: Partial<QuotaDataItem>
): QuotaDataItem {
  return {
    created_at: dayjs(NOW).subtract(daysAgo, 'day').unix(),
    model_name: model,
    ...fields,
  }
}

describe('summarizeUsage', () => {
  it('returns seven zero-filled days ending today when there is no data', () => {
    const summary = summarizeUsage([], NOW)

    expect(summary.daily.map((d) => d.day)).toEqual([
      '09-17',
      '09-18',
      '09-19',
      '09-20',
      '09-21',
      '09-22',
      '09-23',
    ])
    expect(summary.daily.every((d) => d.requests === 0 && d.tokens === 0)).toBe(
      true
    )
    expect(summary.byModel).toEqual([])
  })

  it('sums rows of the same day into one bucket and counts only today in todayQuota', () => {
    const summary = summarizeUsage(
      [
        row(0, 'gpt-4o', { count: 2, token_used: 100, quota: 50 }),
        row(0, 'glm-4', { count: 1, token_used: 40, quota: 10 }),
        row(1, 'gpt-4o', { count: 5, token_used: 300, quota: 200 }),
      ],
      NOW
    )

    expect(summary.daily.at(-1)).toEqual({
      day: '09-23',
      requests: 3,
      tokens: 140,
    })
    expect(summary.daily.at(-2)).toEqual({
      day: '09-22',
      requests: 5,
      tokens: 300,
    })
    expect(summary.todayQuota).toBe(60)
  })

  it('counts every row since the first of the month in the month totals, even outside the chart window', () => {
    const summary = summarizeUsage(
      [
        row(0, 'gpt-4o', { count: 2, token_used: 100 }),
        row(20, 'gpt-4o', { count: 7, token_used: 700 }),
        // 2026-08-31: last month, must not be counted.
        row(23, 'gpt-4o', { count: 9, token_used: 900 }),
      ],
      NOW
    )

    expect(summary.monthRequests).toBe(9)
    expect(summary.monthTokens).toBe(800)
    // The 20-day-old row is outside the seven-day chart window.
    expect(summary.daily.reduce((sum, d) => sum + d.requests, 0)).toBe(2)
  })

  it('keeps the top four models by spend and folds the rest into others', () => {
    const summary = summarizeUsage(
      [
        row(0, 'a', { quota: 40 }),
        row(0, 'b', { quota: 30 }),
        row(0, 'c', { quota: 15 }),
        row(0, 'd', { quota: 10 }),
        row(0, 'e', { quota: 3 }),
        row(0, 'f', { quota: 2 }),
      ],
      NOW
    )

    expect(summary.byModel).toEqual([
      { model: 'a', quota: 40, share: 40 },
      { model: 'b', quota: 30, share: 30 },
      { model: 'c', quota: 15, share: 15 },
      { model: 'd', quota: 10, share: 10 },
      { model: OTHER_MODELS_KEY, quota: 5, share: 5 },
    ])
  })
})

describe('usageRangeStart', () => {
  it('starts at the first of the month when that is earlier than the chart window', () => {
    expect(usageRangeStart(NOW)).toBe(dayjs('2026-09-01T00:00:00').unix())
  })

  it('starts six days back when the month has just begun', () => {
    const earlyMonth = dayjs('2026-09-03T12:00:00').toDate()

    expect(usageRangeStart(earlyMonth)).toBe(
      dayjs('2026-08-28T00:00:00').unix()
    )
  })
})

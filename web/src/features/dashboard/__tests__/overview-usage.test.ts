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

import {
  formatGrowthPercent,
  growthPercent,
  overviewRangeStart,
  splitQueryRange,
  summarizeOverviewUsage,
} from '../lib/overview-usage'
import type { QuotaDataItem } from '../types'

// 2026-09-23 14:30 local: mid-month, mid-afternoon, so "same time yesterday"
// and "same stretch of last month" are both strictly inside their windows.
const NOW = dayjs('2026-09-23T14:30:00').toDate()

function row(at: string, fields: Partial<QuotaDataItem>): QuotaDataItem {
  return { created_at: dayjs(at).unix(), model_name: 'gpt-4o', ...fields }
}

describe('summarizeOverviewUsage', () => {
  it('compares today with the same hours of yesterday, not with all of yesterday', () => {
    const summary = summarizeOverviewUsage(
      [
        row('2026-09-23T09:00:00', { quota: 30 }),
        row('2026-09-22T09:00:00', { quota: 20 }),
        row('2026-09-22T14:00:00', { quota: 10 }),
        // After 14:30 yesterday: still to come today, so not comparable yet.
        row('2026-09-22T18:00:00', { quota: 500 }),
      ],
      NOW
    )

    expect(summary.todayQuota).toBe(30)
    expect(summary.yesterdaySameTimeQuota).toBe(30)
  })

  it('sums the last 24 hours across midnight, independent of the calendar day', () => {
    const summary = summarizeOverviewUsage(
      [
        row('2026-09-23T10:00:00', { quota: 5 }),
        // 20 hours before NOW, still inside the rolling 24 hours.
        row('2026-09-22T19:00:00', { quota: 7 }),
        // 26 hours before NOW: outside.
        row('2026-09-22T12:00:00', { quota: 100 }),
      ],
      NOW
    )

    expect(summary.last24hQuota).toBe(12)
    expect(summary.todayQuota).toBe(5)
  })

  it('splits requests and tokens into this month and the same stretch of last month', () => {
    const summary = summarizeOverviewUsage(
      [
        row('2026-09-02T10:00:00', { count: 4, token_used: 400 }),
        row('2026-09-23T10:00:00', { count: 1, token_used: 100 }),
        row('2026-08-10T10:00:00', { count: 3, token_used: 300 }),
        // Past the 23rd of August: outside the same-period window.
        row('2026-08-28T10:00:00', { count: 50, token_used: 5000 }),
        // Two months back: ignored.
        row('2026-07-30T10:00:00', { count: 9, token_used: 900 }),
      ],
      NOW
    )

    expect(summary.monthRequests).toBe(5)
    expect(summary.monthTokens).toBe(500)
    expect(summary.lastMonthSamePeriodRequests).toBe(3)
    expect(summary.lastMonthSamePeriodTokens).toBe(300)
  })

  it('stops the last-month window at its end when the current month is longer', () => {
    const lateMarch = dayjs('2026-03-31T12:00:00').toDate()

    const summary = summarizeOverviewUsage(
      [
        row('2026-02-28T20:00:00', { count: 2 }),
        // 2026-03-01 belongs to this month, not to the last-month baseline.
        row('2026-03-01T01:00:00', { count: 7 }),
      ],
      lateMarch
    )

    expect(summary.lastMonthSamePeriodRequests).toBe(2)
    expect(summary.monthRequests).toBe(7)
  })

  it('returns seven zero-filled days ending today', () => {
    const summary = summarizeOverviewUsage([], NOW)

    expect(summary.daily.map((d) => d.day)).toEqual([
      '09-17',
      '09-18',
      '09-19',
      '09-20',
      '09-21',
      '09-22',
      '09-23',
    ])
    expect(summary.daily.every((d) => d.requests === 0)).toBe(true)
    expect(summary.topModels).toEqual([])
  })

  it('ranks the five most called models of the last seven days by their share of calls', () => {
    const models = ['a', 'b', 'c', 'd', 'e', 'f']
    const counts = [40, 25, 15, 10, 6, 4]
    const summary = summarizeOverviewUsage(
      [
        ...models.map((model, i) =>
          row('2026-09-22T10:00:00', { model_name: model, count: counts[i] })
        ),
        // Older than the seven-day window: must not affect the ranking.
        row('2026-09-01T10:00:00', { model_name: 'old', count: 1000 }),
      ],
      NOW
    )

    expect(summary.topModels).toEqual([
      { model: 'a', requests: 40, share: 40 },
      { model: 'b', requests: 25, share: 25 },
      { model: 'c', requests: 15, share: 15 },
      { model: 'd', requests: 10, share: 10 },
      { model: 'e', requests: 6, share: 6 },
    ])
  })
})

describe('growthPercent', () => {
  it('returns the relative change against the baseline', () => {
    expect(growthPercent(112, 100)).toBeCloseTo(12)
    expect(growthPercent(88, 100)).toBeCloseTo(-12)
  })

  it('returns null when the baseline is zero, since there is nothing to compare with', () => {
    expect(growthPercent(5, 0)).toBeNull()
  })
})

describe('formatGrowthPercent', () => {
  it('signs the value and keeps one decimal only below ten percent', () => {
    expect(formatGrowthPercent(8.44)).toBe('+8.4%')
    expect(formatGrowthPercent(-12.4)).toBe('-12%')
    expect(formatGrowthPercent(0)).toBe('+0%')
    expect(formatGrowthPercent(15.1)).toBe('+15%')
  })
})

describe('overviewRangeStart', () => {
  it('starts at the first of the previous month', () => {
    expect(overviewRangeStart(NOW)).toBe(dayjs('2026-08-01T00:00:00').unix())
  })
})

describe('splitQueryRange', () => {
  it('keeps every chunk under the 30-day limit and covers the range without gaps or overlap', () => {
    const start = dayjs('2026-08-01T00:00:00').unix()
    const end = dayjs('2026-09-23T14:30:00').unix()

    const chunks = splitQueryRange(start, end)

    expect(chunks.length).toBeGreaterThan(1)
    expect(chunks[0][0]).toBe(start)
    expect(chunks.at(-1)?.[1]).toBe(end)
    for (const [chunkStart, chunkEnd] of chunks) {
      expect(chunkEnd - chunkStart).toBeLessThanOrEqual(30 * 24 * 3600)
    }
    for (let i = 1; i < chunks.length; i++) {
      expect(chunks[i][0]).toBe(chunks[i - 1][1] + 1)
    }
  })

  it('returns a single chunk for a short range', () => {
    expect(splitQueryRange(100, 200)).toEqual([[100, 200]])
  })
})

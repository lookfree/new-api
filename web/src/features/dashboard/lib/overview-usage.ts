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

import type { QuotaDataItem } from '../types'

export const OVERVIEW_TREND_DAYS = 7
export const OVERVIEW_TOP_MODEL_COUNT = 5

// The self usage endpoint rejects spans over 30 days, so ranges are cut into
// chunks safely below that.
const MAX_CHUNK_SECONDS = 29 * 24 * 3600

export type OverviewDailyUsage = { day: string; requests: number }
export type OverviewModelShare = {
  model: string
  requests: number
  share: number
}

export type OverviewUsage = {
  todayQuota: number
  last24hQuota: number
  yesterdaySameTimeQuota: number
  monthRequests: number
  monthTokens: number
  lastMonthSamePeriodRequests: number
  lastMonthSamePeriodTokens: number
  daily: OverviewDailyUsage[]
  topModels: OverviewModelShare[]
}

/**
 * Start (unix seconds) of the earliest data the overview needs: the first of
 * the previous month, which always reaches back past both the seven-day trend
 * and yesterday, and gives the same-period comparison its baseline.
 */
export function overviewRangeStart(now: Date): number {
  return dayjs(now).startOf('month').subtract(1, 'month').unix()
}

/**
 * Cuts [start, end] into contiguous, non-overlapping ranges the endpoint will
 * accept. The endpoint bounds are inclusive, so each chunk starts one second
 * after the previous one ends and no hourly bucket is counted twice.
 */
export function splitQueryRange(
  start: number,
  end: number
): [number, number][] {
  const chunks: [number, number][] = []
  let chunkStart = start
  while (chunkStart <= end) {
    const chunkEnd = Math.min(chunkStart + MAX_CHUNK_SECONDS, end)
    chunks.push([chunkStart, chunkEnd])
    chunkStart = chunkEnd + 1
  }
  return chunks
}

/**
 * Relative change in percent, or null when there is no baseline to compare
 * against (a change from zero is not a percentage).
 */
export function growthPercent(
  current: number,
  previous: number
): number | null {
  if (!(previous > 0)) return null
  return ((current - previous) / previous) * 100
}

/** "+8.4%" / "-12%": one decimal below 10, whole numbers above. */
export function formatGrowthPercent(percent: number): string {
  const magnitude = Math.abs(percent)
  const text =
    magnitude >= 10 ? String(Math.round(magnitude)) : magnitude.toFixed(1)
  const sign = percent < 0 ? '-' : '+'
  return `${sign}${text.replace(/\.0$/, '')}%`
}

/**
 * Rolls hourly quota_data rows up into the figures the overview shows:
 * today's spend against the same hours of yesterday, month-to-date requests
 * and tokens against the same stretch of last month, the last seven calendar
 * days of requests, and the models with the most calls in that window.
 */
export function summarizeOverviewUsage(
  items: QuotaDataItem[],
  now: Date
): OverviewUsage {
  const today = dayjs(now).startOf('day')
  const yesterday = today.subtract(1, 'day')
  const monthStart = today.startOf('month')
  const lastMonthStart = monthStart.subtract(1, 'month')

  const elapsedToday = now.getTime() / 1000 - today.unix()
  const yesterdayCutoff = yesterday.unix() + elapsedToday
  // Last month may be shorter than the stretch elapsed this month (the 31st
  // against February), so the comparison window stops at its end.
  const elapsedMonth = now.getTime() / 1000 - monthStart.unix()
  const lastMonthCutoff = Math.min(
    lastMonthStart.unix() + elapsedMonth,
    monthStart.unix() - 1
  )

  const daily: OverviewDailyUsage[] = []
  const dayIndex = new Map<string, OverviewDailyUsage>()
  for (let offset = OVERVIEW_TREND_DAYS - 1; offset >= 0; offset--) {
    const day = today.subtract(offset, 'day')
    const bucket = { day: day.format('MM-DD'), requests: 0 }
    daily.push(bucket)
    dayIndex.set(day.format('YYYY-MM-DD'), bucket)
  }

  const last24hStart = now.getTime() / 1000 - 24 * 3600

  const summary: OverviewUsage = {
    todayQuota: 0,
    last24hQuota: 0,
    yesterdaySameTimeQuota: 0,
    monthRequests: 0,
    monthTokens: 0,
    lastMonthSamePeriodRequests: 0,
    lastMonthSamePeriodTokens: 0,
    daily,
    topModels: [],
  }
  const requestsByModel = new Map<string, number>()
  let windowRequests = 0

  for (const item of items) {
    const timestamp = Number(item.created_at) || 0
    const requests = Number(item.count) || 0
    const tokens = Number(item.token_used) || 0
    const quota = Number(item.quota) || 0

    if (timestamp >= last24hStart) summary.last24hQuota += quota

    if (timestamp >= today.unix()) {
      summary.todayQuota += quota
    } else if (timestamp >= yesterday.unix() && timestamp <= yesterdayCutoff) {
      summary.yesterdaySameTimeQuota += quota
    }

    if (timestamp >= monthStart.unix()) {
      summary.monthRequests += requests
      summary.monthTokens += tokens
    } else if (
      timestamp >= lastMonthStart.unix() &&
      timestamp <= lastMonthCutoff
    ) {
      summary.lastMonthSamePeriodRequests += requests
      summary.lastMonthSamePeriodTokens += tokens
    }

    const bucket = dayIndex.get(dayjs.unix(timestamp).format('YYYY-MM-DD'))
    if (!bucket) continue
    bucket.requests += requests
    windowRequests += requests
    if (item.model_name) {
      requestsByModel.set(
        item.model_name,
        (requestsByModel.get(item.model_name) ?? 0) + requests
      )
    }
  }

  summary.topModels = [...requestsByModel.entries()]
    .filter(([, requests]) => requests > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, OVERVIEW_TOP_MODEL_COUNT)
    .map(([model, requests]) => ({
      model,
      requests,
      share: Math.round((requests / windowRequests) * 100),
    }))

  return summary
}

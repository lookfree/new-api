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

import type { QuotaDataItem } from '@/features/dashboard/types'

export const CHART_WINDOW_DAYS = 7
const MAX_MODEL_SLICES = 4
export const OTHER_MODELS_KEY = '__others__'

export type DailyUsage = { day: string; requests: number; tokens: number }
export type ModelSpend = { model: string; quota: number; share: number }

export type UsageSummary = {
  monthRequests: number
  monthTokens: number
  todayQuota: number
  daily: DailyUsage[]
  byModel: ModelSpend[]
}

/**
 * Start (unix seconds) of the earliest day the usage page needs: the first of
 * the current month or six days back, whichever is earlier, so one query
 * serves both the month tiles and the seven-day charts.
 */
export function usageRangeStart(now: Date): number {
  const today = dayjs(now).startOf('day')
  const chartStart = today.subtract(CHART_WINDOW_DAYS - 1, 'day')
  const monthStart = today.startOf('month')
  return (monthStart.isBefore(chartStart) ? monthStart : chartStart).unix()
}

/**
 * Rolls the hourly quota_data rows up into what the usage page shows: month
 * totals for the tiles, one bucket per local calendar day of the last seven
 * days (empty days included so the axis never skips), and the spend share of
 * the top models with the tail folded into a single "others" slice.
 */
export function summarizeUsage(
  items: QuotaDataItem[],
  now: Date,
  days = CHART_WINDOW_DAYS
): UsageSummary {
  const today = dayjs(now).startOf('day')
  const monthStart = today.startOf('month')
  const daily: DailyUsage[] = []
  const dayIndex = new Map<string, DailyUsage>()
  for (let offset = days - 1; offset >= 0; offset--) {
    const bucket = {
      day: today.subtract(offset, 'day').format('MM-DD'),
      requests: 0,
      tokens: 0,
    }
    daily.push(bucket)
    dayIndex.set(today.subtract(offset, 'day').format('YYYY-MM-DD'), bucket)
  }

  let monthRequests = 0
  let monthTokens = 0
  let todayQuota = 0
  let windowQuota = 0
  const quotaByModel = new Map<string, number>()

  for (const item of items) {
    const at = dayjs.unix(item.created_at)
    const requests = item.count ?? 0
    const tokens = item.token_used ?? 0
    const quota = item.quota ?? 0

    if (!at.isBefore(monthStart)) {
      monthRequests += requests
      monthTokens += tokens
    }
    if (!at.isBefore(today)) todayQuota += quota

    const bucket = dayIndex.get(at.format('YYYY-MM-DD'))
    if (!bucket) continue
    bucket.requests += requests
    bucket.tokens += tokens
    windowQuota += quota
    const model = item.model_name || OTHER_MODELS_KEY
    quotaByModel.set(model, (quotaByModel.get(model) ?? 0) + quota)
  }

  const ranked = [...quotaByModel.entries()]
    .filter(([, quota]) => quota > 0)
    .sort((a, b) => b[1] - a[1])
  const head = ranked.slice(0, MAX_MODEL_SLICES)
  const tailQuota = ranked
    .slice(MAX_MODEL_SLICES)
    .reduce((sum, [, quota]) => sum + quota, 0)
  const slices: [string, number][] =
    tailQuota > 0 ? [...head, [OTHER_MODELS_KEY, tailQuota]] : head

  const byModel = slices.map(([model, quota]) => ({
    model,
    quota,
    share: windowQuota > 0 ? Math.round((quota / windowQuota) * 1000) / 10 : 0,
  }))

  return { monthRequests, monthTokens, todayQuota, daily, byModel }
}

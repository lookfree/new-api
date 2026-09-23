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
import type { ApiKey } from '../types'

/**
 * The server returns the key with its middle starred out and no `sk-` prefix.
 * The star run is shortened to a fixed six bullets so the column stays narrow.
 */
export function maskApiKey(key: string): string {
  return `sk-${key}`.replaceAll(/\*+/g, '••••••')
}

export function parseModelLimits(apiKey: ApiKey): string[] {
  if (!apiKey.model_limits_enabled || !apiKey.model_limits) return []
  return apiKey.model_limits.split(',').filter(Boolean)
}

export function parseAllowedIps(apiKey: ApiKey): string[] {
  return (apiKey.allow_ips ?? '')
    .split('\n')
    .map((ip) => ip.trim())
    .filter(Boolean)
}

export type QuotaSummary =
  | { unlimited: true; used: number }
  | {
      unlimited: false
      used: number
      remaining: number
      total: number
      remainingPercent: number
    }

export function getQuotaSummary(apiKey: ApiKey): QuotaSummary {
  if (apiKey.unlimited_quota) {
    return { unlimited: true, used: apiKey.used_quota }
  }
  const total = apiKey.used_quota + apiKey.remain_quota
  return {
    unlimited: false,
    used: apiKey.used_quota,
    remaining: apiKey.remain_quota,
    total,
    remainingPercent: total > 0 ? (apiKey.remain_quota / total) * 100 : 0,
  }
}

/** Status filtering happens on the loaded page; the list endpoint has no status parameter. */
export function filterKeysByStatus(items: ApiKey[], status: string): ApiKey[] {
  if (!status) return items
  return items.filter((apiKey) => String(apiKey.status) === status)
}

export type KeyMeta = {
  /** `ratio` is null when the server sent none or a non-numeric one (Auto). */
  group: { name: string; ratio: number | null } | null
  models: string[]
  ips: string[]
  /** Unix seconds; null for a key that never expires. */
  expiresAt: number | null
}

/** What restricts a key, for the secondary line under its name. */
export function getKeyMeta(
  apiKey: ApiKey,
  groupRatios: Record<string, number | string>
): KeyMeta {
  const groupName = apiKey.group ?? ''
  const ratio = groupRatios[groupName]
  return {
    group: groupName
      ? { name: groupName, ratio: typeof ratio === 'number' ? ratio : null }
      : null,
    models: parseModelLimits(apiKey),
    ips: parseAllowedIps(apiKey),
    expiresAt: apiKey.expired_time > 0 ? apiKey.expired_time : null,
  }
}

export function hasKeyMeta(meta: KeyMeta): boolean {
  return (
    meta.group !== null ||
    meta.models.length > 0 ||
    meta.ips.length > 0 ||
    meta.expiresAt !== null
  )
}

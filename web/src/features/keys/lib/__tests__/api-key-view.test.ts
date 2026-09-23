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
import { describe, expect, it } from 'vitest'

import type { ApiKey } from '../../types'
import {
  filterKeysByStatus,
  getKeyMeta,
  getQuotaSummary,
  hasKeyMeta,
  maskApiKey,
  parseAllowedIps,
  parseModelLimits,
} from '../api-key-view'

function makeKey(overrides: Partial<ApiKey> = {}): ApiKey {
  return {
    id: 1,
    name: 'Production',
    key: 'ywW6**********GiVp',
    status: 1,
    remain_quota: 0,
    used_quota: 0,
    unlimited_quota: false,
    expired_time: -1,
    created_time: 1_790_000_000,
    accessed_time: 1_790_000_000,
    group: '',
    auto_groups: null,
    cross_group_retry: false,
    model_limits_enabled: false,
    model_limits: '',
    allow_ips: '',
    ...overrides,
  }
}

describe('maskApiKey', () => {
  it('prefixes sk- and swaps the server-side asterisks for six bullets', () => {
    expect(maskApiKey('ywW6**********GiVp')).toBe('sk-ywW6••••••GiVp')
  })
})

describe('parseModelLimits', () => {
  it('lists the allowed models when the limit is enabled', () => {
    const apiKey = makeKey({
      model_limits_enabled: true,
      model_limits: 'gpt-4o,glm-4,',
    })

    expect(parseModelLimits(apiKey)).toEqual(['gpt-4o', 'glm-4'])
  })

  it('ignores a stored list while the limit is switched off', () => {
    const apiKey = makeKey({
      model_limits_enabled: false,
      model_limits: 'gpt-4o',
    })

    expect(parseModelLimits(apiKey)).toEqual([])
  })
})

describe('parseAllowedIps', () => {
  it('splits on newlines and drops blanks and padding', () => {
    const apiKey = makeKey({ allow_ips: '203.0.113.7\n\n  198.51.100.0/24 \n' })

    expect(parseAllowedIps(apiKey)).toEqual(['203.0.113.7', '198.51.100.0/24'])
  })

  it('returns nothing when no restriction is stored', () => {
    expect(parseAllowedIps(makeKey({ allow_ips: null }))).toEqual([])
  })
})

describe('getQuotaSummary', () => {
  it('reports only the used amount for an unlimited key', () => {
    const summary = getQuotaSummary(
      makeKey({ unlimited_quota: true, used_quota: 120 })
    )

    expect(summary).toEqual({ unlimited: true, used: 120 })
  })

  it('derives total and remaining percentage from used plus remaining', () => {
    const summary = getQuotaSummary(
      makeKey({ used_quota: 250, remain_quota: 750 })
    )

    expect(summary).toEqual({
      unlimited: false,
      used: 250,
      remaining: 750,
      total: 1000,
      remainingPercent: 75,
    })
  })

  it('reports 0% for a key with no quota at all instead of dividing by zero', () => {
    const summary = getQuotaSummary(makeKey({ used_quota: 0, remain_quota: 0 }))

    expect(summary).toMatchObject({ total: 0, remainingPercent: 0 })
  })
})

describe('filterKeysByStatus', () => {
  const items = [
    makeKey({ id: 1, status: 1 }),
    makeKey({ id: 2, status: 2 }),
    makeKey({ id: 3, status: 1 }),
  ]

  it('returns every key for the empty status', () => {
    expect(filterKeysByStatus(items, '')).toHaveLength(3)
  })

  it('keeps only keys with the chosen status', () => {
    expect(filterKeysByStatus(items, '2').map((k) => k.id)).toEqual([2])
  })
})

describe('getKeyMeta', () => {
  it('reports nothing for a key with no group, limits or expiry', () => {
    const meta = getKeyMeta(makeKey(), {})

    expect(meta).toEqual({ group: null, models: [], ips: [], expiresAt: null })
    expect(hasKeyMeta(meta)).toBe(false)
  })

  it('collects the group with its numeric ratio, model list, IP list and expiry', () => {
    const meta = getKeyMeta(
      makeKey({
        group: 'vip',
        model_limits_enabled: true,
        model_limits: 'gpt-4o',
        allow_ips: '203.0.113.7',
        expired_time: 1_800_000_000,
      }),
      { vip: 1.5 }
    )

    expect(meta).toEqual({
      group: { name: 'vip', ratio: 1.5 },
      models: ['gpt-4o'],
      ips: ['203.0.113.7'],
      expiresAt: 1_800_000_000,
    })
    expect(hasKeyMeta(meta)).toBe(true)
  })

  it('drops a non-numeric group ratio such as the Auto placeholder', () => {
    const meta = getKeyMeta(makeKey({ group: 'auto' }), { auto: 'auto' })

    expect(meta.group).toEqual({ name: 'auto', ratio: null })
  })

  it('treats -1 as a key that never expires', () => {
    expect(getKeyMeta(makeKey({ expired_time: -1 }), {}).expiresAt).toBeNull()
  })
})

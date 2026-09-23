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
import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'

import { getApiKeys } from '@/features/keys/api'
import type { ApiKey } from '@/features/keys/types'
import { getUserModels } from '@/lib/api'

import { buildBaseUrl, formatDisplayKey } from '../lib/quick-start'
import { useApiInfo } from './use-status-data'

const FALLBACK_MODEL = 'gpt-4o-mini'

function getPreferredKey(keys: ApiKey[]): ApiKey | null {
  return keys.find((item) => item.status === 1) ?? keys[0] ?? null
}

/**
 * What the overview's getting-started pieces share: the key and model the
 * sample requests are built from, and the base URL customers should call.
 */
export function useOverviewSetup() {
  const { items: apiInfoItems } = useApiInfo()

  const apiKeysQuery = useQuery({
    queryKey: ['dashboard', 'overview', 'api-keys'],
    queryFn: async () => {
      const result = await getApiKeys({ p: 1, size: 10 })
      return result.success ? (result.data?.items ?? []) : []
    },
    staleTime: 60 * 1000,
  })

  const modelsQuery = useQuery({
    queryKey: ['dashboard', 'overview', 'user-models'],
    queryFn: async () => {
      const result = await getUserModels()
      return result.success ? (result.data ?? []) : []
    },
    staleTime: 5 * 60 * 1000,
  })

  const preferredKey = useMemo(
    () => getPreferredKey(apiKeysQuery.data ?? []),
    [apiKeysQuery.data]
  )

  return {
    apiKeysFetched: apiKeysQuery.isFetched,
    preferredKey,
    displayKey: preferredKey
      ? formatDisplayKey(`sk-${preferredKey.key}`)
      : formatDisplayKey(undefined),
    model: modelsQuery.data?.[0] ?? FALLBACK_MODEL,
    baseUrl: buildBaseUrl(
      apiInfoItems[0]?.url,
      typeof window === 'undefined' ? '' : window.location.origin
    ),
  }
}

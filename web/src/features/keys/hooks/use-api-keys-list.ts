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
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { useDebounce } from '@/hooks/use-debounce'

import { getApiKeys, searchApiKeys } from '../api'
import { useApiKeys } from '../components/api-keys-provider'
import { API_KEYS_PAGE_SIZE, ERROR_MESSAGES } from '../constants'
import { filterKeysByStatus } from '../lib/api-key-view'

const SEARCH_DEBOUNCE_MS = 400

/**
 * The signed-in user's keys: one server page at a time, narrowed by the name
 * and key search boxes (server side) and the status filter (on the loaded page,
 * because the list endpoint takes no status).
 */
export function useApiKeysList() {
  const { t } = useTranslation()
  const { refreshTrigger } = useApiKeys()
  const [page, setPage] = useState(1)
  const [nameInput, setNameInput] = useState('')
  const [keyInput, setKeyInput] = useState('')
  const [status, setStatus] = useState('')
  const name = useDebounce(nameInput.trim(), SEARCH_DEBOUNCE_MS)
  const token = useDebounce(keyInput.trim(), SEARCH_DEBOUNCE_MS)
  const shouldSearch = Boolean(name || token)

  // A new search changes the result set, so start again from the first page.
  const [searchedFor, setSearchedFor] = useState({ name, token })
  if (searchedFor.name !== name || searchedFor.token !== token) {
    setSearchedFor({ name, token })
    setPage(1)
  }

  // eslint-disable-next-line @tanstack/query/exhaustive-deps
  const query = useQuery({
    queryKey: ['keys', page, API_KEYS_PAGE_SIZE, name, token, refreshTrigger],
    queryFn: async () => {
      const result = shouldSearch
        ? await searchApiKeys({
            keyword: name,
            token,
            p: page,
            size: API_KEYS_PAGE_SIZE,
          })
        : await getApiKeys({ p: page, size: API_KEYS_PAGE_SIZE })

      if (!result.success) {
        toast.error(
          result.message ||
            t(
              shouldSearch
                ? ERROR_MESSAGES.SEARCH_FAILED
                : ERROR_MESSAGES.LOAD_FAILED
            )
        )
        return { items: [], total: 0 }
      }
      return {
        items: result.data?.items || [],
        total: result.data?.total || 0,
      }
    },
    placeholderData: (previousData) => previousData,
  })

  const total = query.data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / API_KEYS_PAGE_SIZE))
  // Deleting the last key of the last page leaves the page number too high.
  if (page > totalPages) setPage(totalPages)

  const items = useMemo(
    () => filterKeysByStatus(query.data?.items ?? [], status),
    [query.data?.items, status]
  )
  const hasFilters = Boolean(nameInput || keyInput || status)

  function resetFilters() {
    setNameInput('')
    setKeyInput('')
    setStatus('')
  }

  return {
    items,
    total,
    page,
    totalPages,
    setPage,
    nameInput,
    setNameInput,
    keyInput,
    setKeyInput,
    status,
    setStatus,
    hasFilters,
    resetFilters,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    refreshKey: `${page}|${name}|${token}|${status}|${refreshTrigger}`,
  }
}

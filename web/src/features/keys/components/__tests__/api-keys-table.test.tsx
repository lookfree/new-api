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
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, test } from 'vitest'

import type { ApiKey } from '../../types'

const { createInstance } = await import('i18next')
const { I18nextProvider, initReactI18next } = await import('react-i18next')
const { QueryClient, QueryClientProvider } =
  await import('@tanstack/react-query')
const { TooltipProvider } = await import('@/components/ui/tooltip')
const { api } = await import('@/lib/api')
const { API_KEYS_MANAGE_THRESHOLD, API_KEYS_PAGE_SIZE } =
  await import('../../constants')
const { ApiKeysProvider, useApiKeys } = await import('../api-keys-provider')
const { ApiKeysTable } = await import('../api-keys-table')

const i18n = createInstance()
await i18n.use(initReactI18next).init({
  lng: 'en',
  resources: { en: { translation: {} } },
})

type MockableApi = {
  get: (url: string) => Promise<{ data: unknown }>
}

const apiClient = api as unknown as MockableApi
const originalGet = apiClient.get
let requestedUrls: string[] = []

function makeKey(id: number, overrides: Partial<ApiKey> = {}): ApiKey {
  return {
    id,
    name: `key-${id}`,
    key: `abc${id}**********xyz${id}`,
    status: 1,
    remain_quota: 0,
    used_quota: 0,
    unlimited_quota: true,
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

function installList(items: ApiKey[], total = items.length) {
  requestedUrls = []
  apiClient.get = async (url) => {
    requestedUrls.push(url)
    if (url.startsWith('/api/token/?')) {
      return {
        data: {
          success: true,
          data: {
            items,
            total,
            page: 1,
            page_size: API_KEYS_PAGE_SIZE,
          },
        },
      }
    }
    throw new Error(`Unexpected GET ${url}`)
  }
}

function DialogProbe() {
  const { open, currentRow } = useApiKeys()
  return (
    <output data-testid='dialog-probe'>
      {open ?? 'none'}:{currentRow?.name ?? ''}
    </output>
  )
}

function renderTable() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  const freshAt = Date.now() + 60_000
  queryClient.setQueryData(['status'], {}, { updatedAt: freshAt })
  queryClient.setQueryData(
    ['user-groups'],
    { success: true, data: { default: { desc: 'Default', ratio: 1 } } },
    { updatedAt: freshAt }
  )

  return render(
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={i18n}>
        <TooltipProvider>
          <ApiKeysProvider>
            <ApiKeysTable />
            <DialogProbe />
          </ApiKeysProvider>
        </TooltipProvider>
      </I18nextProvider>
    </QueryClientProvider>
  )
}

afterEach(() => {
  apiClient.get = originalGet
})

describe('API keys table', () => {
  test('shows a handful of keys as the plain table, without filters or row selection', async () => {
    installList([
      makeKey(1, { name: 'Production' }),
      makeKey(2, { name: 'Playground', status: 2 }),
    ])

    renderTable()

    expect(await screen.findByText('Production')).toBeInTheDocument()
    // Once in its own column and once under the name for narrow screens.
    expect(screen.getAllByText('sk-abc1••••••xyz1')).toHaveLength(2)
    expect(screen.getByText('Enabled')).toBeInTheDocument()
    expect(screen.getByText('Disabled')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Revoke key' })).toHaveLength(
      2
    )
    expect(screen.queryByPlaceholderText('Filter by name...')).toBeNull()
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0)
  })

  test('summarises a key group, model list, IP list and expiry under its name', async () => {
    installList([
      makeKey(1, {
        name: 'CI',
        group: 'vip',
        model_limits_enabled: true,
        model_limits: 'gpt-4o,glm-4',
        allow_ips: '203.0.113.7\n198.51.100.0/24',
        expired_time: 4_102_444_800,
      }),
    ])

    renderTable()

    expect(await screen.findByText('Group: vip')).toBeInTheDocument()
    expect(screen.getByText('2 models')).toBeInTheDocument()
    expect(screen.getByText('2 IP(s)')).toBeInTheDocument()
    expect(screen.getByText('Expires 2100-01-01')).toBeInTheDocument()
  })

  test('adds filters and row selection once there are more keys than the threshold', async () => {
    const items = Array.from(
      { length: API_KEYS_MANAGE_THRESHOLD + 1 },
      (_, i) => makeKey(i + 1)
    )
    installList(items)

    renderTable()

    expect(await screen.findByText('key-1')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Filter by name...')).toBeInTheDocument()
    const rowBoxes = screen.getAllByRole('checkbox', { name: 'Select row' })
    expect(rowBoxes).toHaveLength(items.length)

    fireEvent.click(rowBoxes[0])
    fireEvent.click(rowBoxes[1])

    expect(await screen.findByText('Selected 2')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /Delete selected API keys/ })
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Clear selection' }))
    await waitFor(() => expect(screen.queryByText(/^Selected/)).toBeNull())
  })

  test('offers to create the first key when there are none', async () => {
    installList([])

    renderTable()

    expect(await screen.findByText('No API Keys Found')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Create key' }))

    expect(screen.getByTestId('dialog-probe')).toHaveTextContent('create:')
  })

  test('opens the delete confirmation for the row whose revoke button was clicked', async () => {
    installList([
      makeKey(1, { name: 'Production' }),
      makeKey(2, { name: 'CI' }),
    ])

    renderTable()

    await screen.findByText('CI')
    const revokeButtons = screen.getAllByRole('button', { name: 'Revoke key' })
    fireEvent.click(revokeButtons[1])

    expect(screen.getByTestId('dialog-probe')).toHaveTextContent('delete:CI')
  })

  test('pages through the server list and shows where you are', async () => {
    const firstPage = Array.from({ length: API_KEYS_PAGE_SIZE }, (_, i) =>
      makeKey(i + 1)
    )
    installList(firstPage, API_KEYS_PAGE_SIZE * 2 + 5)

    renderTable()

    expect(await screen.findByText('Page 1 of 3')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Next page/ }))

    await waitFor(() =>
      expect(requestedUrls).toContain(
        `/api/token/?p=2&size=${API_KEYS_PAGE_SIZE}`
      )
    )
    expect(await screen.findByText('Page 2 of 3')).toBeInTheDocument()
  })
})

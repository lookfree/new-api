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
import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'

const { createInstance } = await import('i18next')
const { I18nextProvider, initReactI18next } = await import('react-i18next')
const { QueryClient, QueryClientProvider } =
  await import('@tanstack/react-query')
const { ApiKeysEndpointCard } = await import('../api-keys-endpoint-card')

const i18n = createInstance()
await i18n.use(initReactI18next).init({
  lng: 'en',
  resources: { en: { translation: {} } },
})

function renderCard(status: Record<string, unknown>) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  queryClient.setQueryData(['status'], status, {
    updatedAt: Date.now() + 60_000,
  })
  render(
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={i18n}>
        <ApiKeysEndpointCard />
      </I18nextProvider>
    </QueryClientProvider>
  )
}

describe('API keys endpoint card', () => {
  test.each([
    ['https://api.zetone.ai', 'https://api.zetone.ai/v1'],
    ['https://api.zetone.ai///', 'https://api.zetone.ai/v1'],
    ['', `${window.location.origin}/v1`],
  ])(
    'shows the /v1 base URL for server address %j',
    (serverAddress, expected) => {
      renderCard({ server_address: serverAddress })

      expect(screen.getByText(expected)).toBeInTheDocument()
    }
  )

  test('falls back to the page origin when the status has no server address', () => {
    renderCard({})

    expect(screen.getByText(`${window.location.origin}/v1`)).toBeInTheDocument()
  })
})

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
import { useTranslation } from 'react-i18next'

import { ConsolePage } from '@/components/layout'

import { ApiKeysDialogs } from './components/api-keys-dialogs'
import { ApiKeysEndpointCard } from './components/api-keys-endpoint-card'
import { ApiKeysPrimaryButtons } from './components/api-keys-primary-buttons'
import { ApiKeysProvider } from './components/api-keys-provider'
import { ApiKeysTable } from './components/api-keys-table'

export function ApiKeys() {
  const { t } = useTranslation()
  return (
    <ApiKeysProvider>
      <ConsolePage>
        {/* The prototype lines the action up with the subtitle, not the title. */}
        <div className='flex flex-wrap items-end justify-between gap-3'>
          <div>
            <h2 className='text-2xl font-semibold tracking-tight'>
              {t('API Keys')}
            </h2>
            <p className='text-muted-foreground mt-1'>
              {t(
                'Use keys to access the unified API. Keep them safe and never expose them.'
              )}
            </p>
          </div>
          <ApiKeysPrimaryButtons />
        </div>
        <ApiKeysEndpointCard />
        <ApiKeysTable />
      </ConsolePage>

      <ApiKeysDialogs />
    </ApiKeysProvider>
  )
}

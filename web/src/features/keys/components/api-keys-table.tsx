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
import { Card } from '@/components/ui/card'

import { API_KEYS_MANAGE_THRESHOLD } from '../constants'
import { useApiKeysList } from '../hooks/use-api-keys-list'
import { ApiKeysPagination } from './api-keys-pagination'
import { ApiKeysTableBody } from './api-keys-table-body'
import { ApiKeysToolbar } from './api-keys-toolbar'

export function ApiKeysTable() {
  const list = useApiKeysList()
  const manage = list.total > API_KEYS_MANAGE_THRESHOLD || list.hasFilters

  return (
    <Card className='gap-0 overflow-hidden py-0'>
      {manage && (
        <ApiKeysToolbar
          nameInput={list.nameInput}
          onNameChange={list.setNameInput}
          keyInput={list.keyInput}
          onKeyChange={list.setKeyInput}
          status={list.status}
          onStatusChange={list.setStatus}
          hasFilters={list.hasFilters}
          onReset={list.resetFilters}
        />
      )}
      <ApiKeysTableBody
        key={list.refreshKey}
        items={list.items}
        isLoading={list.isLoading}
        manage={manage}
        hasFilters={list.hasFilters}
        onResetFilters={list.resetFilters}
      />
      <ApiKeysPagination
        page={list.page}
        totalPages={list.totalPages}
        onPageChange={list.setPage}
      />
    </Card>
  )
}

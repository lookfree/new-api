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

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'

import { API_KEY_STATUS_OPTIONS } from '../constants'

type ApiKeysToolbarProps = {
  nameInput: string
  onNameChange: (value: string) => void
  keyInput: string
  onKeyChange: (value: string) => void
  status: string
  onStatusChange: (value: string) => void
  hasFilters: boolean
  onReset: () => void
}

export function ApiKeysToolbar(props: ApiKeysToolbarProps) {
  const { t } = useTranslation()

  return (
    <div className='flex flex-wrap items-center gap-2 border-b px-5 py-3'>
      <Input
        value={props.nameInput}
        onChange={(e) => props.onNameChange(e.target.value)}
        placeholder={t('Filter by name...')}
        aria-label={t('Filter by name...')}
        className='w-full sm:w-48'
      />
      <Input
        value={props.keyInput}
        onChange={(e) => props.onKeyChange(e.target.value)}
        placeholder={t('Filter by API key...')}
        aria-label={t('Filter by API key...')}
        className='w-full sm:w-52'
      />
      <NativeSelect
        value={props.status}
        onChange={(e) => props.onStatusChange(e.target.value)}
        aria-label={t('Status')}
      >
        <NativeSelectOption value=''>
          {t('Status')}: {t('All')}
        </NativeSelectOption>
        {API_KEY_STATUS_OPTIONS.map((option) => (
          <NativeSelectOption key={option.value} value={option.value}>
            {t(option.label)}
          </NativeSelectOption>
        ))}
      </NativeSelect>
      {props.hasFilters && (
        <Button variant='ghost' size='sm' onClick={props.onReset}>
          {t('Reset')}
        </Button>
      )}
    </div>
  )
}

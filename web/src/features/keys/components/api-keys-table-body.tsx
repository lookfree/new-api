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
import { KeyRound, Plus } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { Skeleton } from '@/components/ui/skeleton'

import { useGroupRatios } from '../hooks/use-group-ratios'
import type { ApiKey } from '../types'
import { ApiKeyRow } from './api-key-row'
import { useApiKeys } from './api-keys-provider'
import { ApiKeysSelectionBar } from './api-keys-selection-bar'

const SKELETON_ROW_IDS = ['first', 'second', 'third']

type ApiKeysTableBodyProps = {
  items: ApiKey[]
  isLoading: boolean
  /** Many keys: rows become selectable for batch copy and delete. */
  manage: boolean
  hasFilters: boolean
  onResetFilters: () => void
}

/** Owns the row selection, so mounting it under a fresh `key` clears it. */
export function ApiKeysTableBody(props: ApiKeysTableBodyProps) {
  const { t } = useTranslation()
  const { setOpen } = useApiKeys()
  const groupRatios = useGroupRatios()
  const [now] = useState(() => Date.now())
  const [selectedIds, setSelectedIds] = useState<Set<number>>(() => new Set())

  const selected = props.items.filter((apiKey) => selectedIds.has(apiKey.id))
  const allSelected =
    props.items.length > 0 && selected.length === props.items.length

  function setRowSelected(id: number, value: boolean) {
    setSelectedIds((previous) => {
      const next = new Set(previous)
      if (value) next.add(id)
      else next.delete(id)
      return next
    })
  }

  function setAllSelected(value: boolean) {
    setSelectedIds(
      value ? new Set(props.items.map((apiKey) => apiKey.id)) : new Set()
    )
  }

  if (!props.isLoading && props.items.length === 0) {
    return (
      <Empty className='py-12'>
        <EmptyHeader>
          <EmptyMedia variant='icon'>
            <KeyRound className='size-6' />
          </EmptyMedia>
          <EmptyTitle>{t('No API Keys Found')}</EmptyTitle>
          <EmptyDescription>
            {props.hasFilters
              ? t('No keys match the current filters.')
              : t(
                  'No API keys available. Create your first API key to get started.'
                )}
          </EmptyDescription>
        </EmptyHeader>
        {props.hasFilters ? (
          <Button variant='outline' size='sm' onClick={props.onResetFilters}>
            {t('Reset')}
          </Button>
        ) : (
          <Button onClick={() => setOpen('create')}>
            <Plus />
            {t('Create key')}
          </Button>
        )}
      </Empty>
    )
  }

  return (
    <>
      {selected.length > 0 && (
        <ApiKeysSelectionBar
          selected={selected}
          onClear={() => setSelectedIds(new Set())}
        />
      )}
      <div className='overflow-x-auto'>
        <table className='w-full text-sm'>
          <thead>
            <tr className='bg-muted/40 text-muted-foreground border-b text-left text-xs whitespace-nowrap'>
              {props.manage && (
                <th className='w-10 py-3 pr-0 pl-3 sm:pl-5'>
                  <Checkbox
                    checked={allSelected}
                    indeterminate={selected.length > 0 && !allSelected}
                    onCheckedChange={(value) => setAllSelected(!!value)}
                    aria-label={t('Select all')}
                  />
                </th>
              )}
              <th className='px-3 py-3 font-medium sm:px-5'>{t('Name')}</th>
              <th className='hidden px-5 py-3 font-medium sm:table-cell'>
                {t('Key')}
              </th>
              <th className='hidden px-5 py-3 font-medium lg:table-cell'>
                {t('Quota')}
              </th>
              <th className='hidden px-5 py-3 font-medium sm:table-cell'>
                {t('Created')}
              </th>
              <th className='hidden px-5 py-3 font-medium md:table-cell'>
                {t('Last used')}
              </th>
              <th className='px-3 py-3 font-medium sm:px-5'>{t('Status')}</th>
              <th className='px-3 py-3 sm:px-5' />
            </tr>
          </thead>
          <tbody>
            {props.isLoading
              ? SKELETON_ROW_IDS.map((id) => (
                  <tr key={id} className='border-b last:border-0'>
                    <td colSpan={props.manage ? 8 : 7} className='px-5 py-4'>
                      <Skeleton className='h-5 w-full' />
                    </td>
                  </tr>
                ))
              : props.items.map((apiKey) => (
                  <ApiKeyRow
                    key={apiKey.id}
                    apiKey={apiKey}
                    now={now}
                    groupRatios={groupRatios}
                    selectable={props.manage}
                    selected={selectedIds.has(apiKey.id)}
                    onSelectedChange={(value) =>
                      setRowSelected(apiKey.id, value)
                    }
                  />
                ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

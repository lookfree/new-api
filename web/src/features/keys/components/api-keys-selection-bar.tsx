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
import { Copy, Loader2, Trash2 } from 'lucide-react'
import { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { copyToClipboard } from '@/lib/copy-to-clipboard'

import type { ApiKey } from '../types'
import { ApiKeysMultiDeleteDialog } from './api-keys-multi-delete-dialog'
import { useApiKeys } from './api-keys-provider'

type ApiKeysSelectionBarProps = {
  selected: ApiKey[]
  onClear: () => void
}

export function ApiKeysSelectionBar(props: ApiKeysSelectionBarProps) {
  const { t } = useTranslation()
  const { resolveRealKeysBatch } = useApiKeys()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isCopying, setIsCopying] = useState(false)

  const handleBatchCopy = useCallback(async () => {
    if (props.selected.length === 0) return

    setIsCopying(true)
    try {
      const keysMap = await resolveRealKeysBatch(
        props.selected.map((apiKey) => apiKey.id)
      )

      const lines: string[] = []
      for (const apiKey of props.selected) {
        const realKey = keysMap[apiKey.id]
        if (realKey) {
          lines.push(`${apiKey.name}\t${realKey}`)
        }
      }

      if (lines.length > 0) {
        const ok = await copyToClipboard(lines.join('\n'))
        if (ok) {
          toast.success(t('Copied {{count}} key(s)', { count: lines.length }))
        } else {
          toast.error(t('Failed to copy keys'))
        }
      }
    } catch {
      toast.error(t('Failed to copy keys'))
    } finally {
      setIsCopying(false)
    }
  }, [props.selected, resolveRealKeysBatch, t])

  return (
    <div className='bg-muted/40 flex flex-wrap items-center gap-2 border-b px-5 py-2 text-sm'>
      <span className='text-muted-foreground'>
        {t('Selected {{count}}', { count: props.selected.length })}
      </span>
      <Button
        variant='outline'
        size='sm'
        onClick={handleBatchCopy}
        disabled={isCopying}
      >
        {isCopying ? <Loader2 className='animate-spin' /> : <Copy />}
        {t('Copy selected keys')}
      </Button>
      <Button
        variant='destructive'
        size='sm'
        onClick={() => setShowDeleteConfirm(true)}
      >
        <Trash2 />
        {t('Delete selected API keys')}
      </Button>
      <Button variant='ghost' size='sm' onClick={props.onClear}>
        {t('Clear selection')}
      </Button>

      <ApiKeysMultiDeleteDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        keys={props.selected}
        onDeleted={props.onClear}
      />
    </div>
  )
}

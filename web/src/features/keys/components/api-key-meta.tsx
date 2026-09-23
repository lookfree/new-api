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

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import dayjs from '@/lib/dayjs'
import { cn } from '@/lib/utils'

import { getKeyMeta, hasKeyMeta } from '../lib/api-key-view'
import type { ApiKey } from '../types'

function ListHint(props: { label: string; items: string[] }) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span className='cursor-help underline decoration-dotted underline-offset-2' />
        }
      >
        {props.label}
      </TooltipTrigger>
      <TooltipContent side='top' className='max-w-xs'>
        <div className='max-h-[200px] space-y-0.5 overflow-y-auto text-xs'>
          {props.items.map((item) => (
            <div key={item} className='font-mono'>
              {item}
            </div>
          ))}
        </div>
      </TooltipContent>
    </Tooltip>
  )
}

type ApiKeyMetaProps = {
  apiKey: ApiKey
  groupRatios: Record<string, number | string>
  now: number
}

/** Group, model and IP limits and expiry as one muted line; nothing when unrestricted. */
export function ApiKeyMeta(props: ApiKeyMetaProps) {
  const { t } = useTranslation()
  const meta = getKeyMeta(props.apiKey, props.groupRatios)
  if (!hasKeyMeta(meta)) return null

  const parts: { key: string; node: React.ReactNode }[] = []
  if (meta.group) {
    const name = meta.group.name === 'auto' ? t('Cross-group') : meta.group.name
    const ratio =
      meta.group.ratio !== null && meta.group.ratio !== 1
        ? ` ×${meta.group.ratio}`
        : ''
    parts.push({
      key: 'group',
      node: <span>{`${t('Group')}: ${name}${ratio}`}</span>,
    })
  }
  if (meta.models.length > 0) {
    parts.push({
      key: 'models',
      node: (
        <ListHint
          label={t('{{count}} models', { count: meta.models.length })}
          items={meta.models}
        />
      ),
    })
  }
  if (meta.ips.length > 0) {
    parts.push({
      key: 'ips',
      node: (
        <ListHint
          label={t('{{count}} IP(s)', { count: meta.ips.length })}
          items={meta.ips}
        />
      ),
    })
  }
  if (meta.expiresAt !== null) {
    parts.push({
      key: 'expires',
      node: (
        <span
          className={cn(
            meta.expiresAt * 1000 < props.now && 'text-destructive'
          )}
        >
          {t('Expires {{date}}', {
            date: dayjs.unix(meta.expiresAt).format('YYYY-MM-DD'),
          })}
        </span>
      ),
    })
  }

  return (
    <p className='text-muted-foreground mt-1 flex flex-wrap gap-x-3 gap-y-0.5 pl-6 text-xs'>
      {parts.map((part) => (
        <span key={part.key} className='whitespace-nowrap'>
          {part.node}
        </span>
      ))}
    </p>
  )
}

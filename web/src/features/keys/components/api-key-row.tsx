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
import { KeyRound } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import dayjs from '@/lib/dayjs'
import { formatQuota } from '@/lib/format'
import { cn } from '@/lib/utils'

import {
  API_KEY_STATUS,
  API_KEY_STATUS_BADGE_VARIANTS,
  API_KEY_STATUSES,
} from '../constants'
import { getQuotaSummary } from '../lib/api-key-view'
import type { ApiKey } from '../types'
import { ApiKeyActions } from './api-key-actions'
import { ApiKeyMeta } from './api-key-meta'
import { ApiKeyTimestampCell } from './api-key-timestamp-cell'
import { ApiKeyCell, UnlimitedQuotaBadge } from './api-keys-cells'

const STALE_ACCESS_MONTHS = 3

function getQuotaProgressColor(percentage: number): string {
  if (percentage <= 10) return '[&_[data-slot=progress-indicator]]:bg-rose-500'
  if (percentage <= 30) return '[&_[data-slot=progress-indicator]]:bg-amber-500'
  return '[&_[data-slot=progress-indicator]]:bg-emerald-500'
}

function QuotaCell({ apiKey }: { apiKey: ApiKey }) {
  const { t } = useTranslation()
  const quota = getQuotaSummary(apiKey)
  if (quota.unlimited) return <UnlimitedQuotaBadge used={quota.used} />

  return (
    <Tooltip>
      <TooltipTrigger render={<div className='w-24 space-y-1.5' />}>
        <div className='flex justify-between text-xs tabular-nums'>
          <span className='font-medium'>{formatQuota(quota.remaining)}</span>
          <span className='text-muted-foreground'>
            {formatQuota(quota.total)}
          </span>
        </div>
        <Progress
          value={quota.remainingPercent}
          className={cn('h-1.5', getQuotaProgressColor(quota.remainingPercent))}
        />
      </TooltipTrigger>
      <TooltipContent>
        <div className='space-y-1 text-xs'>
          <div>
            {t('Used:')} {formatQuota(quota.used)}
          </div>
          <div>
            {t('Remaining:')} {formatQuota(quota.remaining)} (
            {quota.remainingPercent.toFixed(1)}%)
          </div>
          <div>
            {t('Total:')} {formatQuota(quota.total)}
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  )
}

type ApiKeyRowProps = {
  apiKey: ApiKey
  now: number
  groupRatios: Record<string, number | string>
  selectable: boolean
  selected: boolean
  onSelectedChange: (selected: boolean) => void
}

export function ApiKeyRow(props: ApiKeyRowProps) {
  const { t } = useTranslation()
  const apiKey = props.apiKey
  const statusConfig = API_KEY_STATUSES[apiKey.status]
  const inactive = apiKey.status !== API_KEY_STATUS.ENABLED
  const staleAfter = dayjs(props.now).subtract(STALE_ACCESS_MONTHS, 'month')
  const isStale =
    apiKey.accessed_time > 0 &&
    dayjs.unix(apiKey.accessed_time).isBefore(staleAfter)

  return (
    <tr className={cn('border-b last:border-0', inactive && 'bg-muted/30')}>
      {props.selectable && (
        <td className='w-10 py-3 pr-0 pl-3 sm:pl-5'>
          <Checkbox
            checked={props.selected}
            onCheckedChange={(value) => props.onSelectedChange(!!value)}
            aria-label={t('Select row')}
          />
        </td>
      )}
      <td className='px-3 py-3 sm:px-5'>
        <span className='flex items-center gap-2 font-medium'>
          <KeyRound className='text-muted-foreground size-4 shrink-0' />
          <span className='min-w-0 truncate'>{apiKey.name}</span>
        </span>
        <ApiKeyMeta
          apiKey={apiKey}
          groupRatios={props.groupRatios}
          now={props.now}
        />
        <div className='mt-1 pl-6 sm:hidden'>
          <ApiKeyCell apiKey={apiKey} />
        </div>
      </td>
      <td className='hidden px-5 py-3 sm:table-cell'>
        <ApiKeyCell apiKey={apiKey} />
      </td>
      <td className='hidden px-5 py-3 lg:table-cell'>
        <QuotaCell apiKey={apiKey} />
      </td>
      <td className='text-muted-foreground hidden px-5 py-3 whitespace-nowrap sm:table-cell'>
        <ApiKeyTimestampCell timestamp={apiKey.created_time} />
      </td>
      <td className='text-muted-foreground hidden px-5 py-3 whitespace-nowrap md:table-cell'>
        <ApiKeyTimestampCell
          timestamp={apiKey.accessed_time}
          className={isStale ? 'text-warning' : undefined}
        />
      </td>
      <td className='px-3 py-3 sm:px-5'>
        {statusConfig && (
          <Badge variant={API_KEY_STATUS_BADGE_VARIANTS[apiKey.status]}>
            {t(statusConfig.label)}
          </Badge>
        )}
      </td>
      <td className='px-3 py-3 sm:px-5'>
        <ApiKeyActions apiKey={apiKey} />
      </td>
    </tr>
  )
}

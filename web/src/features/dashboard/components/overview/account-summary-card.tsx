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
import { Link } from '@tanstack/react-router'
import { ArrowRight, Flame, History, Timer, Activity } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useSelf } from '@/hooks/use-self'
import { formatNumber, formatQuota } from '@/lib/format'
import { cn } from '@/lib/utils'

import {
  getHealthLevel,
  getRunwayDays,
  type HealthLevel,
} from '../../lib/account-health'
import type { OverviewUsage } from '../../lib/overview-usage'

const HEALTH_DISPLAY: Record<
  HealthLevel,
  { dotClass: string; labelKey: string }
> = {
  healthy: { dotClass: 'bg-success', labelKey: 'Healthy' },
  caution: { dotClass: 'bg-warning', labelKey: 'Low balance' },
  critical: { dotClass: 'bg-destructive', labelKey: 'Balance depleted' },
}

function SummaryCell(props: {
  icon: typeof Flame
  label: string
  value: string
  valueClassName?: string
}) {
  const Icon = props.icon
  return (
    <div className='bg-muted/40 rounded-lg px-3 py-2.5'>
      <div className='text-muted-foreground flex items-center gap-1.5 text-xs font-medium'>
        <Icon className='size-3.5 shrink-0' aria-hidden='true' />
        <span className='truncate'>{props.label}</span>
      </div>
      <div
        className={cn(
          'mt-1.5 truncate text-sm font-semibold tabular-nums',
          props.valueClassName
        )}
      >
        {props.value}
      </div>
    </div>
  )
}

/**
 * Credit health and lifetime totals: what the four headline tiles do not
 * show (rolling 24-hour spend, how long the balance lasts at that pace, and
 * the all-time figures), with the wallet one click away.
 */
export function AccountSummaryCard(props: {
  usage: OverviewUsage | undefined
}) {
  const { t } = useTranslation()
  const { user } = useSelf()

  const remainQuota = Number(user?.quota ?? 0)
  const recentUsage = props.usage?.last24hQuota ?? 0
  const level = getHealthLevel(remainQuota, recentUsage)
  const health = HEALTH_DISPLAY[level]
  const runwayDays = getRunwayDays(remainQuota, recentUsage)

  let runway: string
  if (runwayDays !== null) {
    if (runwayDays < 1) {
      runway = t('Less than 1 day left')
    } else if (runwayDays > 999) {
      runway = `999+ ${t('days')}`
    } else {
      runway = `~${formatNumber(Math.floor(runwayDays))} ${t('days')}`
    }
  } else if (remainQuota <= 0) {
    runway = t('Balance depleted')
  } else {
    runway = t('No recent usage')
  }

  return (
    <Card>
      <CardHeader className='flex flex-row items-center justify-between gap-3'>
        <div className='flex min-w-0 items-center gap-3'>
          <CardTitle>{t('Usage at a glance')}</CardTitle>
          <span className='flex items-center gap-1.5'>
            <span
              className={cn('size-1.5 rounded-full', health.dotClass)}
              aria-hidden='true'
            />
            <span className='text-muted-foreground text-xs font-medium'>
              {t(health.labelKey)}
            </span>
          </span>
        </div>
        <Button variant='outline' size='sm' render={<Link to='/wallet' />}>
          {t('Balance & top-up')}
          <ArrowRight data-icon='inline-end' />
        </Button>
      </CardHeader>
      <CardContent>
        <div className='grid grid-cols-2 gap-3 lg:grid-cols-4'>
          <SummaryCell
            icon={Flame}
            label={t('Last 24h usage')}
            value={formatQuota(recentUsage)}
          />
          <SummaryCell
            icon={Timer}
            label={t('Runway')}
            value={runway}
            valueClassName={cn(
              level === 'critical' && 'text-destructive',
              level === 'caution' && 'text-warning'
            )}
          />
          <SummaryCell
            icon={History}
            label={t('Historical Usage')}
            value={formatQuota(Number(user?.used_quota ?? 0))}
          />
          <SummaryCell
            icon={Activity}
            label={t('Request Count')}
            value={formatNumber(Number(user?.request_count ?? 0))}
          />
        </div>
      </CardContent>
    </Card>
  )
}

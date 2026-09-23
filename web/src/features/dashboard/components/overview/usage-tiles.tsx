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
import { Activity, Coins, Cpu, Wallet } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { StatTile } from '@/components/stat-tile'
import { useSelf } from '@/hooks/use-self'
import { formatCompactNumber, formatNumber, formatQuota } from '@/lib/format'
import {
  type CurrencyConfig,
  useSystemConfigStore,
} from '@/stores/system-config-store'

import {
  formatGrowthPercent,
  growthPercent,
  type OverviewUsage,
} from '../../lib/overview-usage'

function formatEstimate(amount: number): string {
  return formatNumber(
    amount < 100 ? Math.round(amount * 100) / 100 : Math.round(amount)
  )
}

/**
 * The balance in the other currency, so a customer paying in yuan can see
 * what a dollar-denominated balance is worth. Only shown when the display
 * currency is one of the two and a real exchange rate is configured.
 */
function balanceEstimate(
  quota: number,
  currency: CurrencyConfig
): string | undefined {
  if (!(currency.usdExchangeRate > 1) || !(currency.quotaPerUnit > 0)) return
  const usd = quota / currency.quotaPerUnit
  if (currency.quotaDisplayType === 'USD') {
    return `≈ ¥${formatEstimate(usd * currency.usdExchangeRate)}`
  }
  if (currency.quotaDisplayType === 'CNY') {
    return `≈ $${formatEstimate(usd)}`
  }
}

function ValueSkeleton() {
  return (
    <span
      aria-hidden='true'
      className='bg-muted inline-block h-7 w-24 animate-pulse rounded-md align-middle'
    />
  )
}

/** Prototype's four headline tiles, on live balance and usage figures. */
export function UsageTiles(props: {
  usage: OverviewUsage | undefined
  loading: boolean
}) {
  const { t } = useTranslation()
  const { user } = useSelf()
  const currency = useSystemConfigStore((state) => state.config.currency)
  const usage = props.usage

  const spendGrowth = usage
    ? growthPercent(usage.todayQuota, usage.yesterdaySameTimeQuota)
    : null
  const requestGrowth = usage
    ? growthPercent(usage.monthRequests, usage.lastMonthSamePeriodRequests)
    : null
  const tokenGrowth = usage
    ? growthPercent(usage.monthTokens, usage.lastMonthSamePeriodTokens)
    : null

  let spendHint: string | undefined
  if (spendGrowth !== null) {
    spendHint = t('{{percent}} vs. yesterday', {
      percent: formatGrowthPercent(spendGrowth),
    })
  } else if (user) {
    spendHint = t('Lifetime: {{value}}', {
      value: formatQuota(Number(user.used_quota ?? 0)),
    })
  }

  let requestHint: string | undefined
  if (requestGrowth !== null) {
    requestHint = t('{{percent}} vs. last month', {
      percent: formatGrowthPercent(requestGrowth),
    })
  } else if (user) {
    requestHint = t('Lifetime: {{value}}', {
      value: formatNumber(Number(user.request_count ?? 0)),
    })
  }

  let tokenHint: string | undefined
  if (tokenGrowth !== null) {
    tokenHint = t('{{percent}} vs. last month', {
      percent: formatGrowthPercent(tokenGrowth),
    })
  } else if (usage && usage.monthRequests > 0) {
    tokenHint = t('Avg. {{value}} / request', {
      value: formatCompactNumber(usage.monthTokens / usage.monthRequests),
    })
  }

  const dataPending = props.loading || !usage

  return (
    <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
      <StatTile
        label={t('Account balance')}
        value={user ? formatQuota(Number(user.quota ?? 0)) : <ValueSkeleton />}
        hint={
          user ? balanceEstimate(Number(user.quota ?? 0), currency) : undefined
        }
        icon={<Wallet />}
      />
      <StatTile
        label={t("Today's spend")}
        value={dataPending ? <ValueSkeleton /> : formatQuota(usage.todayQuota)}
        hint={spendHint}
        icon={<Coins />}
      />
      <StatTile
        label={t('Requests this month')}
        value={
          dataPending ? <ValueSkeleton /> : formatNumber(usage.monthRequests)
        }
        hint={requestHint}
        icon={<Activity />}
      />
      <StatTile
        label={t('Tokens this month')}
        value={
          dataPending ? (
            <ValueSkeleton />
          ) : (
            formatCompactNumber(usage.monthTokens)
          )
        }
        hint={tokenHint}
        icon={<Cpu />}
      />
    </div>
  )
}

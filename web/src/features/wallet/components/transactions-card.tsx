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
import { useQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { getUserLogs } from '@/features/usage-logs/api'
import type { UsageLog } from '@/features/usage-logs/data/schema'
import { formatCurrencyFromUSD } from '@/lib/currency'
import { formatQuota } from '@/lib/format'
import { cn } from '@/lib/utils'

import { getUserBillingHistory } from '../api'
import { WALLET_TRANSACTIONS_QUERY_KEY } from '../constants'
import { getPaymentMethodName } from '../lib/billing'
import {
  mergeTransactions,
  type ConsumeLog,
  type Transaction,
} from '../lib/transactions'

/** Consumption rows are log type 2. */
const LOG_TYPE_CONSUME = 2
/** How many of each kind to fetch, and how many rows to show after merging. */
const FETCH_PER_KIND = 5
const VISIBLE_ROWS = 10

const amountFormat = {
  digitsLarge: 2,
  digitsSmall: 2,
  abbreviate: false,
} as const

function TransactionRow(props: { transaction: Transaction }) {
  const { t } = useTranslation()
  const tx = props.transaction
  const date = dayjs.unix(tx.timestamp).format('YYYY-MM-DD')

  if (tx.kind === 'topup') {
    const method = getPaymentMethodName(tx.paymentMethod, t)
    return (
      <tr className='border-b last:border-0'>
        <td className='px-5 py-3'>
          <Badge variant={tx.status === 'success' ? 'success' : 'warning'}>
            <ArrowDownLeft />
            {tx.status === 'success' ? t('Top-up') : t('Pending')}
          </Badge>
        </td>
        <td className='text-muted-foreground px-5 py-3'>
          {t('{{method}} top-up', { method })}
        </td>
        <td className='text-muted-foreground px-5 py-3 whitespace-nowrap tabular-nums'>
          {date}
        </td>
        <td
          className={cn(
            'px-5 py-3 text-right font-medium whitespace-nowrap tabular-nums',
            tx.status === 'success' ? 'text-success' : 'text-muted-foreground'
          )}
        >
          +{formatCurrencyFromUSD(tx.usd, amountFormat)}
        </td>
      </tr>
    )
  }

  return (
    <tr className='border-b last:border-0'>
      <td className='px-5 py-3'>
        <Badge variant='muted'>
          <ArrowUpRight />
          {t('Spend')}
        </Badge>
      </td>
      <td className='text-muted-foreground px-5 py-3'>
        {t('{{model}} call', { model: tx.model })}
      </td>
      <td className='text-muted-foreground px-5 py-3 whitespace-nowrap tabular-nums'>
        {date}
      </td>
      <td className='px-5 py-3 text-right font-medium whitespace-nowrap tabular-nums'>
        -{formatQuota(tx.quota)}
      </td>
    </tr>
  )
}

/**
 * The prototype's "交易记录" card: the latest top-ups and usage, merged. The
 * full order list (search, paging, admin actions) stays one click away.
 */
export function TransactionsCard(props: { onViewAll: () => void }) {
  const { t } = useTranslation()

  const topupsQuery = useQuery({
    queryKey: [...WALLET_TRANSACTIONS_QUERY_KEY, 'topups'],
    queryFn: () => getUserBillingHistory(1, FETCH_PER_KIND),
    staleTime: 30_000,
  })
  const consumesQuery = useQuery({
    queryKey: [...WALLET_TRANSACTIONS_QUERY_KEY, 'consumes'],
    queryFn: () =>
      getUserLogs({ p: 1, page_size: FETCH_PER_KIND, type: LOG_TYPE_CONSUME }),
    staleTime: 30_000,
  })

  const rows = useMemo(() => {
    const consumes = (consumesQuery.data?.data?.items ?? []) as UsageLog[]
    const consumeLogs: ConsumeLog[] = consumes.map((log) => ({
      id: log.id,
      created_at: log.created_at,
      model_name: log.model_name,
      quota: log.quota,
    }))
    return mergeTransactions(
      topupsQuery.data?.data?.items ?? [],
      consumeLogs,
      VISIBLE_ROWS
    )
  }, [topupsQuery.data, consumesQuery.data])

  const loading = topupsQuery.isLoading || consumesQuery.isLoading

  let body
  if (loading) {
    body = (
      <div className='space-y-3 px-5 py-4'>
        {['a', 'b', 'c'].map((key) => (
          <Skeleton key={key} className='h-5 w-full' />
        ))}
      </div>
    )
  } else if (rows.length === 0) {
    body = (
      <p className='text-muted-foreground px-5 py-10 text-center text-sm'>
        {t('No transactions yet')}
      </p>
    )
  } else {
    body = (
      <div className='overflow-x-auto'>
        <table className='w-full text-sm'>
          <thead>
            <tr className='bg-muted/40 text-muted-foreground border-b text-left text-xs'>
              <th className='px-5 py-3 font-medium'>{t('Type')}</th>
              <th className='px-5 py-3 font-medium'>{t('Name')}</th>
              <th className='px-5 py-3 font-medium'>{t('Date')}</th>
              <th className='px-5 py-3 text-right font-medium'>
                {t('Amount')}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((transaction) => (
              <TransactionRow key={transaction.id} transaction={transaction} />
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <Card className='gap-0 overflow-hidden py-0'>
      <div className='flex items-center justify-between gap-3 border-b px-5 py-4'>
        <CardTitle className='text-sm'>{t('Transaction history')}</CardTitle>
        <Button variant='outline' size='sm' onClick={props.onViewAll}>
          {t('All orders')}
        </Button>
      </div>
      {body}
    </Card>
  )
}

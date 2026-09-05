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
/**
 * Refer and earn.
 *
 * The wallet page already carries a small referral card; this is the full page
 * from the prototype: the code and link, the four headline figures, and the
 * per-invitee record list that the card has no room for.
 */

import { useQuery } from '@tanstack/react-query'
import { Check, Copy, Users } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAffiliate } from '@/features/wallet/hooks/use-affiliate'
import { useAuthStore } from '@/stores/auth-store'
import { formatQuota } from '@/lib/format'

import { getAffRecords } from './api'
import { AffRecordsTable } from './components/aff-records-table'

export function Invite() {
  const { t } = useTranslation()
  const user = useAuthStore((s) => s.auth.user)
  const [copied, setCopied] = useState(false)
  const { affiliateCode, affiliateLink, copyAffiliateLink } = useAffiliate()

  const recordsQuery = useQuery({
    queryKey: ['aff-records'],
    queryFn: () => getAffRecords(100, 0),
    staleTime: 60 * 1000,
  })
  const records = recordsQuery.data?.data?.items ?? []

  // Derived from the list rather than a separate endpoint, so the headline
  // figure and the table below it can never disagree.
  const toppedUpCount = records.filter((record) => record.topped_up).length

  const stats = [
    {
      label: t('Total invited'),
      value: String(recordsQuery.data?.data?.total ?? 0),
    },
    { label: t('Topped up'), value: String(toppedUpCount) },
    {
      label: t('Total reward'),
      value: formatQuota(Number(user?.aff_history_quota ?? 0)),
    },
    {
      label: t('Withdrawable'),
      value: formatQuota(Number(user?.aff_quota ?? 0)),
    },
  ]

  function handleCopy() {
    copyAffiliateLink()
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className='space-y-6'>
      <div>
        <h2 className='text-2xl font-semibold tracking-tight'>
          {t('Refer & earn')}
        </h2>
        <p className='text-muted-foreground mt-1'>
          {t(
            'Invite friends to sign up and top up, and you earn a share of what they spend.'
          )}
        </p>
      </div>

      <div className='grid gap-4 lg:grid-cols-3'>
        <Card className='lg:col-span-2'>
          <CardHeader>
            <CardTitle className='text-sm'>{t('Your invite link')}</CardTitle>
          </CardHeader>
          <CardContent className='space-y-3'>
            <div className='bg-muted/40 flex items-center justify-between gap-3 rounded-lg border px-3 py-2'>
              <code className='truncate font-mono text-sm'>
                {affiliateLink || '—'}
              </code>
              <Button
                variant='ghost'
                size='sm'
                onClick={handleCopy}
                disabled={!affiliateLink}
              >
                {copied ? (
                  <Check className='text-success size-4' />
                ) : (
                  <Copy className='size-4' />
                )}
                {copied ? t('Copied') : t('Copy')}
              </Button>
            </div>
            <p className='text-muted-foreground text-sm'>
              {t('Your invite code')}:{' '}
              <span className='text-foreground font-mono font-medium'>
                {affiliateCode || '—'}
              </span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className='text-sm'>{t('How it works')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className='text-muted-foreground text-sm leading-relaxed'>
              {t(
                'When someone signs up through your link and tops up, a share of that top-up is added to your referral balance. Withdraw it to your main balance from the wallet page.'
              )}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className='p-5'>
              <p className='text-muted-foreground text-sm'>{stat.label}</p>
              <p className='mt-1 text-2xl font-bold tracking-tight tabular-nums'>
                {stat.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className='overflow-hidden p-0'>
        <div className='flex items-center gap-2 border-b px-5 py-4'>
          <Users className='text-muted-foreground size-4' aria-hidden='true' />
          <CardTitle className='text-sm'>{t('Referral records')}</CardTitle>
          {records.length > 0 && (
            <Badge variant='ghost' className='ml-auto'>
              {records.length}
            </Badge>
          )}
        </div>
        <AffRecordsTable
          records={records}
          isLoading={recordsQuery.isLoading}
          isError={recordsQuery.isError}
        />
      </Card>
    </div>
  )
}

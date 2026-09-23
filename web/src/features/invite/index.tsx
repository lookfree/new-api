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
 * Mirrors the prototype's page: the invite code and link, the rule, four
 * headline figures, and the per-invitee records with the withdraw action. The
 * figures and the withdraw action are backed by the live affiliate endpoints.
 */

import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Check,
  Copy,
  Gift,
  Share2,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { ConsolePageHeader } from '@/components/layout'
import { StatTile } from '@/components/stat-tile'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TransferDialog } from '@/features/wallet/components/dialogs/transfer-dialog'
import { useAffiliate } from '@/features/wallet/hooks/use-affiliate'
import { SELF_QUERY_KEY, useSelf } from '@/hooks/use-self'
import { useStatus } from '@/hooks/use-status'
import { formatQuota } from '@/lib/format'

import { getAffRecords } from './api'
import { AffRecordsTable } from './components/aff-records-table'

function formatRatePercent(rate: number): string {
  return String(Math.round(rate * 10000) / 100)
}

export function Invite() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { status } = useStatus()
  const { user } = useSelf()
  const [copied, setCopied] = useState<'code' | 'link' | null>(null)
  const [transferOpen, setTransferOpen] = useState(false)
  const { affiliateCode, affiliateLink, transferQuota, transferring } =
    useAffiliate()

  const recordsQuery = useQuery({
    queryKey: ['aff-records'],
    queryFn: () => getAffRecords(100, 0),
    staleTime: 60 * 1000,
  })
  const records = recordsQuery.data?.data?.items ?? []

  // Derived from the list rather than a separate endpoint, so the headline
  // figure and the table below it can never disagree.
  const toppedUpCount = records.filter((record) => record.topped_up).length
  const withdrawableQuota = Number(user?.aff_quota ?? 0)

  const rewardActive = status?.aff_reward_active === true
  const rewardRate = Number(status?.aff_reward_rate ?? 0)
  const firstTopupOnly = status?.aff_reward_first_topup_only !== false

  let ruleText = t('The referral reward is not open right now.')
  if (rewardActive) {
    ruleText = t(
      firstTopupOnly
        ? 'Once an invitee signs up through your link and completes their first top-up, you earn {{rate}}% of that top-up.'
        : 'Once an invitee signs up through your link, you earn {{rate}}% of each of their top-ups.',
      { rate: formatRatePercent(rewardRate) }
    )
  }

  async function copy(value: string, which: 'code' | 'link') {
    if (!value) return
    try {
      await navigator.clipboard.writeText(value)
    } catch {
      toast.error(t('Copy failed'))
      return
    }
    setCopied(which)
    toast.success(t('Copied'))
    setTimeout(() => setCopied(null), 1500)
  }

  async function share() {
    if (!affiliateLink) return
    if (navigator.share) {
      try {
        await navigator.share({ title: t('Refer & earn'), url: affiliateLink })
        return
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return
      }
    }
    await copy(affiliateLink, 'link')
  }

  async function handleTransfer(quota: number): Promise<boolean> {
    const ok = await transferQuota(quota)
    if (ok) {
      await queryClient.invalidateQueries({ queryKey: SELF_QUERY_KEY })
    }
    return ok
  }

  return (
    <div className='space-y-6'>
      <ConsolePageHeader
        title={t('Invite & earn rewards')}
        description={t(
          'Invite friends to sign up and top up, and you earn a share of what they spend.'
        )}
      />

      <Card>
        <CardHeader className='flex items-center justify-between'>
          <CardTitle className='flex items-center gap-2'>
            <Gift className='text-primary size-4' aria-hidden='true' />
            {t('Your invite code')}
          </CardTitle>
          {affiliateCode && (
            <Badge variant='brand' className='font-mono text-sm'>
              {affiliateCode}
            </Badge>
          )}
        </CardHeader>
        <CardContent className='space-y-4'>
          <div>
            <label
              htmlFor='invite-code'
              className='mb-1.5 block text-sm font-medium'
            >
              {t('Your invite code')}
            </label>
            <div className='flex gap-2'>
              <input
                id='invite-code'
                readOnly
                value={affiliateCode}
                className='bg-muted/40 h-10 flex-1 rounded-lg border px-3 font-mono text-sm outline-none'
              />
              <Button
                variant='outline'
                className='shrink-0'
                onClick={() => copy(affiliateCode, 'code')}
                disabled={!affiliateCode}
              >
                {copied === 'code' ? (
                  <Check className='text-success' />
                ) : (
                  <Copy />
                )}
                {t('Copy')}
              </Button>
            </div>
          </div>
          <div>
            <label
              htmlFor='invite-link'
              className='mb-1.5 block text-sm font-medium'
            >
              {t('Your invite link')}
            </label>
            <div className='flex gap-2'>
              <input
                id='invite-link'
                readOnly
                value={affiliateLink}
                className='bg-muted/40 h-10 min-w-0 flex-1 rounded-lg border px-3 text-sm outline-none'
              />
              <Button
                variant='outline'
                className='shrink-0'
                onClick={() => copy(affiliateLink, 'link')}
                disabled={!affiliateLink}
              >
                {copied === 'link' ? (
                  <Check className='text-success' />
                ) : (
                  <Copy />
                )}
                {t('Copy')}
              </Button>
              <Button
                className='shrink-0'
                onClick={share}
                disabled={!affiliateLink}
              >
                <Share2 />
                {t('Share link')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('How it works')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className='text-muted-foreground text-sm leading-relaxed'>
            {ruleText}
          </p>
        </CardContent>
      </Card>

      <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
        <StatTile
          label={t('Total invited')}
          value={String(recordsQuery.data?.data?.total ?? 0)}
          icon={<Users />}
        />
        <StatTile
          label={t('Topped up')}
          value={String(toppedUpCount)}
          icon={<TrendingUp />}
        />
        <StatTile
          label={t('Total reward')}
          value={formatQuota(Number(user?.aff_history_quota ?? 0))}
          icon={<Gift />}
        />
        <StatTile
          label={t('Withdrawable')}
          value={formatQuota(withdrawableQuota)}
          icon={<Wallet />}
        />
      </div>

      <Card>
        <CardHeader className='flex items-center justify-between'>
          <CardTitle>{t('Referral records')}</CardTitle>
          <Button
            size='sm'
            onClick={() => setTransferOpen(true)}
            disabled={withdrawableQuota <= 0}
          >
            <Wallet />
            {t('Withdraw to balance')}
          </Button>
        </CardHeader>
        <CardContent className='p-0'>
          <AffRecordsTable
            records={records}
            isLoading={recordsQuery.isLoading}
            isError={recordsQuery.isError}
          />
        </CardContent>
      </Card>

      <TransferDialog
        open={transferOpen}
        onOpenChange={setTransferOpen}
        onConfirm={handleTransfer}
        availableQuota={withdrawableQuota}
        transferring={transferring}
      />
    </div>
  )
}

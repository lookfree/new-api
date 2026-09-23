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
import { ExternalLink, Loader2, Wallet } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { useStatus } from '@/hooks/use-status'
import { useSystemConfig } from '@/hooks/use-system-config'
import { formatNumber, formatQuota } from '@/lib/format'

import { estimateLocalAmount } from '../lib/format'

interface BalanceCardProps {
  className?: string
  /** Current balance in quota units; undefined until it has loaded */
  quota: number | undefined
  redemptionEnabled: boolean
  redemptionCode: string
  onRedemptionCodeChange: (code: string) => void
  onRedeem: () => void
  redeeming: boolean
  topupLink?: string
}

/**
 * The prototype's "当前余额" card. Where the prototype has an auto top-up box
 * (no backend for it here), this card carries the redemption-code entry.
 */
export function BalanceCard(props: BalanceCardProps) {
  const { t } = useTranslation()
  const { status } = useStatus()
  const { currency } = useSystemConfig()

  // A yuan estimate only helps when the balance is shown in dollars.
  const localEstimate =
    props.quota !== undefined && currency.quotaDisplayType === 'USD'
      ? estimateLocalAmount(
          props.quota,
          currency.quotaPerUnit,
          Number(status?.price)
        )
      : null

  return (
    <Card className={props.className}>
      <CardHeader>
        <CardTitle className='text-sm'>{t('Current Balance')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className='flex items-center gap-3'>
          <span
            aria-hidden='true'
            className='bg-primary/10 text-primary flex size-11 shrink-0 items-center justify-center rounded-lg'
          >
            <Wallet className='size-5' />
          </span>
          <div className='min-w-0'>
            {props.quota === undefined ? (
              <Skeleton className='h-9 w-32' />
            ) : (
              <p className='text-primary text-3xl font-bold tabular-nums'>
                {formatQuota(props.quota)}
              </p>
            )}
            {localEstimate !== null && (
              <p className='text-muted-foreground text-xs'>
                ≈ ¥{formatNumber(Math.round(localEstimate))}
              </p>
            )}
          </div>
        </div>

        <div className='mt-5 rounded-lg border p-3'>
          <p className='text-sm font-medium'>{t('Redeem code')}</p>
          {props.redemptionEnabled ? (
            <>
              <div className='mt-2 flex gap-2'>
                <Input
                  id='redemption-code'
                  value={props.redemptionCode}
                  onChange={(event) =>
                    props.onRedemptionCodeChange(event.target.value)
                  }
                  placeholder={t('Enter your redemption code')}
                  aria-label={t('Redeem code')}
                  className='h-9 min-w-0'
                />
                <Button
                  variant='outline'
                  className='h-9 shrink-0'
                  onClick={props.onRedeem}
                  disabled={props.redeeming || !props.redemptionCode}
                >
                  {props.redeeming && <Loader2 className='animate-spin' />}
                  {t('Redeem')}
                </Button>
              </div>
              {props.topupLink && (
                <p className='text-muted-foreground mt-2 text-xs'>
                  {t('Need a redemption code?')}{' '}
                  <a
                    href={props.topupLink}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='inline-flex items-center gap-1 underline-offset-4 hover:underline'
                  >
                    {t('Get one here')}
                    <ExternalLink className='size-3' />
                  </a>
                </p>
              )}
            </>
          ) : (
            <p className='text-muted-foreground mt-0.5 text-xs leading-relaxed'>
              {t(
                'Redemption codes are disabled until the administrator confirms compliance terms.'
              )}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

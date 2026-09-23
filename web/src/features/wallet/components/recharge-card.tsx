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
import { Loader2 } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrencyFromUSD } from '@/lib/currency'
import { cn } from '@/lib/utils'

import {
  formatCurrency,
  getDiscountPercentOff,
  getMinTopupAmount,
} from '../lib'
import { getPaymentCurrencySymbol, type PayOption } from '../lib/pay-options'
import type { PresetAmount, TopupInfo } from '../types'
import { PayMethodPicker } from './pay-method-picker'

interface RechargeCardProps {
  className?: string
  topupInfo: TopupInfo | null
  loading: boolean
  /** Whether at least one gateway (or Creem product list) is switched on */
  hasAnyTopup: boolean
  /** Whether the amount can be typed or picked (everything except Creem) */
  hasConfigurableTopup: boolean
  presetAmounts: PresetAmount[]
  selectedPreset: number | null
  onSelectPreset: (preset: PresetAmount) => void
  topupAmount: number
  onTopupAmountChange: (amount: number) => void
  paymentAmount: number
  calculating: boolean
  payOptions: PayOption[]
  selectedOption: PayOption | undefined
  onSelectOption: (key: string) => void
  onCheckout: () => void
  checkingOut: boolean
  /** Extra gateways rendered under the note (Creem products, Alipay/WeChat) */
  children?: ReactNode
}

const amountFormat = {
  digitsLarge: 0,
  digitsSmall: 2,
  abbreviate: false,
} as const

/**
 * The prototype's "充值" card: amount presets, one primary button and a short
 * note. A custom amount, the amount to pay and a method picker are added on
 * top, but only where the customer needs them.
 */
export function RechargeCard(props: RechargeCardProps) {
  const { t } = useTranslation()
  const [localAmount, setLocalAmount] = useState(props.topupAmount.toString())

  useEffect(() => {
    // An empty field must survive, otherwise it could never be cleared.
    setLocalAmount((prev) =>
      prev === '' && props.topupAmount === 0
        ? prev
        : props.topupAmount.toString()
    )
  }, [props.topupAmount])

  function handleAmountChange(value: string) {
    setLocalAmount(value)
    const parsed = Number.parseInt(value, 10) || 0
    if (parsed >= 0) props.onTopupAmountChange(parsed)
  }

  const minTopup = props.selectedOption
    ? props.selectedOption.minTopup
    : getMinTopupAmount(props.topupInfo)
  const canCheckout =
    Boolean(props.selectedOption) &&
    props.topupAmount > 0 &&
    props.topupAmount >= minTopup &&
    !props.checkingOut

  if (props.loading) {
    return (
      <Card className={props.className}>
        <CardHeader>
          <Skeleton className='h-4 w-12' />
        </CardHeader>
        <CardContent className='space-y-4'>
          <Skeleton className='h-4 w-20' />
          <div className='grid grid-cols-4 gap-2'>
            {['a', 'b', 'c', 'd'].map((key) => (
              <Skeleton key={key} className='h-11 rounded-lg' />
            ))}
          </div>
          <Skeleton className='h-9 w-full' />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={props.className}>
      <CardHeader>
        <CardTitle className='text-sm'>{t('Top-up')}</CardTitle>
      </CardHeader>
      <CardContent>
        {props.hasConfigurableTopup && (
          <>
            <p className='text-muted-foreground text-sm'>
              {t('Top-up amount')}
            </p>
            {props.presetAmounts.length > 0 && (
              <div className='mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4'>
                {props.presetAmounts.map((preset) => {
                  const percentOff = getDiscountPercentOff(
                    preset.discount ??
                      props.topupInfo?.discount?.[preset.value] ??
                      1
                  )
                  return (
                    <button
                      key={preset.value}
                      type='button'
                      aria-pressed={props.selectedPreset === preset.value}
                      onClick={() => props.onSelectPreset(preset)}
                      className={cn(
                        'rounded-lg border py-3 text-center text-sm font-semibold tabular-nums transition-colors',
                        props.selectedPreset === preset.value
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'hover:bg-muted'
                      )}
                    >
                      {formatCurrencyFromUSD(preset.value, amountFormat)}
                      {percentOff > 0 && (
                        <span className='text-success ml-1.5 text-[10px] font-medium'>
                          {t('{{percent}}% off', { percent: percentOff })}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            )}

            <div className='mt-3 flex items-center justify-between gap-3'>
              <Input
                id='topup-amount'
                type='number'
                inputMode='numeric'
                min={minTopup}
                value={localAmount}
                onChange={(event) => handleAmountChange(event.target.value)}
                placeholder={t('Custom amount, at least {{min}}', {
                  min: minTopup,
                })}
                aria-label={t('Custom Amount')}
                className='h-9 w-44'
              />
              <div className='flex items-baseline gap-2 text-sm'>
                <span className='text-muted-foreground'>
                  {t('Amount to pay:')}
                </span>
                {props.calculating ? (
                  <Skeleton className='h-5 w-16' />
                ) : (
                  <span className='font-semibold tabular-nums'>
                    {getPaymentCurrencySymbol(
                      props.selectedOption?.method.type ?? ''
                    )}
                    {formatCurrency(props.paymentAmount)}
                  </span>
                )}
              </div>
            </div>

            {props.payOptions.length > 1 && (
              <div className='mt-4'>
                <PayMethodPicker
                  options={props.payOptions}
                  selectedKey={props.selectedOption?.key ?? null}
                  topupAmount={props.topupAmount}
                  onSelect={props.onSelectOption}
                />
              </div>
            )}

            {props.payOptions.length === 0 && (
              <Alert className='mt-4'>
                <AlertDescription>
                  {t(
                    'No payment methods available. Please contact administrator.'
                  )}
                </AlertDescription>
              </Alert>
            )}

            <Button
              className='mt-4 w-full'
              size='lg'
              onClick={props.onCheckout}
              disabled={!canCheckout}
            >
              {props.checkingOut && <Loader2 className='animate-spin' />}
              {t('Top up now')} ·{' '}
              {formatCurrencyFromUSD(props.topupAmount, amountFormat)}
            </Button>
            <p className='text-muted-foreground mt-3 text-center text-xs'>
              {t(
                'Pay with Alipay, WeChat Pay or bank card. Balance never expires.'
              )}
            </p>
          </>
        )}

        {!props.hasAnyTopup && (
          <Alert>
            <AlertDescription>
              {t(
                'Online topup is not enabled. Please use redemption code or contact administrator.'
              )}
            </AlertDescription>
          </Alert>
        )}

        {props.children}
      </CardContent>
    </Card>
  )
}

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

import { cn } from '@/lib/utils'

import { getPaymentIcon } from '../lib'
import { getPayMethodLabel, type PayOption } from '../lib/pay-options'

/**
 * Choose between several ways to pay. The recharge card renders it only when
 * there is more than one, so a customer with a single gateway (Airwallex,
 * which lets them pick card, Alipay or WeChat Pay on its own page) sees the
 * plain prototype layout.
 */
export function PayMethodPicker(props: {
  options: PayOption[]
  selectedKey: string | null
  topupAmount: number
  onSelect: (key: string) => void
}) {
  const { t } = useTranslation()

  return (
    <div
      role='group'
      aria-label={t('Payment Method')}
      className='flex flex-wrap gap-2'
    >
      {props.options.map((option) => {
        const belowMinimum = option.minTopup > props.topupAmount
        const selected = option.key === props.selectedKey
        const label = getPayMethodLabel(option.method, t)
        return (
          <button
            key={option.key}
            type='button'
            aria-pressed={selected}
            disabled={belowMinimum}
            title={
              belowMinimum
                ? t('Minimum topup amount: {{amount}}', {
                    amount: option.minTopup,
                  })
                : undefined
            }
            onClick={() => props.onSelect(option.key)}
            className={cn(
              'inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
              'disabled:cursor-not-allowed disabled:opacity-50',
              selected
                ? 'border-primary bg-primary/10 text-primary'
                : 'hover:bg-muted'
            )}
          >
            {getPaymentIcon(
              option.method.type,
              'size-4',
              option.method.icon,
              label
            )}
            {label}
          </button>
        )
      })}
    </div>
  )
}

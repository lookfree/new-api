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
import { ArrowUpRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { DEFAULT_TOKEN_UNIT } from '@/features/pricing/constants'
import { parseTags } from '@/features/pricing/lib/filters'
import { isTokenBasedModel } from '@/features/pricing/lib/model-helpers'
import { formatPrice, formatRequestPrice } from '@/features/pricing/lib/price'
import type { PricingModel } from '@/features/pricing/types'
import { getLobeIcon } from '@/lib/lobe-icon'
import { cn } from '@/lib/utils'

import { formatContextLength } from '../lib/format'

export function HomeModelCard(props: {
  model: PricingModel
  priceRate: number
  usdExchangeRate: number
}) {
  const { t } = useTranslation()
  const model = props.model
  const iconKey = model.icon || model.vendor_icon
  const icon = iconKey ? getLobeIcon(iconKey, 20) : null
  const initial = model.model_name?.charAt(0).toUpperCase() || '?'
  const tags = parseTags(model.tags).slice(0, 3)
  const isTokenBased = isTokenBasedModel(model)
  const hasContext = Boolean(model.context_length && model.context_length > 0)

  return (
    <Link
      to='/pricing'
      search={{ search: model.model_name }}
      className='bg-card text-card-foreground hover:border-primary/40 group flex flex-col rounded-lg border p-5 shadow-sm transition-colors'
    >
      <div className='flex items-center gap-3'>
        <span className='bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-lg font-mono text-sm font-semibold'>
          {icon || initial}
        </span>
        <div className='min-w-0'>
          <h3 className='truncate leading-tight font-medium'>
            {model.model_name}
          </h3>
          <p className='text-muted-foreground truncate text-xs'>
            {model.vendor_name || '-'}
          </p>
        </div>
      </div>

      {tags.length > 0 && (
        <div className='mt-4 flex flex-wrap gap-1.5'>
          {tags.map((tag) => (
            <span
              key={tag}
              className='bg-muted text-muted-foreground rounded-md border border-transparent px-2 py-0.5 text-xs font-medium'
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      <dl
        className={cn(
          'mt-4 grid gap-2 border-t pt-4 text-xs',
          hasContext ? 'grid-cols-3' : 'grid-cols-2'
        )}
      >
        {hasContext && (
          <div>
            <dt className='text-muted-foreground'>{t('Context')}</dt>
            <dd className='mt-0.5 font-medium tabular-nums'>
              {formatContextLength(model.context_length)}
            </dd>
          </div>
        )}
        {isTokenBased ? (
          <>
            <div>
              <dt className='text-muted-foreground'>{t('Input')}</dt>
              <dd className='text-primary mt-0.5 font-medium tabular-nums'>
                {formatPrice(
                  model,
                  'input',
                  DEFAULT_TOKEN_UNIT,
                  false,
                  props.priceRate,
                  props.usdExchangeRate
                )}
              </dd>
            </div>
            <div>
              <dt className='text-muted-foreground'>{t('Output')}</dt>
              <dd className='text-primary mt-0.5 font-medium tabular-nums'>
                {formatPrice(
                  model,
                  'output',
                  DEFAULT_TOKEN_UNIT,
                  false,
                  props.priceRate,
                  props.usdExchangeRate
                )}
              </dd>
            </div>
          </>
        ) : (
          <div className='col-span-2'>
            <dt className='text-muted-foreground'>{t('Per request')}</dt>
            <dd className='text-primary mt-0.5 font-medium tabular-nums'>
              {formatRequestPrice(
                model,
                false,
                props.priceRate,
                props.usdExchangeRate
              )}
            </dd>
          </div>
        )}
      </dl>

      <div className='mt-4 flex items-center justify-between gap-2'>
        <span className='text-muted-foreground text-[11px]'>
          {isTokenBased ? t('/ 1M tokens') : t('/ request')}
        </span>
        <span className='group-hover:bg-muted inline-flex h-7 items-center gap-1 rounded-md border px-2.5 text-[0.8rem] font-medium transition-colors'>
          {t('Try it')}
          <ArrowUpRight className='size-3.5' aria-hidden='true' />
        </span>
      </div>
    </Link>
  )
}

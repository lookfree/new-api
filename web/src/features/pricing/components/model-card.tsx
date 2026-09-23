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
import { ArrowUpRight } from 'lucide-react'
import { memo, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { formatContextLength } from '@/features/home/lib/format'
import { getLobeIcon } from '@/lib/lobe-icon'
import { cn } from '@/lib/utils'

import { DEFAULT_TOKEN_UNIT } from '../constants'
import {
  getCardExamplePrice,
  getDynamicDisplayGroupRatio,
  getDynamicPriceUnitLabelKey,
  getDynamicPricingSummary,
  isUnconfiguredTaskUsageModel,
} from '../lib/dynamic-price'
import { parseTags } from '../lib/filters'
import { isTokenBasedModel } from '../lib/model-helpers'
import { formatPrice, formatRequestPrice } from '../lib/price'
import { getTaskNumberFields } from '../lib/task-expr'
import type { PricingModel, TokenUnit } from '../types'

export interface ModelCardProps {
  model: PricingModel
  onClick: () => void
  /** Opens the details on the try panel; falls back to `onClick`. */
  onTry?: () => void
  priceRate?: number
  usdExchangeRate?: number
  tokenUnit?: TokenUnit
  showRechargePrice?: boolean
  selectedGroup?: string
}

export const ModelCard = memo(function ModelCard(props: ModelCardProps) {
  const { t } = useTranslation()
  const tokenUnit = props.tokenUnit ?? DEFAULT_TOKEN_UNIT
  const priceRate = props.priceRate ?? 1
  const usdExchangeRate = props.usdExchangeRate ?? 1
  const showRechargePrice = props.showRechargePrice ?? false
  const isTokenBased = isTokenBasedModel(props.model)
  const tags = parseTags(props.model.tags)
  const modelIconKey = props.model.icon || props.model.vendor_icon
  const modelIcon = modelIconKey ? getLobeIcon(modelIconKey, 28) : null
  const initial = props.model.model_name?.charAt(0).toUpperCase() || '?'
  const isDynamicPricing =
    props.model.billing_mode === 'tiered_expr' &&
    Boolean(props.model.billing_expr)
  const isUnconfiguredTaskUsage = isUnconfiguredTaskUsageModel(props.model)
  const hasCachedPrice = isTokenBased && props.model.cache_ratio != null
  const dynamicPriceOptions = {
    tokenUnit,
    showRechargePrice,
    priceRate,
    usdExchangeRate,
    groupRatioMultiplier: getDynamicDisplayGroupRatio(
      props.model,
      props.selectedGroup
    ),
  }
  const dynamicSummary = isDynamicPricing
    ? getDynamicPricingSummary(props.model, dynamicPriceOptions)
    : null
  const cardExamplePrice = getCardExamplePrice(props.model, dynamicPriceOptions)
  const showTaskFieldLabels =
    getTaskNumberFields(props.model.billing_usage_schema).length > 1

  let priceSummary: ReactNode
  if (dynamicSummary) {
    if (dynamicSummary.isSpecialExpression) {
      priceSummary = (
        <span className='min-w-0'>
          <span className='text-amber-700 dark:text-amber-300'>
            {t('Special billing expression')}
          </span>
          <code className='text-muted-foreground/70 mt-0.5 line-clamp-1 block font-mono text-[11px] break-all'>
            {dynamicSummary.rawExpression}
          </code>
        </span>
      )
    } else if (dynamicSummary.primaryEntries.length > 0) {
      priceSummary = (
        <>
          {dynamicSummary.primaryEntries.map((entry) => {
            const unitLabelKey = getDynamicPriceUnitLabelKey(entry)
            let fieldPrefix: ReactNode = null
            if (entry.labelKind !== 'schema') {
              fieldPrefix = <>{t(entry.shortLabel)} </>
            } else if (showTaskFieldLabels) {
              fieldPrefix = (
                <>
                  <code className='font-mono text-[11px]'>
                    {entry.shortLabel}
                  </code>{' '}
                </>
              )
            }
            return (
              <span
                key={entry.key}
                className='text-muted-foreground whitespace-nowrap'
              >
                {fieldPrefix}
                <span className='text-foreground font-mono font-semibold'>
                  {entry.formattedRange ?? entry.formatted}
                  {unitLabelKey && <>/{t(unitLabelKey)}</>}
                </span>
              </span>
            )
          })}
          {cardExamplePrice && (
            <span className='text-muted-foreground/70 max-w-full min-w-0 truncate text-xs'>
              {cardExamplePrice.label} ≈ {cardExamplePrice.formatted}
            </span>
          )}
          {dynamicSummary.isTaskUsage &&
            dynamicSummary.tier?.label &&
            !dynamicSummary.primaryEntries.some(
              (entry) => entry.formattedRange
            ) && (
              <span className='text-muted-foreground text-xs'>
                ({dynamicSummary.tier.label})
              </span>
            )}
        </>
      )
    } else {
      priceSummary = (
        <span className='text-muted-foreground text-sm'>
          {t('Dynamic Pricing')}
        </span>
      )
    }
  } else if (isUnconfiguredTaskUsage) {
    priceSummary = (
      <span className='text-muted-foreground text-sm'>
        {t('Usage-based billing · price not configured')}
      </span>
    )
  } else if (!isTokenBased) {
    priceSummary = (
      <span className='text-muted-foreground whitespace-nowrap'>
        <span className='text-foreground font-mono font-semibold'>
          {formatRequestPrice(
            props.model,
            showRechargePrice,
            priceRate,
            usdExchangeRate,
            props.selectedGroup
          )}
        </span>{' '}
        / {t('request')}
      </span>
    )
  }

  const priceCells: { label: string; value: string; isPrice: boolean }[] = []
  if (props.model.context_length) {
    priceCells.push({
      label: t('Context'),
      value: formatContextLength(props.model.context_length),
      isPrice: false,
    })
  }
  const showPriceCells =
    isTokenBased && !dynamicSummary && !isUnconfiguredTaskUsage
  if (showPriceCells) {
    priceCells.push(
      {
        label: t('Input'),
        value: formatPrice(
          props.model,
          'input',
          tokenUnit,
          showRechargePrice,
          priceRate,
          usdExchangeRate,
          props.selectedGroup
        ),
        isPrice: true,
      },
      {
        label: t('Output'),
        value: formatPrice(
          props.model,
          'output',
          tokenUnit,
          showRechargePrice,
          priceRate,
          usdExchangeRate,
          props.selectedGroup
        ),
        isPrice: true,
      }
    )
    if (hasCachedPrice && priceCells.length < 3) {
      priceCells.push({
        label: t('Cached'),
        value: formatPrice(
          props.model,
          'cache',
          tokenUnit,
          showRechargePrice,
          priceRate,
          usdExchangeRate,
          props.selectedGroup
        ),
        isPrice: true,
      })
    }
  }

  return (
    <div
      onClick={props.onClick}
      className='group bg-card text-card-foreground hover:border-primary/40 flex cursor-pointer flex-col rounded-xl border p-5 shadow-xs transition-colors'
    >
      <div className='flex items-center gap-3'>
        <span className='bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-lg font-mono text-sm font-semibold'>
          {modelIcon || initial}
        </span>
        <div className='min-w-0'>
          <h3 className='truncate leading-tight font-medium'>
            {props.model.model_name}
          </h3>
          {props.model.vendor_name && (
            <p className='text-muted-foreground truncate text-xs'>
              {props.model.vendor_name}
            </p>
          )}
        </div>
      </div>

      {tags.length > 0 && (
        <div className='mt-4 flex flex-wrap gap-1.5'>
          {tags.slice(0, 4).map((tag) => (
            <span
              key={tag}
              className='bg-muted text-muted-foreground rounded-md px-2 py-0.5 text-xs font-medium'
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {showPriceCells ? (
        <dl className='mt-4 grid grid-cols-3 gap-2 border-t pt-4 text-xs'>
          {priceCells.map((cell) => (
            <div key={cell.label}>
              <dt className='text-muted-foreground'>{cell.label}</dt>
              <dd
                className={cn(
                  'mt-0.5 font-medium tabular-nums',
                  cell.isPrice && 'text-primary'
                )}
              >
                {cell.value}
              </dd>
            </div>
          ))}
        </dl>
      ) : (
        <div className='mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-0.5 border-t pt-4 text-sm'>
          {priceSummary}
        </div>
      )}

      <div className='mt-auto flex items-center justify-between gap-2 pt-4'>
        <span className='text-muted-foreground text-[11px]'>
          {showPriceCells &&
            t(tokenUnit === 'K' ? '/ 1K tokens' : '/ 1M tokens')}
        </span>
        <Button
          variant='outline'
          size='sm'
          onClick={(e) => {
            e.stopPropagation()
            ;(props.onTry ?? props.onClick)()
          }}
        >
          {t('Try')}
          <ArrowUpRight />
        </Button>
      </div>
    </div>
  )
})

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
 * Pricing table preview on the home page.
 *
 * Lists the cheapest models by input price so the headline claim on this page
 * is backed by real, current numbers rather than a marketing figure. Prices go
 * through the same formatter as the model square, so the two never disagree.
 */

import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { Card } from '@/components/ui/card'
import { DEFAULT_TOKEN_UNIT } from '@/features/pricing/constants'
import { usePricingData } from '@/features/pricing/hooks/use-pricing-data'
import { formatPrice } from '@/features/pricing/lib/price'
import {
  resolveModelZone,
  ZONE_DOMESTIC,
  ZONE_INTERNATIONAL,
} from '@/features/pricing/lib/zones'
import { getCurrencyLabel } from '@/lib/currency'
import { cn } from '@/lib/utils'

import { formatContextLength, padPriceDecimals } from '../../lib/format'

/** Rows in the preview table. */
const FEATURED_COUNT = 8

export function PricingPreview() {
  const { t } = useTranslation()
  const { models, vendorZones, priceRate, usdExchangeRate, isLoading } =
    usePricingData()

  const featured = useMemo(() => {
    const list = [...(models || [])]
    list.sort((a, b) => {
      const left = a.model_ratio ?? Number.POSITIVE_INFINITY
      const right = b.model_ratio ?? Number.POSITIVE_INFINITY
      if (left !== right) return left - right
      return (a.model_name || '').localeCompare(b.model_name || '')
    })
    return list.slice(0, FEATURED_COUNT)
  }, [models])

  const showContext = featured.some((model) => (model.context_length ?? 0) > 0)

  if (isLoading || featured.length === 0) {
    return null
  }

  return (
    <section id='pricing' className='bg-muted/30 scroll-mt-14 border-b'>
      <div className='mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20'>
        <div className='max-w-2xl'>
          <h2 className='text-3xl font-bold tracking-tight text-balance'>
            {t('Simple, transparent pricing')}
          </h2>
          <p className='text-muted-foreground mt-3 leading-relaxed text-pretty'>
            {t(
              'Pay only for what you use. No monthly fees, no minimums. Top up and go — balance never expires.'
            )}
          </p>
        </div>

        <Card className='mt-10 gap-0 p-0'>
          <div className='border-b px-5 py-4'>
            <h3 className='text-base font-semibold'>
              {t('Popular model pricing')}
            </h3>
          </div>
          <div className='overflow-x-auto'>
            <table className='w-full text-sm'>
              <thead>
                <tr className='bg-muted/40 text-muted-foreground border-b text-left text-xs'>
                  <th className='px-5 py-3 font-medium'>{t('Model')}</th>
                  <th className='px-5 py-3 font-medium'>{t('Zone')}</th>
                  <th className='px-5 py-3 text-right font-medium'>
                    {t('Input')}
                  </th>
                  <th className='px-5 py-3 text-right font-medium'>
                    {t('Output')}
                  </th>
                  {showContext && (
                    <th className='hidden px-5 py-3 text-right font-medium sm:table-cell'>
                      {t('Context')}
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {featured.map((model) => {
                  const zone = resolveModelZone(model, vendorZones)
                  return (
                    <tr
                      key={model.model_name}
                      className='border-b last:border-0'
                    >
                      <td className='px-5 py-3 font-medium'>
                        {model.model_name}
                      </td>
                      <td className='px-5 py-3'>
                        {zone === ZONE_DOMESTIC ||
                        zone === ZONE_INTERNATIONAL ? (
                          <span
                            className={cn(
                              'inline-flex items-center rounded-md border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap',
                              zone === ZONE_DOMESTIC
                                ? 'bg-secondary text-secondary-foreground'
                                : 'bg-muted text-muted-foreground'
                            )}
                          >
                            {zone === ZONE_DOMESTIC
                              ? t('Domestic models')
                              : t('International models')}
                          </span>
                        ) : (
                          <span className='text-muted-foreground'>-</span>
                        )}
                      </td>
                      <td className='text-primary px-5 py-3 text-right tabular-nums'>
                        {padPriceDecimals(
                          formatPrice(
                            model,
                            'input',
                            DEFAULT_TOKEN_UNIT,
                            false,
                            priceRate,
                            usdExchangeRate
                          )
                        )}
                      </td>
                      <td className='text-primary px-5 py-3 text-right tabular-nums'>
                        {padPriceDecimals(
                          formatPrice(
                            model,
                            'output',
                            DEFAULT_TOKEN_UNIT,
                            false,
                            priceRate,
                            usdExchangeRate
                          )
                        )}
                      </td>
                      {showContext && (
                        <td className='text-muted-foreground hidden px-5 py-3 text-right tabular-nums sm:table-cell'>
                          {formatContextLength(model.context_length)}
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className='text-muted-foreground px-5 py-3 text-xs'>
            {getCurrencyLabel() === 'USD'
              ? t('Prices in USD per 1M tokens, for reference only.')
              : t('Prices are per 1M tokens, for reference only.')}
          </div>
        </Card>
      </div>
    </section>
  )
}

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

import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { DEFAULT_TOKEN_UNIT } from '@/features/pricing/constants'
import { usePricingData } from '@/features/pricing/hooks/use-pricing-data'
import { formatPrice } from '@/features/pricing/lib/price'
import {
  resolveModelZone,
  ZONE_DOMESTIC,
  ZONE_OTHER,
} from '@/features/pricing/lib/zones'

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

  if (isLoading || featured.length === 0) {
    return null
  }

  return (
    <section id='pricing' className='border-border/40 bg-muted/20 border-b'>
      <div className='mx-auto max-w-6xl px-6 py-16 lg:py-20'>
        <div className='flex flex-wrap items-end justify-between gap-4'>
          <div className='max-w-2xl'>
            <h2 className='text-3xl font-bold tracking-tight text-balance'>
              {t('Simple, transparent pricing')}
            </h2>
            <p className='text-muted-foreground mt-3 leading-relaxed'>
              {t(
                'Pay only for what you use. No monthly fee, no minimum spend. Top up and go.'
              )}
            </p>
          </div>
          <Button variant='outline' render={<Link to='/pricing' />}>
            {t('View all')}
            <ArrowRight className='size-4' />
          </Button>
        </div>

        <Card className='mt-8 overflow-hidden p-0'>
          <div className='overflow-x-auto'>
            <table className='w-full text-sm'>
              <thead>
                <tr className='bg-muted/40 text-muted-foreground border-b text-left text-xs'>
                  <th className='px-5 py-3 font-medium'>{t('Model')}</th>
                  <th className='px-5 py-3 font-medium'>{t('Vendor')}</th>
                  <th className='px-5 py-3 text-right font-medium'>
                    {t('Input')}
                  </th>
                  <th className='px-5 py-3 text-right font-medium'>
                    {t('Output')}
                  </th>
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
                      <td className='px-5 py-3'>
                        <span className='flex flex-wrap items-center gap-2'>
                          <span className='font-medium'>
                            {model.model_name}
                          </span>
                          {zone !== ZONE_OTHER && (
                            <Badge variant='secondary'>
                              {zone === ZONE_DOMESTIC
                                ? t('Domestic models')
                                : t('International models')}
                            </Badge>
                          )}
                        </span>
                      </td>
                      <td className='text-muted-foreground px-5 py-3'>
                        {model.vendor_name || '-'}
                      </td>
                      <td className='text-primary px-5 py-3 text-right tabular-nums'>
                        {formatPrice(
                          model,
                          'input',
                          DEFAULT_TOKEN_UNIT,
                          false,
                          priceRate,
                          usdExchangeRate
                        )}
                      </td>
                      <td className='text-primary px-5 py-3 text-right tabular-nums'>
                        {formatPrice(
                          model,
                          'output',
                          DEFAULT_TOKEN_UNIT,
                          false,
                          priceRate,
                          usdExchangeRate
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
        <p className='text-muted-foreground/70 mt-3 text-xs'>
          {t('Prices are per 1M tokens.')}
        </p>
      </div>
    </section>
  )
}

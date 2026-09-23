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
 * Model marketplace on the home page, laid out as in the Zetone prototype:
 * zone tabs and a search box above a grid of model cards. Renders nothing
 * while the catalog is empty rather than an empty shell.
 */

import { Link } from '@tanstack/react-router'
import { ArrowRight, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { usePricingData } from '@/features/pricing/hooks/use-pricing-data'
import { filterBySearch } from '@/features/pricing/lib/filters'
import {
  availableZoneTabs,
  filterModelsByZone,
  ZONE_ALL,
  ZONE_DOMESTIC,
  ZONE_INTERNATIONAL,
  ZONE_OTHER,
  type ZoneFilter,
} from '@/features/pricing/lib/zones'
import { cn } from '@/lib/utils'

import { HomeModelCard } from '../home-model-card'

/** Cards shown before the reader is sent to the full model square. */
const SHOWCASE_LIMIT = 12

const ZONE_LABEL_KEYS: Record<ZoneFilter, string> = {
  [ZONE_ALL]: 'All',
  [ZONE_DOMESTIC]: 'Domestic models',
  [ZONE_INTERNATIONAL]: 'International models',
  [ZONE_OTHER]: 'Other models',
}

export function ModelsShowcase() {
  const { t } = useTranslation()
  const [zone, setZone] = useState<ZoneFilter>(ZONE_ALL)
  const [query, setQuery] = useState('')
  const { models, vendorZones, priceRate, usdExchangeRate, isLoading } =
    usePricingData()

  const allModels = useMemo(() => models || [], [models])
  const zoneTabs = useMemo(
    () => availableZoneTabs(allModels, vendorZones),
    [allModels, vendorZones]
  )
  const activeZone = zoneTabs.includes(zone) ? zone : ZONE_ALL
  const matching = useMemo(
    () =>
      filterBySearch(
        filterModelsByZone(allModels, activeZone, vendorZones),
        query.trim()
      ),
    [allModels, activeZone, vendorZones, query]
  )
  const visible = matching.slice(0, SHOWCASE_LIMIT)

  if (isLoading || allModels.length === 0) {
    return null
  }

  return (
    <section id='models' className='scroll-mt-14 border-b'>
      <div className='mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20'>
        <div className='max-w-2xl'>
          <h2 className='text-3xl font-bold tracking-tight text-balance'>
            {t('Model marketplace')}
          </h2>
          <p className='text-muted-foreground mt-3 leading-relaxed text-pretty'>
            {t(
              'Access leading domestic and international models through one unified, metered API.'
            )}
          </p>
        </div>

        <div className='mt-10 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
          {zoneTabs.length > 0 ? (
            <div
              role='group'
              aria-label={t('Model zone')}
              className='bg-card inline-flex w-fit rounded-lg border p-1'
            >
              {zoneTabs.map((tab) => (
                <button
                  key={tab}
                  type='button'
                  aria-pressed={tab === activeZone}
                  onClick={() => setZone(tab)}
                  className={cn(
                    'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                    tab === activeZone
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {t(ZONE_LABEL_KEYS[tab])}
                </button>
              ))}
            </div>
          ) : (
            <span />
          )}

          <div className='relative w-full sm:max-w-xs'>
            <Search
              className='text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2'
              aria-hidden='true'
            />
            <input
              type='search'
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t('Search models...')}
              aria-label={t('Search models')}
              className='bg-background focus-visible:border-ring focus-visible:ring-ring/30 h-9 w-full rounded-lg border pr-3 pl-9 text-sm transition-colors outline-none focus-visible:ring-3'
            />
          </div>
        </div>

        {visible.length > 0 ? (
          <div className='mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
            {visible.map((model) => (
              <HomeModelCard
                key={model.model_name}
                model={model}
                priceRate={priceRate}
                usdExchangeRate={usdExchangeRate}
              />
            ))}
          </div>
        ) : (
          <p className='text-muted-foreground mt-6 rounded-xl border border-dashed py-10 text-center text-sm'>
            {t('No models match your search.')}
          </p>
        )}

        {matching.length > SHOWCASE_LIMIT && (
          <div className='mt-6 text-center'>
            <Link
              to='/pricing'
              className='text-primary inline-flex items-center gap-1 text-sm font-medium hover:underline'
            >
              {t('View all {{count}} models', { count: matching.length })}
              <ArrowRight className='size-4' aria-hidden='true' />
            </Link>
          </div>
        )}
      </div>
    </section>
  )
}

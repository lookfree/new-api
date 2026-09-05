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
 * Model marketplace preview on the home page.
 *
 * Shows a handful of live models with the same domestic / international tabs
 * as the model square, so a visitor sees real inventory before signing up.
 * Renders nothing while the catalog is empty rather than an empty shell.
 */

import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { ModelCard } from '@/features/pricing/components/model-card'
import { ZoneTabs } from '@/features/pricing/components/zone-tabs'
import { usePricingData } from '@/features/pricing/hooks/use-pricing-data'
import {
  availableZoneTabs,
  countModelsByZone,
  filterModelsByZone,
  ZONE_ALL,
  type ZoneFilter,
} from '@/features/pricing/lib/zones'

/** How many cards the preview shows before sending the reader to /pricing. */
const PREVIEW_COUNT = 6

export function ModelsShowcase() {
  const { t } = useTranslation()
  const [zone, setZone] = useState<ZoneFilter>(ZONE_ALL)
  const { models, vendorZones, priceRate, usdExchangeRate, isLoading } =
    usePricingData()

  const allModels = useMemo(() => models || [], [models])
  const zoneTabs = useMemo(
    () => availableZoneTabs(allModels, vendorZones),
    [allModels, vendorZones]
  )
  const zoneCounts = useMemo(
    () => countModelsByZone(allModels, vendorZones),
    [allModels, vendorZones]
  )
  const activeZone = zoneTabs.includes(zone) ? zone : ZONE_ALL
  const preview = useMemo(
    () =>
      filterModelsByZone(allModels, activeZone, vendorZones).slice(
        0,
        PREVIEW_COUNT
      ),
    [allModels, activeZone, vendorZones]
  )

  if (isLoading || allModels.length === 0) {
    return null
  }

  return (
    <section id='models' className='border-border/40 border-b'>
      <div className='mx-auto max-w-6xl px-6 py-16 lg:py-20'>
        <div className='flex flex-wrap items-end justify-between gap-4'>
          <div className='max-w-2xl'>
            <h2 className='text-3xl font-bold tracking-tight text-balance'>
              {t('Model marketplace')}
            </h2>
            <p className='text-muted-foreground mt-3 leading-relaxed'>
              {t(
                'Leading domestic and international models behind one unified, metered API.'
              )}
            </p>
          </div>
          <Button variant='outline' render={<Link to='/pricing' />}>
            {t('View all')}
            <ArrowRight className='size-4' />
          </Button>
        </div>

        {zoneTabs.length > 0 && (
          <div className='mt-6'>
            <ZoneTabs
              zones={zoneTabs}
              value={activeZone}
              counts={zoneCounts}
              total={allModels.length}
              onChange={setZone}
            />
          </div>
        )}

        <div className='mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
          {preview.map((model) => (
            <ModelCard
              key={model.model_name}
              model={model}
              onClick={() => {}}
              priceRate={priceRate}
              usdExchangeRate={usdExchangeRate}
            />
          ))}
        </div>
      </div>
    </section>
  )
}

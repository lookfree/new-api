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
 * Zetone: domestic / international tabs for the model square.
 *
 * Rendered above the toolbar and applied before every other filter, so the
 * vendor, tag and group facets below always describe the zone in view. The
 * caller hides the strip by passing an empty `zones` list.
 */

import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/utils'

import {
  ZONE_ALL,
  ZONE_DOMESTIC,
  ZONE_INTERNATIONAL,
  ZONE_OTHER,
  type ModelZone,
  type ZoneFilter,
} from '../lib/zones'

const ZONE_LABEL_KEYS: Record<ZoneFilter, string> = {
  [ZONE_ALL]: 'All',
  [ZONE_DOMESTIC]: 'Domestic models',
  [ZONE_INTERNATIONAL]: 'International models',
  [ZONE_OTHER]: 'Other models',
}

export function ZoneTabs(props: {
  zones: readonly ZoneFilter[]
  value: ZoneFilter
  counts: Record<ModelZone, number>
  total: number
  onChange: (zone: ZoneFilter) => void
  className?: string
}) {
  const { t } = useTranslation()

  if (props.zones.length === 0) {
    return null
  }

  return (
    <div
      role='group'
      aria-label={t('Model zone')}
      className={cn(
        'bg-muted/60 inline-flex items-center rounded-lg border p-0.5',
        props.className
      )}
    >
      {props.zones.map((zone) => {
        const isActive = zone === props.value
        const count = zone === ZONE_ALL ? props.total : props.counts[zone]
        return (
          <button
            key={zone}
            type='button'
            onClick={() => props.onChange(zone)}
            aria-pressed={isActive}
            className={cn(
              'inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-medium transition-all',
              isActive
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <span>{t(ZONE_LABEL_KEYS[zone])}</span>
            <span
              className={cn(
                'tabular-nums',
                isActive ? 'text-primary-foreground/70' : 'opacity-60'
              )}
            >
              {count}
            </span>
          </button>
        )
      })}
    </div>
  )
}

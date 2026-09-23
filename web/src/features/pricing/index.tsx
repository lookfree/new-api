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
import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { PublicLayout } from '@/components/layout'
import { PageTransition } from '@/components/page-transition'
import { cn } from '@/lib/utils'

import {
  LoadingSkeleton,
  EmptyState,
  SearchBar,
  ModelCardGrid,
  ModelDetailsDrawer,
  ModelQuickDialog,
  ZoneTabs,
} from './components'
import { VIEW_MODES } from './constants'
import { useFilters } from './hooks/use-filters'
import { usePricingData } from './hooks/use-pricing-data'
import {
  availableZoneTabs,
  filterModelsByZone,
  resolveModelZone,
  ZONE_ALL,
  type ZoneFilter,
} from './lib/zones'

export function Pricing() {
  return (
    <PublicLayout showMainContainer={false} showFooter>
      <PageTransition className='mx-auto w-full max-w-6xl px-4 pt-[calc(57px+4rem)] pb-16 sm:px-6 lg:pt-[calc(57px+5rem)] lg:pb-20'>
        <ModelMarketplace variant='public' />
      </PageTransition>
    </PublicLayout>
  )
}

/**
 * `public` prints the heading like the home page's model section (larger,
 * bolder, with room above the toolbar); `console` is the in-app page heading.
 */
export function ModelMarketplace(props: { variant?: 'console' | 'public' }) {
  const { t } = useTranslation()
  const isPublic = props.variant === 'public'
  // The quick dialog opens first; it keeps its model while closing so it can
  // fade out, and hands over to the full drawer on request.
  const [dialog, setDialog] = useState<{
    modelName: string
    focusTry: boolean
    open: boolean
  } | null>(null)
  const [drawerModelName, setDrawerModelName] = useState<string | null>(null)
  // Zetone: the zone tab narrows the model list before the search box.
  const [zoneFilter, setZoneFilter] = useState<ZoneFilter>(ZONE_ALL)

  const {
    models,
    vendorZones,
    groupRatio,
    usableGroup,
    endpointMap,
    autoGroups,
    isLoading,
    priceRate,
    usdExchangeRate,
  } = usePricingData()

  const allModels = useMemo(() => models || [], [models])

  const zoneTabs = useMemo(
    () => availableZoneTabs(allModels, vendorZones),
    [allModels, vendorZones]
  )

  // A zone can vanish when the operator re-maps vendors; fall back to `all`
  // instead of rendering an empty page with no active tab.
  const activeZone = zoneTabs.includes(zoneFilter) ? zoneFilter : ZONE_ALL

  const zoneScopedModels = useMemo(
    () => filterModelsByZone(allModels, activeZone, vendorZones),
    [allModels, activeZone, vendorZones]
  )

  const {
    searchInput,
    tokenUnit,
    showRechargePrice,
    groupFilter,
    setSearchInput,
    filteredModels,
    hasActiveFilters,
    clearFilters,
    clearSearch,
  } = useFilters(zoneScopedModels)

  const handleModelClick = useCallback((modelName: string) => {
    setDialog({ modelName, focusTry: false, open: true })
  }, [])

  const handleModelTry = useCallback((modelName: string) => {
    setDialog({ modelName, focusTry: true, open: true })
  }, [])

  const dialogModel = useMemo(
    () =>
      dialog
        ? allModels.find((model) => model.model_name === dialog.modelName) ||
          null
        : null,
    [allModels, dialog]
  )

  const drawerModel = useMemo(
    () =>
      drawerModelName
        ? allModels.find((model) => model.model_name === drawerModelName) ||
          null
        : null,
    [allModels, drawerModelName]
  )

  const usableGroupNames = useMemo(
    () => Object.keys(usableGroup || {}),
    [usableGroup]
  )

  const handleClearAll = useCallback(() => {
    clearFilters()
    clearSearch()
  }, [clearFilters, clearSearch])

  let content
  if (isLoading) {
    content = <LoadingSkeleton viewMode={VIEW_MODES.CARD} />
  } else if (filteredModels.length === 0) {
    content = (
      <EmptyState
        searchQuery={searchInput}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={handleClearAll}
      />
    )
  } else {
    content = (
      <ModelCardGrid
        models={filteredModels}
        onModelClick={handleModelClick}
        onModelTry={handleModelTry}
        priceRate={priceRate}
        usdExchangeRate={usdExchangeRate}
        tokenUnit={tokenUnit}
        showRechargePrice={showRechargePrice}
        selectedGroup={groupFilter}
      />
    )
  }

  return (
    <div className='space-y-6'>
      <div className={cn(isPublic && 'max-w-2xl pb-4')}>
        <h2
          className={cn(
            isPublic
              ? 'text-3xl font-bold tracking-tight text-balance'
              : 'text-2xl font-semibold tracking-tight'
          )}
        >
          {t('Model marketplace')}
        </h2>
        <p
          className={cn(
            'text-muted-foreground',
            isPublic ? 'mt-3 leading-relaxed text-pretty' : 'mt-1'
          )}
        >
          {t(
            'Access mainstream models from China and abroad with one API and unified billing.'
          )}
        </p>
      </div>

      <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
        {zoneTabs.length > 0 ? (
          <ZoneTabs
            zones={zoneTabs}
            value={activeZone}
            onChange={setZoneFilter}
          />
        ) : (
          <span />
        )}
        <SearchBar
          value={searchInput}
          onChange={setSearchInput}
          onClear={clearSearch}
          placeholder={t('Search models...')}
          className='w-full sm:max-w-xs'
        />
      </div>

      {content}

      <ModelQuickDialog
        model={dialogModel}
        open={Boolean(dialog?.open)}
        focusTry={dialog?.focusTry}
        zone={
          dialogModel ? resolveModelZone(dialogModel, vendorZones) : undefined
        }
        tokenUnit={tokenUnit}
        showRechargePrice={showRechargePrice}
        priceRate={priceRate ?? 1}
        usdExchangeRate={usdExchangeRate ?? 1}
        selectedGroup={groupFilter}
        usableGroups={usableGroupNames}
        onOpenChange={(open) => {
          if (!open) {
            setDialog((current) => current && { ...current, open: false })
          }
        }}
        onOpenFullDetails={(model) => {
          setDialog((current) => current && { ...current, open: false })
          setDrawerModelName(model.model_name)
        }}
      />

      {drawerModel && (
        <ModelDetailsDrawer
          open={Boolean(drawerModel)}
          onOpenChange={(open) => {
            if (!open) setDrawerModelName(null)
          }}
          model={drawerModel}
          groupRatio={groupRatio || {}}
          usableGroup={usableGroup || {}}
          endpointMap={
            (endpointMap as Record<
              string,
              { path?: string; method?: string }
            >) || {}
          }
          autoGroups={autoGroups || []}
          priceRate={priceRate ?? 1}
          usdExchangeRate={usdExchangeRate ?? 1}
          tokenUnit={tokenUnit}
          showRechargePrice={showRechargePrice}
        />
      )}
    </div>
  )
}

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

import { ConsolePageHeader } from '@/components/layout'
import { ROLE } from '@/lib/roles'
import { useAuthStore } from '@/stores/auth-store'

import { useOverviewUsage } from '../../hooks/use-overview-usage'
import { useDashboardContentVisibility } from '../../hooks/use-status-data'
import { AccountSummaryCard } from './account-summary-card'
import { AnnouncementsPanel } from './announcements-panel'
import { ApiInfoPanel } from './api-info-panel'
import { FAQPanel } from './faq-panel'
import { PerformanceHealthPanel } from './performance-health-panel'
import { QuickStartCard } from './quick-start-card'
import { SetupGuide } from './setup-guide'
import { TopModelsCard } from './top-models-card'
import { UptimePanel } from './uptime-panel'
import { UsageTiles } from './usage-tiles'
import { UsageTrendCard } from './usage-trend-card'

/**
 * The console home. The top of the page is the prototype's Overview (welcome,
 * four tiles, trend and model ranking, quick start); everything the platform
 * adds beyond it (credit health, setup checklist, service panels) follows in
 * the same card style.
 */
export function OverviewDashboard() {
  const { t } = useTranslation()
  const isAdmin = useAuthStore(
    (state) => (state.auth.user?.role ?? 0) >= ROLE.ADMIN
  )
  const usageQuery = useOverviewUsage()
  const usage = usageQuery.data
  const visibility = useDashboardContentVisibility()

  const showPanels =
    isAdmin ||
    visibility.apiInfo ||
    visibility.announcements ||
    visibility.faq ||
    visibility.uptimeKuma

  return (
    <div className='space-y-6'>
      <ConsolePageHeader
        title={t('Welcome back')}
        description={t(
          'Here is your account overview. Which model will you call today?'
        )}
      />

      <UsageTiles usage={usage} loading={usageQuery.isLoading} />

      <div className='grid gap-4 lg:grid-cols-3'>
        <UsageTrendCard
          daily={usage?.daily ?? []}
          loading={usageQuery.isLoading}
        />
        <TopModelsCard
          models={usage?.topModels ?? []}
          loading={usageQuery.isLoading}
        />
      </div>

      <QuickStartCard />

      <AccountSummaryCard usage={usage} />

      <SetupGuide />

      {showPanels && (
        <div className='grid gap-4 lg:grid-cols-2'>
          {isAdmin && (
            <div className='lg:col-span-2'>
              <PerformanceHealthPanel />
            </div>
          )}
          {visibility.apiInfo && <ApiInfoPanel />}
          {visibility.announcements && <AnnouncementsPanel />}
          {visibility.faq && <FAQPanel />}
          {visibility.uptimeKuma && <UptimePanel />}
        </div>
      )}
    </div>
  )
}

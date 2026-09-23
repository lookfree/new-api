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
import { Link, useLocation } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { ConfigDrawer } from '@/components/config-drawer'
import { LanguageSwitcher } from '@/components/language-switcher'
import { NotificationPopover } from '@/components/notification-popover'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { useNotifications } from '@/hooks/use-notifications'
import { useSelf } from '@/hooks/use-self'
import { useIsSidebarModuleVisible } from '@/hooks/use-sidebar-config'
import { useSidebarView } from '@/hooks/use-sidebar-view'
import { formatQuota } from '@/lib/format'
import { ROLE } from '@/lib/roles'
import { useAuthStore } from '@/stores/auth-store'

import { findActiveNavTitle } from '../lib/nav-title'
import { ThemeToggle } from './public-toggles'

function usePageTitle(): string {
  const href = useLocation({ select: (location) => location.href })
  const { navGroups } = useSidebarView()
  return findActiveNavTitle(navGroups, href)
}

function BalanceBadge() {
  const { t } = useTranslation()
  const walletVisible = useIsSidebarModuleVisible('/wallet')
  const { user } = useSelf()
  const quota = user?.quota
  if (typeof quota !== 'number') return null

  const badge = (
    <span className='bg-primary/10 text-primary inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium whitespace-nowrap'>
      <span className='text-muted-foreground'>{t('Balance')}</span>
      <span className='font-semibold tabular-nums'>{formatQuota(quota)}</span>
    </span>
  )
  if (!walletVisible) return badge
  return (
    <Link
      to='/wallet'
      aria-label={t('Balance & top-up')}
      className='focus-visible:ring-ring/40 rounded-md outline-none focus-visible:ring-2'
    >
      {badge}
    </Link>
  )
}

/**
 * Header of the signed-in console: page title on the left; balance, search,
 * notifications, language, theme and account menu on the right.
 */
export function ConsoleHeader() {
  const title = usePageTitle()
  const notifications = useNotifications()
  const isAdmin = useAuthStore((s) => (s.auth.user?.role ?? 0) >= ROLE.ADMIN)

  return (
    <header className='bg-background/80 sticky top-0 z-40 flex h-14 shrink-0 items-center gap-3 border-b px-4 backdrop-blur sm:px-6'>
      <SidebarTrigger variant='ghost' className='md:hidden' />
      <h1 className='truncate font-semibold'>{title}</h1>

      <div className='ms-auto flex items-center gap-1 sm:gap-2'>
        <BalanceBadge />
        <Search compact className='max-sm:hidden' />
        <NotificationPopover
          open={notifications.popoverOpen}
          onOpenChange={notifications.setPopoverOpen}
          unreadCount={notifications.unreadCount}
          activeTab={notifications.activeTab}
          onTabChange={notifications.setActiveTab}
          notice={notifications.notice}
          announcements={notifications.announcements}
          loading={notifications.loading}
        />
        <LanguageSwitcher compact />
        <ThemeToggle />
        {isAdmin && <ConfigDrawer />}
        <ProfileDropdown />
      </div>
    </header>
  )
}

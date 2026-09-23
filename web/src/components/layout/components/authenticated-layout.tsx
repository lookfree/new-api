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
import { AnimatedOutlet } from '@/components/page-transition'
import { SkipToMain } from '@/components/skip-to-main'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { LayoutProvider } from '@/context/layout-provider'
import { SearchProvider } from '@/context/search-provider'
import { getCookie } from '@/lib/cookies'

import { AppSidebar } from './app-sidebar'
import { ConsoleHeader } from './console-header'

type AuthenticatedLayoutProps = {
  children?: React.ReactNode
}

// The console has no bar above the sidebar (the sidebar carries the brand and
// the header sits inside the content column), so the shared top offset is 0.
const CONSOLE_LAYOUT_STYLE = {
  '--app-header-height': '0px',
} as React.CSSProperties

export function AuthenticatedLayout(props: AuthenticatedLayoutProps) {
  const defaultOpen = getCookie('sidebar_state') !== 'false'

  return (
    <LayoutProvider>
      <SearchProvider>
        <SidebarProvider defaultOpen={defaultOpen} style={CONSOLE_LAYOUT_STYLE}>
          <SkipToMain />
          <AppSidebar />
          <SidebarInset className='@container/content h-svh min-h-0 overflow-hidden'>
            <ConsoleHeader />
            {props.children ?? <AnimatedOutlet />}
          </SidebarInset>
        </SidebarProvider>
      </SearchProvider>
    </LayoutProvider>
  )
}

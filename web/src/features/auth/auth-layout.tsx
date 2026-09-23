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
import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import {
  PublicLanguageToggle,
  ThemeToggle,
} from '@/components/layout/components/public-toggles'
import { Skeleton } from '@/components/ui/skeleton'
import { useSystemConfig } from '@/hooks/use-system-config'

type AuthLayoutProps = {
  children: React.ReactNode
}

export function AuthLayout({ children }: AuthLayoutProps) {
  const { t } = useTranslation()
  const { systemName, logo, loading } = useSystemConfig()

  return (
    <div className='bg-background flex min-h-dvh flex-col antialiased'>
      <header className='flex h-14 items-center justify-between px-4 sm:px-6'>
        <Link
          to='/'
          className='flex items-center gap-2 transition-opacity hover:opacity-80'
        >
          {loading ? (
            <Skeleton className='size-7 rounded-md' />
          ) : (
            <img
              src={logo}
              alt={t('Logo')}
              className='size-7 rounded-md object-cover'
            />
          )}
          {loading ? (
            <Skeleton className='h-5 w-20' />
          ) : (
            <span className='text-base leading-none font-semibold tracking-tight'>
              {systemName}
            </span>
          )}
        </Link>
        <div className='flex items-center gap-1'>
          <PublicLanguageToggle />
          <ThemeToggle />
        </div>
      </header>

      <main className='flex flex-1 items-center justify-center px-4 py-8'>
        <div className='bg-card w-full max-w-md rounded-xl border p-6 shadow-sm sm:p-8'>
          {children}
        </div>
      </main>
    </div>
  )
}

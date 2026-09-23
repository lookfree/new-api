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
import { Globe, Moon, Sun } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { useTheme } from '@/context/theme-provider'
import {
  INTERFACE_LANGUAGE_OPTIONS,
  normalizeInterfaceLanguage,
} from '@/i18n/languages'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/auth-store'

/**
 * Language control of the public header and auth pages, as in the prototype:
 * a globe with the current language's short name that switches to the other
 * language on click. With more than two interface languages it cycles.
 */
export function PublicLanguageToggle() {
  const { i18n, t } = useTranslation()
  const user = useAuthStore((state) => state.auth.user)
  const current = normalizeInterfaceLanguage(i18n.language)
  const index = INTERFACE_LANGUAGE_OPTIONS.findIndex(
    (option) => option.code === current
  )
  const next =
    INTERFACE_LANGUAGE_OPTIONS[(index + 1) % INTERFACE_LANGUAGE_OPTIONS.length]

  async function switchLanguage() {
    await i18n.changeLanguage(next.code)
    if (!user) return
    try {
      await api.put('/api/user/self', { language: next.code })
    } catch {
      // Best-effort persistence; don't block the UI on failure
    }
  }

  return (
    <Button
      variant='ghost'
      size='sm'
      onClick={switchLanguage}
      aria-label={t('Change language')}
      title={t('Change language')}
    >
      <Globe aria-hidden='true' />
      <span className='font-medium'>
        {current.startsWith('zh') ? '中' : current.toUpperCase()}
      </span>
    </Button>
  )
}

/**
 * Light/dark toggle: shows the mode you would switch to, as in the prototype.
 * Used by the public header, the auth pages and the console header.
 */
export function ThemeToggle() {
  const { t } = useTranslation()
  const { resolvedTheme, setTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  return (
    <Button
      variant='ghost'
      size='icon-sm'
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label={t('Toggle theme')}
    >
      {isDark ? <Sun aria-hidden='true' /> : <Moon aria-hidden='true' />}
    </Button>
  )
}

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
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { normalizeInterfaceLanguage } from '@/i18n/languages'

import { updateUserLanguage } from '../api'
import { parseUserSettings } from '../lib'
import { mergeAuthUserSetting } from '../lib/auth-user-setting'
import type { UserProfile } from '../types'

/**
 * Interface language shown in the settings page. Switching applies at once
 * and is saved to the account so it follows the user to other devices and
 * localizes API error messages; a failed save rolls the UI back.
 */
export function useInterfaceLanguage(
  profile: UserProfile | null,
  onProfileUpdate: () => void
) {
  const { i18n } = useTranslation()
  const [saving, setSaving] = useState(false)

  const savedLanguage = useMemo(() => {
    const settings = parseUserSettings(profile?.setting)
    return normalizeInterfaceLanguage(settings.language || i18n.language)
  }, [profile?.setting, i18n.language])

  const [language, setLanguage] = useState(savedLanguage)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLanguage(savedLanguage)
  }, [savedLanguage])

  async function changeLanguage(next: string) {
    const nextLanguage = normalizeInterfaceLanguage(next)
    if (nextLanguage === language) return

    const previousLanguage = language
    setLanguage(nextLanguage)
    setSaving(true)
    await i18n.changeLanguage(nextLanguage)

    try {
      const response = await updateUserLanguage(nextLanguage)
      if (!response.success) {
        throw new Error(response.message)
      }

      mergeAuthUserSetting({ language: nextLanguage })
      onProfileUpdate()
      // `t` from the hook is bound to the language of the render that created
      // it, so the toast reads from the instance to use the language just set.
      toast.success(i18n.t('Language preference saved'))
    } catch {
      setLanguage(previousLanguage)
      await i18n.changeLanguage(previousLanguage)
      toast.error(i18n.t('Failed to update settings'))
    } finally {
      setSaving(false)
    }
  }

  return { language, saving, changeLanguage }
}

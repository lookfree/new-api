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
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { updateUserSettings } from '../api'
import { parseUserSettings } from '../lib'
import { mergeAuthUserSetting } from '../lib/auth-user-setting'
import { buildNotifyDisabledRequest } from '../lib/notification-settings'
import type { UserProfile } from '../types'

/**
 * The balance-alert on/off switch. Flipping it shows the new state at once and
 * saves it; a failed save puts the switch back and says why. Only the switch is
 * a change: the rest of the request is rebuilt from the saved notification
 * settings (see buildNotifyDisabledRequest).
 */
export function useNotificationsEnabled(
  profile: UserProfile | null,
  onProfileUpdate: () => void | Promise<void>
) {
  const { t } = useTranslation()
  // The value being saved; null while nothing is in flight.
  const [pending, setPending] = useState<boolean | null>(null)
  // The last value the server accepted, for as long as `profile` is still the
  // object it was saved against. When the refresh that follows a save fails the
  // profile does not change, and would otherwise show the old value again.
  const [accepted, setAccepted] = useState<{
    profile: UserProfile
    enabled: boolean
  } | null>(null)

  let enabled = parseUserSettings(profile?.setting).notify_disabled !== true
  if (accepted && accepted.profile === profile) enabled = accepted.enabled
  if (pending !== null) enabled = pending

  async function setEnabled(next: boolean) {
    if (!profile || pending !== null || next === enabled) return

    setPending(next)
    try {
      // This hook reports failures itself, so the shared client must not
      // toast the same failure a second time.
      const response = await updateUserSettings(
        buildNotifyDisabledRequest(parseUserSettings(profile.setting), !next),
        { skipBusinessError: true, skipErrorHandler: true }
      )
      if (!response.success) {
        toast.error(response.message || t('Failed to update settings'))
        return
      }

      setAccepted({ profile, enabled: next })
      mergeAuthUserSetting({ notify_disabled: !next })
      toast.success(t('Settings updated successfully'))
      try {
        await onProfileUpdate()
      } catch {
        // Already saved; the profile catches up on its next refresh.
      }
    } catch {
      toast.error(t('Failed to update settings'))
    } finally {
      setPending(null)
    }
  }

  return { enabled, saving: pending !== null, setEnabled }
}

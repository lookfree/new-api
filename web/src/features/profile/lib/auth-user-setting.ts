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
import { useAuthStore } from '@/stores/auth-store'

import type { UserSettings } from '../types'
import { parseUserSettings } from './format'

/**
 * Mirrors a saved settings change into the auth store, so screens that read the
 * signed-in user (rather than the profile) see it without a reload. The store
 * is read at call time: a save can finish long after the render that started
 * it, and the user object may have been updated in between.
 */
export function mergeAuthUserSetting(patch: Partial<UserSettings>): void {
  const { user, setUser } = useAuthStore.getState().auth
  if (!user) return

  const existing =
    typeof user.setting === 'string'
      ? parseUserSettings(user.setting)
      : (user.setting ?? {})
  setUser({ ...user, setting: JSON.stringify({ ...existing, ...patch }) })
}

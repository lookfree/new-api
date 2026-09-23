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
import { afterEach, describe, expect, it } from 'vitest'

import { useAuthStore } from '@/stores/auth-store'

import { mergeAuthUserSetting } from '../auth-user-setting'

function signIn(setting?: Record<string, unknown> | string) {
  useAuthStore.getState().auth.setUser({
    id: 1,
    username: 'root',
    role: 100,
    setting,
  })
}

function storedSetting(): Record<string, unknown> {
  const setting = useAuthStore.getState().auth.user?.setting
  return JSON.parse(String(setting))
}

describe('mergeAuthUserSetting', () => {
  afterEach(() => {
    useAuthStore.getState().auth.reset()
  })

  it('adds the change to the signed-in user and keeps their other settings', () => {
    signIn(JSON.stringify({ language: 'en', sidebar_modules: '{}' }))

    mergeAuthUserSetting({ notify_disabled: true })

    expect(storedSetting()).toEqual({
      language: 'en',
      sidebar_modules: '{}',
      notify_disabled: true,
    })
  })

  it('overwrites a value that was already there', () => {
    signIn(JSON.stringify({ language: 'en', notify_disabled: true }))

    mergeAuthUserSetting({ notify_disabled: false })

    expect(storedSetting()).toEqual({ language: 'en', notify_disabled: false })
  })

  it('accepts a user whose setting is already an object', () => {
    signIn({ language: 'zhCN' })

    mergeAuthUserSetting({ notify_disabled: true })

    expect(storedSetting()).toEqual({ language: 'zhCN', notify_disabled: true })
  })

  it('starts from an empty setting when the user has none', () => {
    signIn(undefined)

    mergeAuthUserSetting({ language: 'en' })

    expect(storedSetting()).toEqual({ language: 'en' })
  })

  it('does nothing while signed out', () => {
    mergeAuthUserSetting({ notify_disabled: true })

    expect(useAuthStore.getState().auth.user).toBeNull()
  })
})

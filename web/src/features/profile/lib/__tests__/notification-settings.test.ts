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
import { describe, expect, it } from 'vitest'

import { DEFAULT_QUOTA_WARNING_THRESHOLD } from '../../constants'
import type { UserSettings } from '../../types'
import {
  buildNotifyDisabledRequest,
  toNotificationFormSettings,
} from '../notification-settings'

const FULL_SETTINGS: UserSettings = {
  notify_type: 'gotify',
  quota_warning_threshold: 250000,
  notification_email: 'ops@example.com',
  webhook_url: 'https://hooks.example/x',
  webhook_secret: 's3cret',
  bark_url: 'https://api.day.app/key/{{title}}',
  gotify_url: 'https://gotify.example',
  gotify_token: 'tok',
  gotify_priority: 7,
  accept_unset_model_ratio_model: true,
  record_ip_log: true,
  upstream_model_update_notify_enabled: true,
}

describe('toNotificationFormSettings', () => {
  it('fills every field with the form defaults when nothing was ever saved', () => {
    expect(toNotificationFormSettings({})).toEqual({
      notify_type: 'email',
      quota_warning_threshold: DEFAULT_QUOTA_WARNING_THRESHOLD,
      notification_email: '',
      webhook_url: '',
      webhook_secret: '',
      bark_url: '',
      gotify_url: '',
      gotify_token: '',
      gotify_priority: 5,
      accept_unset_model_ratio_model: false,
      record_ip_log: false,
      upstream_model_update_notify_enabled: false,
    })
  })

  it('carries every saved value through unchanged', () => {
    expect(toNotificationFormSettings(FULL_SETTINGS)).toEqual(FULL_SETTINGS)
  })

  it('uses the default threshold when the saved one is missing or zero, and keeps a real one', () => {
    expect(
      toNotificationFormSettings({ quota_warning_threshold: 0 })
        .quota_warning_threshold
    ).toBe(DEFAULT_QUOTA_WARNING_THRESHOLD)
    expect(
      toNotificationFormSettings({ quota_warning_threshold: 1 })
        .quota_warning_threshold
    ).toBe(1)
  })

  it('treats an unknown channel as email', () => {
    expect(
      toNotificationFormSettings({ notify_type: 'sms' as never }).notify_type
    ).toBe('email')
  })

  it('leaves out settings the notification form does not own', () => {
    const form = toNotificationFormSettings({
      ...FULL_SETTINGS,
      language: 'en',
      notify_disabled: true,
    })

    expect(form).not.toHaveProperty('language')
    expect(form).not.toHaveProperty('notify_disabled')
  })
})

describe('buildNotifyDisabledRequest', () => {
  it('re-sends every saved notification field and only adds the switch', () => {
    expect(buildNotifyDisabledRequest(FULL_SETTINGS, true)).toEqual({
      ...FULL_SETTINGS,
      notify_disabled: true,
    })
  })

  it('sets the switch back on with notify_disabled false, not by omitting it', () => {
    const request = buildNotifyDisabledRequest(
      { ...FULL_SETTINGS, notify_disabled: true },
      false
    )

    expect(request.notify_disabled).toBe(false)
  })

  it('is a valid request for a user who never saved settings', () => {
    const request = buildNotifyDisabledRequest({}, true)

    expect(request.notify_type).toBe('email')
    expect(request.quota_warning_threshold).toBeGreaterThan(0)
    expect(request.notify_disabled).toBe(true)
  })
})

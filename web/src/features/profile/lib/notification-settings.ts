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
import { DEFAULT_QUOTA_WARNING_THRESHOLD } from '../constants'
import type { UpdateUserSettingsRequest, UserSettings } from '../types'
import { normalizeNotifyType } from './notification-summary'

/**
 * The notification block of the saved settings with defaults applied: exactly
 * the fields the notification form edits and PUT /api/user/setting requires.
 * Language, sidebar and the alerts on/off switch live in the same JSON but are
 * not part of it.
 */
export function toNotificationFormSettings(saved: UserSettings): UserSettings {
  return {
    notify_type: normalizeNotifyType(saved.notify_type),
    // The server rejects a missing threshold, so a user who never saved one
    // gets the default the form itself shows.
    quota_warning_threshold:
      saved.quota_warning_threshold || DEFAULT_QUOTA_WARNING_THRESHOLD,
    notification_email: saved.notification_email ?? '',
    webhook_url: saved.webhook_url ?? '',
    webhook_secret: saved.webhook_secret ?? '',
    bark_url: saved.bark_url ?? '',
    gotify_url: saved.gotify_url ?? '',
    gotify_token: saved.gotify_token ?? '',
    gotify_priority: saved.gotify_priority ?? 5,
    accept_unset_model_ratio_model:
      saved.accept_unset_model_ratio_model || false,
    record_ip_log: saved.record_ip_log || false,
    upstream_model_update_notify_enabled:
      saved.upstream_model_update_notify_enabled || false,
  }
}

/**
 * Request that flips only the alerts on/off switch. The server rebuilds the
 * whole notification block from the request, so every other field is re-sent
 * from the saved settings; sending fewer would reset them.
 */
export function buildNotifyDisabledRequest(
  saved: UserSettings,
  notifyDisabled: boolean
): UpdateUserSettingsRequest {
  return {
    ...toNotificationFormSettings(saved),
    notify_disabled: notifyDisabled,
  }
}

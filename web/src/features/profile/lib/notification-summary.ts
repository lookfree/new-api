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
import { NOTIFICATION_METHODS } from '../constants'
import type { NotifyType, UserSettings } from '../types'

const NOTIFY_TYPES = new Set<NotifyType>(
  NOTIFICATION_METHODS.map((method) => method.value)
)

/** The server treats a missing or unknown channel as email. */
export function normalizeNotifyType(value: unknown): NotifyType {
  return typeof value === 'string' && NOTIFY_TYPES.has(value as NotifyType)
    ? (value as NotifyType)
    : 'email'
}

export type NotificationSummary =
  | { kind: 'email' }
  | { kind: 'email-unbound' }
  | { kind: 'channel'; channel: Exclude<NotifyType, 'email'> }

/**
 * Where balance alerts go for this user, from the saved settings. The email
 * channel falls back to the account email, so it only counts as unbound when
 * neither a notification email nor an account email exists.
 */
export function summarizeNotification(
  settings: UserSettings,
  accountEmail?: string
): NotificationSummary {
  const channel = normalizeNotifyType(settings.notify_type)
  if (channel !== 'email') {
    return { kind: 'channel', channel }
  }

  const hasAddress = Boolean(
    settings.notification_email?.trim() || accountEmail?.trim()
  )
  return hasAddress ? { kind: 'email' } : { kind: 'email-unbound' }
}

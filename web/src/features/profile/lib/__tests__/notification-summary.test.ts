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

import {
  normalizeNotifyType,
  summarizeNotification,
} from '../notification-summary'

describe('normalizeNotifyType', () => {
  it('keeps the four channels the server accepts', () => {
    expect(normalizeNotifyType('webhook')).toBe('webhook')
    expect(normalizeNotifyType('bark')).toBe('bark')
    expect(normalizeNotifyType('gotify')).toBe('gotify')
    expect(normalizeNotifyType('email')).toBe('email')
  })

  it('falls back to email for a missing or unknown channel', () => {
    expect(normalizeNotifyType(undefined)).toBe('email')
    expect(normalizeNotifyType('')).toBe('email')
    expect(normalizeNotifyType('sms')).toBe('email')
  })
})

describe('summarizeNotification', () => {
  it('is email when a notification email is set, whatever the account email', () => {
    expect(
      summarizeNotification(
        { notify_type: 'email', notification_email: ' ops@example.com ' },
        undefined
      )
    ).toEqual({ kind: 'email' })
  })

  it('is email when only the account email exists', () => {
    expect(summarizeNotification({}, 'me@example.com')).toEqual({
      kind: 'email',
    })
  })

  it('is unbound when the email channel has nowhere to send', () => {
    expect(summarizeNotification({ notify_type: 'email' }, undefined)).toEqual({
      kind: 'email-unbound',
    })
    expect(summarizeNotification({}, '  ')).toEqual({ kind: 'email-unbound' })
  })

  it('names the push channel and does not need an email address for it', () => {
    expect(summarizeNotification({ notify_type: 'bark' }, undefined)).toEqual({
      kind: 'channel',
      channel: 'bark',
    })
    expect(
      summarizeNotification({ notify_type: 'webhook' }, 'me@example.com')
    ).toEqual({ kind: 'channel', channel: 'webhook' })
  })
})

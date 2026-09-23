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
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { toast } from 'sonner'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/auth-store'

import { NOTIFICATION_SETTINGS_ID } from '../../constants'
import type { UserProfile } from '../../types'
import { PreferencesCard } from '../preferences-card'

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}))

type PutResponse = Awaited<ReturnType<typeof api.put>>

const QUIET_REQUEST = { skipBusinessError: true, skipErrorHandler: true }

const WEBHOOK_SETTING = {
  notify_type: 'webhook',
  quota_warning_threshold: 250000,
  webhook_url: 'https://hooks.example/x',
  webhook_secret: 'test-secret',
  record_ip_log: true,
  accept_unset_model_ratio_model: true,
  language: 'en',
}

function makeProfile(overrides: Partial<UserProfile>): UserProfile {
  return {
    id: 1,
    username: 'root',
    display_name: 'Root',
    role: 100,
    group: 'default',
    quota: 0,
    used_quota: 0,
    request_count: 0,
    status: 1,
    aff_count: 0,
    aff_quota: 0,
    aff_history_quota: 0,
    created_time: 0,
    ...overrides,
  }
}

function accepted(): PutResponse {
  return { data: { success: true } } as PutResponse
}

function refused(message: string): PutResponse {
  return { data: { success: false, message } } as PutResponse
}

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

/**
 * Renders the card the way the settings page does: the parent owns the profile
 * and reloads it after a save. `server.setting` plays the backend, which stores
 * what a successful request sends.
 */
function renderCard(options: {
  setting: Record<string, unknown>
  email?: string
  onProfileUpdate?: () => void | Promise<void>
  onBindEmail?: () => void
}) {
  const server = { setting: { ...options.setting } }
  const put = vi.spyOn(api, 'put').mockImplementation(async (_url, body) => {
    server.setting = { ...server.setting, ...(body as object) }
    return accepted()
  })

  function Page() {
    const [setting, setSetting] = useState(server.setting)
    return (
      <PreferencesCard
        profile={makeProfile({
          email: options.email,
          setting: JSON.stringify(setting),
        })}
        loading={false}
        onBindEmail={options.onBindEmail ?? vi.fn()}
        onProfileUpdate={async () => {
          await options.onProfileUpdate?.()
          setSetting({ ...server.setting })
        }}
      />
    )
  }

  render(<Page />)
  return { put, server }
}

function emailSwitch() {
  return screen.getByRole('switch', { name: 'Email notifications' })
}

describe('PreferencesCard notification switch', () => {
  beforeEach(() => {
    useAuthStore.getState().auth.setUser({
      id: 1,
      username: 'root',
      role: 100,
      setting: JSON.stringify({ language: 'en' }),
    })
  })

  afterEach(() => {
    useAuthStore.getState().auth.reset()
  })

  it('is on when alerts were never turned off', () => {
    renderCard({ setting: {}, email: 'me@example.com' })

    expect(emailSwitch()).toBeChecked()
  })

  it('is off when the saved settings turned alerts off', () => {
    renderCard({
      setting: { notify_disabled: true },
      email: 'me@example.com',
    })

    expect(emailSwitch()).not.toBeChecked()
  })

  it('is described by the prototype wording for the email channel', () => {
    renderCard({ setting: {}, email: 'me@example.com' })

    expect(emailSwitch()).toHaveAccessibleDescription(
      'Receive balance alerts and usage reports by email.'
    )
  })

  it('turning it off re-sends the saved notification settings with notify_disabled true', async () => {
    const { put } = renderCard({ setting: WEBHOOK_SETTING })

    await userEvent.click(
      screen.getByRole('switch', { name: 'Balance alerts' })
    )

    await waitFor(() => expect(put).toHaveBeenCalledTimes(1))
    expect(put).toHaveBeenCalledWith(
      '/api/user/setting',
      {
        notify_type: 'webhook',
        quota_warning_threshold: 250000,
        notification_email: '',
        webhook_url: 'https://hooks.example/x',
        webhook_secret: 'test-secret',
        bark_url: '',
        gotify_url: '',
        gotify_token: '',
        gotify_priority: 5,
        accept_unset_model_ratio_model: true,
        record_ip_log: true,
        upstream_model_update_notify_enabled: false,
        notify_disabled: true,
      },
      QUIET_REQUEST
    )
  })

  it('stays off once the profile has reloaded, and turning it on again sends notify_disabled false', async () => {
    const onProfileUpdate = vi.fn()
    const { put } = renderCard({
      setting: {},
      email: 'me@example.com',
      onProfileUpdate,
    })

    await userEvent.click(emailSwitch())
    await waitFor(() => expect(onProfileUpdate).toHaveBeenCalledTimes(1))
    await waitFor(() =>
      expect(emailSwitch()).not.toHaveAttribute('aria-readonly')
    )
    expect(emailSwitch()).not.toBeChecked()

    await userEvent.click(emailSwitch())
    await waitFor(() => expect(put).toHaveBeenCalledTimes(2))
    expect(put.mock.calls[1][1]).toMatchObject({ notify_disabled: false })
    await waitFor(() => expect(emailSwitch()).toBeChecked())
  })

  it('flips right away and ignores further toggles until the save finishes', async () => {
    const save = deferred<void>()
    const { put, server } = renderCard({
      setting: {},
      email: 'me@example.com',
    })
    put.mockImplementationOnce(async (_url, body) => {
      await save.promise
      server.setting = { ...server.setting, ...(body as object) }
      return accepted()
    })

    await userEvent.click(emailSwitch())

    expect(emailSwitch()).not.toBeChecked()
    expect(emailSwitch()).toHaveAttribute('aria-readonly', 'true')

    await userEvent.click(emailSwitch())

    expect(put).toHaveBeenCalledTimes(1)
    expect(emailSwitch()).not.toBeChecked()

    save.resolve()
    await waitFor(() =>
      expect(emailSwitch()).not.toHaveAttribute('aria-readonly')
    )
    expect(emailSwitch()).not.toBeChecked()
  })

  it('puts the switch back and shows the reason when the server refuses', async () => {
    const onProfileUpdate = vi.fn()
    const { put } = renderCard({
      setting: {},
      email: 'me@example.com',
      onProfileUpdate,
    })
    put.mockResolvedValueOnce(refused('Webhook URL is invalid'))

    await userEvent.click(emailSwitch())

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('Webhook URL is invalid')
    )
    await waitFor(() => expect(emailSwitch()).toBeChecked())
    expect(onProfileUpdate).not.toHaveBeenCalled()
    expect(toast.success).not.toHaveBeenCalled()
    expect(useAuthStore.getState().auth.user?.setting).toBe(
      JSON.stringify({ language: 'en' })
    )
  })

  it('puts the switch back with a generic message when the request itself fails', async () => {
    const { put } = renderCard({ setting: {}, email: 'me@example.com' })
    put.mockRejectedValueOnce(new Error('Network Error'))

    await userEvent.click(emailSwitch())

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('Failed to update settings')
    )
    await waitFor(() => expect(emailSwitch()).toBeChecked())
    expect(emailSwitch()).not.toHaveAttribute('aria-readonly')
  })

  it('can be switched again after a failed save', async () => {
    const { put } = renderCard({ setting: {}, email: 'me@example.com' })
    put.mockResolvedValueOnce(refused('try later'))

    await userEvent.click(emailSwitch())
    await waitFor(() => expect(emailSwitch()).toBeChecked())
    await userEvent.click(emailSwitch())

    await waitFor(() => expect(emailSwitch()).not.toBeChecked())
    expect(put).toHaveBeenCalledTimes(2)
  })

  it('mirrors an accepted change into the signed-in user without losing their other settings', async () => {
    renderCard({ setting: {}, email: 'me@example.com' })

    await userEvent.click(emailSwitch())

    await waitFor(() =>
      expect(
        JSON.parse(String(useAuthStore.getState().auth.user?.setting))
      ).toEqual({ language: 'en', notify_disabled: true })
    )
    expect(toast.success).toHaveBeenCalledWith('Settings updated successfully')
  })

  it('keeps showing the saved value when the profile reload after a successful save fails', async () => {
    renderCard({
      setting: {},
      email: 'me@example.com',
      onProfileUpdate: () => Promise.reject(new Error('offline')),
    })

    await userEvent.click(emailSwitch())

    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith(
        'Settings updated successfully'
      )
    )
    await waitFor(() =>
      expect(emailSwitch()).not.toHaveAttribute('aria-readonly')
    )
    expect(emailSwitch()).not.toBeChecked()
    expect(toast.error).not.toHaveBeenCalled()
  })
})

describe('PreferencesCard notification row', () => {
  afterEach(() => {
    useAuthStore.getState().auth.reset()
  })

  it('offers to bind an email, next to the switch, when the email channel has nowhere to send', async () => {
    const onBindEmail = vi.fn()
    renderCard({ setting: {}, email: undefined, onBindEmail })

    expect(emailSwitch()).toHaveAccessibleDescription(
      'Bind an email address to receive balance alert emails.'
    )

    await userEvent.click(screen.getByRole('button', { name: 'Bind Email' }))

    expect(onBindEmail).toHaveBeenCalledTimes(1)
  })

  it('does not offer to bind an email when one exists', () => {
    renderCard({ setting: {}, email: 'me@example.com' })

    expect(
      screen.queryByRole('button', { name: 'Bind Email' })
    ).not.toBeInTheDocument()
  })

  it('names the push channel instead of calling it email', () => {
    renderCard({ setting: { notify_type: 'bark' }, email: undefined })

    const alerts = screen.getByRole('switch', { name: 'Balance alerts' })
    expect(alerts).toHaveAccessibleDescription(
      'Receive balance alerts via Bark.'
    )
    expect(
      screen.queryByRole('switch', { name: 'Email notifications' })
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Bind Email' })
    ).not.toBeInTheDocument()
  })

  it('scrolls to the notification settings card when Configure is clicked', async () => {
    const scrollIntoView = vi.fn()
    const target = document.createElement('div')
    target.id = NOTIFICATION_SETTINGS_ID
    Object.defineProperty(target, 'scrollIntoView', { value: scrollIntoView })
    document.body.append(target)
    renderCard({ setting: {}, email: 'me@example.com' })

    await userEvent.click(screen.getByRole('button', { name: 'Configure' }))

    expect(scrollIntoView).toHaveBeenCalledTimes(1)
    target.remove()
  })
})

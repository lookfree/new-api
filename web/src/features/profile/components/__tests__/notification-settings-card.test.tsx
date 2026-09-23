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
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { api } from '@/lib/api'

import type { UserProfile } from '../../types'
import { NotificationSettingsCard } from '../notification-settings-card'

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}))

type PutResponse = Awaited<ReturnType<typeof api.put>>

const OFF_HINT =
  'Balance alerts are turned off. Switch them on under Preferences to receive them.'

function makeProfile(setting: Record<string, unknown>): UserProfile {
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
    setting: JSON.stringify(setting),
  }
}

function thresholdInput() {
  return screen.getByLabelText('Quota Warning Threshold')
}

describe('NotificationSettingsCard', () => {
  it('tells the user alerts are off, and only then', () => {
    const { rerender } = render(
      <NotificationSettingsCard
        profile={makeProfile({ notify_disabled: true })}
        onUpdate={vi.fn()}
      />
    )

    expect(screen.getByText(OFF_HINT)).toBeInTheDocument()

    rerender(
      <NotificationSettingsCard profile={makeProfile({})} onUpdate={vi.fn()} />
    )

    expect(screen.queryByText(OFF_HINT)).not.toBeInTheDocument()
  })

  it('keeps unsaved edits when only settings it does not own change', async () => {
    const saved = { quota_warning_threshold: 250000 }
    const { rerender } = render(
      <NotificationSettingsCard
        profile={makeProfile(saved)}
        onUpdate={vi.fn()}
      />
    )
    await userEvent.clear(thresholdInput())
    await userEvent.type(thresholdInput(), '999')

    rerender(
      <NotificationSettingsCard
        profile={makeProfile({
          ...saved,
          notify_disabled: true,
          language: 'en',
        })}
        onUpdate={vi.fn()}
      />
    )

    expect(thresholdInput()).toHaveValue(999)
  })

  it('loads the new values when its own saved settings change', async () => {
    const { rerender } = render(
      <NotificationSettingsCard
        profile={makeProfile({ quota_warning_threshold: 250000 })}
        onUpdate={vi.fn()}
      />
    )
    await userEvent.clear(thresholdInput())
    await userEvent.type(thresholdInput(), '999')

    rerender(
      <NotificationSettingsCard
        profile={makeProfile({ quota_warning_threshold: 111 })}
        onUpdate={vi.fn()}
      />
    )

    expect(thresholdInput()).toHaveValue(111)
  })

  it('saves without a notify_disabled field, so the stored switch is kept', async () => {
    const put = vi
      .spyOn(api, 'put')
      .mockResolvedValue({ data: { success: true } } as PutResponse)
    render(
      <NotificationSettingsCard
        profile={makeProfile({ notify_disabled: true })}
        onUpdate={vi.fn()}
      />
    )

    await userEvent.click(screen.getByRole('button', { name: 'Save Settings' }))

    expect(put).toHaveBeenCalledTimes(1)
    expect(put.mock.calls[0][0]).toBe('/api/user/setting')
    expect(put.mock.calls[0][1]).not.toHaveProperty('notify_disabled')
  })
})

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

import type { UserProfile } from '../../types'
import {
  DISPLAY_NAME_MAX_LENGTH,
  ProfileBasicsCard,
} from '../profile-basics-card'

function makeProfile(overrides: Partial<UserProfile>): UserProfile {
  return {
    id: 7,
    username: 'zetone-dev',
    display_name: 'Zetone Dev',
    role: 1,
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

function renderCard(profile: UserProfile | null, loading = false) {
  const onDisplayNameChange = vi.fn()
  const onEditEmail = vi.fn()
  render(
    <ProfileBasicsCard
      profile={profile}
      loading={loading}
      displayName={profile?.display_name ?? ''}
      onDisplayNameChange={onDisplayNameChange}
      onEditEmail={onEditEmail}
    />
  )
  return { onDisplayNameChange, onEditEmail }
}

describe('ProfileBasicsCard', () => {
  it('shows the nickname as editable and the email as read-only', () => {
    renderCard(makeProfile({ email: 'dev@zetone.ai' }))

    expect(screen.getByLabelText('Nickname')).toHaveValue('Zetone Dev')
    expect(screen.getByLabelText('Nickname')).toHaveAttribute(
      'maxlength',
      String(DISPLAY_NAME_MAX_LENGTH)
    )
    expect(screen.getByLabelText('Email')).toHaveValue('dev@zetone.ai')
    expect(screen.getByLabelText('Email')).toHaveAttribute('readonly')
  })

  it('reports each edit of the nickname', async () => {
    const { onDisplayNameChange } = renderCard(makeProfile({}))

    await userEvent.type(screen.getByLabelText('Nickname'), '!')

    expect(onDisplayNameChange).toHaveBeenCalledWith('Zetone Dev!')
  })

  it('offers to bind an email when none is set, and to change it when one is', async () => {
    const unbound = renderCard(makeProfile({ email: undefined }))
    await userEvent.click(screen.getByRole('button', { name: 'Bind' }))
    expect(unbound.onEditEmail).toHaveBeenCalledTimes(1)
  })

  it('offers to change the email when one is bound', () => {
    renderCard(makeProfile({ email: 'dev@zetone.ai' }))

    expect(screen.getByRole('button', { name: 'Change' })).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Bind' })
    ).not.toBeInTheDocument()
  })

  it('lists username, id and group so support can identify the account', () => {
    renderCard(makeProfile({}))

    expect(screen.getAllByText(/@zetone-dev/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/User ID 7/).length).toBeGreaterThan(0)
  })

  it('renders nothing while there is no profile', () => {
    const { container } = render(
      <ProfileBasicsCard
        profile={null}
        loading={false}
        displayName=''
        onDisplayNameChange={vi.fn()}
        onEditEmail={vi.fn()}
      />
    )

    expect(container).toBeEmptyDOMElement()
  })
})

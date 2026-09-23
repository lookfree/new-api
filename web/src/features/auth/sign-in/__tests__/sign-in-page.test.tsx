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
import i18next from 'i18next'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { SignIn } from '../index'

const statusState: { status: Record<string, unknown> } = { status: {} }
const loginMock = vi.fn()

vi.mock('@tanstack/react-router', () => ({
  Link: (props: { children?: ReactNode; to?: string }) => (
    <a href={props.to}>{props.children}</a>
  ),
  useSearch: () => ({}),
  useNavigate: () => vi.fn(),
}))

vi.mock('@/hooks/use-status', () => ({
  useStatus: () => statusState,
}))

vi.mock('@/hooks/use-system-config', () => ({
  useSystemConfig: () => ({ systemName: 'Zetone', logo: '', loading: false }),
}))

// The page chrome (logo, language and theme switches) is not under test.
vi.mock('@/features/auth/auth-layout', () => ({
  AuthLayout: (props: { children: ReactNode }) => <div>{props.children}</div>,
}))

vi.mock('@/features/auth/components/oauth-providers', () => ({
  OAuthProviders: () => null,
}))

vi.mock('@/features/auth/hooks/use-auth-redirect', () => ({
  useAuthRedirect: () => ({
    handleLoginSuccess: vi.fn(),
    redirectTo2FA: vi.fn(),
  }),
}))

vi.mock('@/features/auth/hooks/use-turnstile', () => ({
  useTurnstile: () => ({
    isTurnstileEnabled: false,
    turnstileSiteKey: '',
    turnstileToken: '',
    setTurnstileToken: vi.fn(),
    validateTurnstile: () => true,
  }),
}))

vi.mock('@/features/auth/api', () => ({
  login: (...args: unknown[]) => loginMock(...args),
  phoneLogin: vi.fn(),
  sendPhoneVerificationCode: vi.fn(),
  wechatLoginByCode: vi.fn(),
}))

vi.mock('@/lib/passkey', () => ({
  isPasskeySupported: () => Promise.resolve(false),
  buildAssertionResult: vi.fn(),
  prepareCredentialRequestOptions: vi.fn(),
}))

describe('SignIn page', () => {
  beforeEach(() => {
    statusState.status = {
      phone_login: true,
      wechat_login: true,
      password_login_enabled: true,
    }
    loginMock.mockReset()
  })

  afterEach(async () => {
    await i18next.changeLanguage('en')
  })

  it('offers phone, WeChat and email tabs with phone first in Chinese', async () => {
    await i18next.changeLanguage('zh')
    render(<SignIn />)

    const tabs = screen.getAllByRole('tab').map((tab) => tab.textContent)
    expect(tabs).toEqual(['Phone', 'WeChat', 'Email'])
    expect(screen.getByRole('tab', { name: 'Phone' })).toHaveAttribute(
      'aria-selected',
      'true'
    )
  })

  it('hides a tab when its sign-in method is disabled', () => {
    statusState.status = { phone_login: false, wechat_login: false }
    render(<SignIn />)

    expect(screen.getAllByRole('tab').map((tab) => tab.textContent)).toEqual([
      'Email',
    ])
  })

  it('blocks password sign-in until the terms are accepted', async () => {
    render(<SignIn />)
    await userEvent.type(screen.getByLabelText('Email'), 'root')
    await userEvent.type(screen.getByLabelText('Password'), 'secret-pass')

    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Please accept the Terms of Service and Privacy Policy first.'
    )
    expect(loginMock).not.toHaveBeenCalled()
  })

  it('submits the password form once the terms are accepted', async () => {
    loginMock.mockResolvedValue({ success: false })
    render(<SignIn />)
    await userEvent.type(screen.getByLabelText('Email'), 'root')
    await userEvent.type(screen.getByLabelText('Password'), 'secret-pass')

    await userEvent.click(screen.getByRole('checkbox'))
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(loginMock).toHaveBeenCalledWith(
      expect.objectContaining({ username: 'root', password: 'secret-pass' })
    )
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})

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
import { Link, useSearch } from '@tanstack/react-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useStatus } from '@/hooks/use-status'
import { cn } from '@/lib/utils'

import { AuthLayout } from '../auth-layout'
import { OAuthProviders } from '../components/oauth-providers'
import { PhoneAuthForm } from '../components/phone-auth-form'
import { TermsFooter } from '../components/terms-footer'
import { UserAuthForm } from './components/user-auth-form'

export function SignIn() {
  const { t } = useTranslation()
  const { redirect } = useSearch({ from: '/(auth)/sign-in' })
  const { status } = useStatus()

  // Phone sign-in only appears once an operator has configured an SMS
  // provider; otherwise the page is exactly what it was.
  const phoneLoginEnabled = Boolean(
    (status as Record<string, unknown> | null)?.phone_login
  )
  const [method, setMethod] = useState<'phone' | 'password'>('phone')
  const activeMethod = phoneLoginEnabled ? method : 'password'

  return (
    <AuthLayout>
      <div className='w-full space-y-8'>
        <div className='space-y-2'>
          <h2 className='text-center text-2xl font-semibold tracking-tight sm:text-left'>
            {t('Sign in')}
          </h2>
          {!status?.self_use_mode_enabled &&
            status?.register_enabled !== false && (
              <p className='text-muted-foreground text-left text-sm sm:text-base'>
                {t("Don't have an account?")}{' '}
                <Link
                  to='/sign-up'
                  className='hover:text-primary font-medium underline underline-offset-4'
                >
                  {t('Sign up')}
                </Link>
                .
              </p>
            )}
        </div>

        {phoneLoginEnabled && (
          <div className='bg-muted/60 inline-flex w-full rounded-lg border p-0.5'>
            {(['phone', 'password'] as const).map((value) => (
              <button
                key={value}
                type='button'
                onClick={() => setMethod(value)}
                aria-pressed={activeMethod === value}
                className={cn(
                  'flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                  activeMethod === value
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {value === 'phone' ? t('Phone number') : t('Password')}
              </button>
            ))}
          </div>
        )}

        {activeMethod === 'phone' ? (
          <>
            <PhoneAuthForm redirectTo={redirect} />
            {/* Third-party sign-in lives inside UserAuthForm, so switching to
                the phone tab would otherwise hide it. It belongs to the page,
                not to one credential form, and stays visible either way. */}
            <OAuthProviders status={status} redirectTo={redirect} />
          </>
        ) : (
          <UserAuthForm redirectTo={redirect} />
        )}

        <TermsFooter
          variant='sign-in'
          status={status}
          className='text-center'
        />
      </div>
    </AuthLayout>
  )
}

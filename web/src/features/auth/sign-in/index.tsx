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

import { Checkbox } from '@/components/ui/checkbox'
import { useStatus } from '@/hooks/use-status'
import { useSystemConfig } from '@/hooks/use-system-config'
import { cn } from '@/lib/utils'

import { AuthLayout } from '../auth-layout'
import { OAuthProviders } from '../components/oauth-providers'
import { PhoneAuthForm } from '../components/phone-auth-form'
import { WeChatSignInForm } from '../components/wechat-sign-in-form'
import { resolveSignInMethods, type SignInMethod } from '../lib/sign-in-methods'
import { UserAuthForm } from './components/user-auth-form'

const METHOD_LABEL_KEYS: Record<SignInMethod, string> = {
  phone: 'Phone',
  wechat: 'WeChat',
  email: 'Email',
}

export function SignIn() {
  const { t, i18n } = useTranslation()
  const { redirect } = useSearch({ from: '/(auth)/sign-in' })
  const { status } = useStatus()
  const { systemName } = useSystemConfig()
  const statusRecord = status as Record<string, unknown> | null

  const methods = resolveSignInMethods(i18n.language, {
    phone: Boolean(statusRecord?.phone_login),
    wechat: Boolean(status?.wechat_login),
    email:
      (status?.password_login_enabled ??
        status?.data?.password_login_enabled ??
        true) !== false,
  })
  const [selected, setSelected] = useState<SignInMethod | null>(null)
  const method = selected && methods.includes(selected) ? selected : methods[0]

  const [agreed, setAgreed] = useState(false)
  const [agreementError, setAgreementError] = useState(false)
  const requireAgreement = () => setAgreementError(true)
  const guardAgreement = () => {
    if (!agreed) setAgreementError(true)
    return agreed
  }

  const registerEnabled =
    !status?.self_use_mode_enabled && status?.register_enabled !== false

  const agreement = (
    <div className='space-y-1.5'>
      <label className='text-muted-foreground flex items-start gap-2 text-xs leading-relaxed'>
        <Checkbox
          checked={agreed}
          onCheckedChange={(value) => {
            setAgreed(value === true)
            if (value === true) setAgreementError(false)
          }}
          aria-invalid={agreementError}
          className='mt-0.5'
        />
        <span>
          {t('I have read and agree to the')}{' '}
          <Link
            to='/user-agreement'
            target='_blank'
            className='text-primary hover:underline'
          >
            {t('Terms of Service')}
          </Link>{' '}
          {t('and', { context: 'terms' })}{' '}
          <Link
            to='/privacy-policy'
            target='_blank'
            className='text-primary hover:underline'
          >
            {t('Privacy Policy')}
          </Link>
        </span>
      </label>
      {agreementError && (
        <p role='alert' className='text-destructive text-sm'>
          {t('Please accept the Terms of Service and Privacy Policy first.')}
        </p>
      )}
    </div>
  )

  const formProps = {
    redirectTo: redirect,
    agreed,
    agreement,
    onRequireAgreement: requireAgreement,
  }

  return (
    <AuthLayout>
      <h1 className='text-xl font-semibold tracking-tight'>
        {t('Sign in to {{name}}', { name: systemName })}
      </h1>
      <p className='text-muted-foreground mt-1 text-sm'>
        {t('Welcome back. Sign in to open your console.')}
      </p>

      {methods.length > 0 ? (
        <>
          <div
            role='tablist'
            aria-label={t('Sign-in method')}
            className='bg-background mt-5 inline-flex w-full rounded-lg border p-1'
          >
            {methods.map((value) => (
              <button
                key={value}
                type='button'
                role='tab'
                aria-selected={method === value}
                onClick={() => setSelected(value)}
                className={cn(
                  'flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                  method === value
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {t(METHOD_LABEL_KEYS[value])}
              </button>
            ))}
          </div>

          <div className='mt-5'>
            {method === 'phone' && <PhoneAuthForm {...formProps} />}
            {method === 'wechat' && <WeChatSignInForm {...formProps} />}
            {method === 'email' && <UserAuthForm {...formProps} />}
          </div>
        </>
      ) : (
        <p className='text-muted-foreground mt-5 text-sm'>
          {t('No sign-in method is enabled. Please contact the administrator.')}
        </p>
      )}

      <OAuthProviders
        status={status}
        redirectTo={redirect}
        onBeforeLogin={guardAgreement}
        className='mt-5'
      />

      {registerEnabled && (
        <p className='text-muted-foreground mt-6 text-center text-sm'>
          {t("Don't have an account?")}{' '}
          <Link
            to='/sign-up'
            className='text-primary font-medium hover:underline'
          >
            {t('Go to sign up')}
          </Link>
        </p>
      )}
    </AuthLayout>
  )
}

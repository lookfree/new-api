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
import { Link } from '@tanstack/react-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useStatus } from '@/hooks/use-status'
import { useSystemConfig } from '@/hooks/use-system-config'
import { cn } from '@/lib/utils'

import { AuthLayout } from '../auth-layout'
import { PhoneAuthForm } from '../components/phone-auth-form'
import { getAffiliateCode } from '../lib/storage'
import { resolveSignInMethods, type SignInMethod } from '../lib/sign-in-methods'
import { SignUpForm } from './components/sign-up-form'

// WeChat registration already works from the email tab's "continue with"
// dialog (SignUpForm). It is intentionally not promoted to its own tab here
// the way it is on sign-in: wechatLoginByCode has no invite-code parameter,
// so a bare WeChat tab could not carry a referral through registration.
const METHOD_LABEL_KEYS: Partial<Record<SignInMethod, string>> = {
  phone: 'Phone',
  email: 'Email',
}

export function SignUp() {
  const { t, i18n } = useTranslation()
  const { status } = useStatus()
  const { systemName } = useSystemConfig()
  const statusRecord = status as Record<string, unknown> | null

  const methods = resolveSignInMethods(i18n.language, {
    phone: Boolean(statusRecord?.phone_login),
    wechat: false,
    email:
      (status?.password_register_enabled ??
        status?.data?.password_register_enabled ??
        true) !== false,
  })
  const [selected, setSelected] = useState<SignInMethod | null>(null)
  const method = selected && methods.includes(selected) ? selected : methods[0]

  const [inviteCode, setInviteCode] = useState(() => getAffiliateCode())

  const [agreed, setAgreed] = useState(false)
  const [agreementError, setAgreementError] = useState(false)
  const requireAgreement = () => setAgreementError(true)

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

  return (
    <AuthLayout>
      <h1 className='text-xl font-semibold tracking-tight'>
        {t('Create your {{name}} account', { name: systemName })}
      </h1>
      <p className='text-muted-foreground mt-1 text-sm'>
        {t('Already have an account?')}{' '}
        <Link to='/sign-in' className='text-primary font-medium hover:underline'>
          {t('Sign in')}
        </Link>
      </p>

      {methods.length > 1 && (
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
              {t(METHOD_LABEL_KEYS[value] ?? value)}
            </button>
          ))}
        </div>
      )}

      <div className='mt-5'>
        {method === 'phone' ? (
          <div className='grid gap-4'>
            <div>
              <Label htmlFor='invite-code'>
                {t('Invite code')} ({t('optional')})
              </Label>
              <Input
                id='invite-code'
                value={inviteCode}
                onChange={(event) => setInviteCode(event.target.value.trim())}
                placeholder='ZT-XXXXXX'
                className='mt-1.5 font-mono'
              />
            </div>
            <PhoneAuthForm
              affCode={inviteCode || undefined}
              agreed={agreed}
              agreement={agreement}
              onRequireAgreement={requireAgreement}
              submitLabel={t('Create account')}
            />
          </div>
        ) : (
          <SignUpForm />
        )}
      </div>
    </AuthLayout>
  )
}

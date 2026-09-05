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
/**
 * Phone sign-in.
 *
 * Signing in registers the account on first use, which is what people expect
 * from a Chinese consumer product, so this one form serves both the sign-in
 * and sign-up pages. The invite code from a referral link rides along and only
 * matters when this call creates the account.
 */

import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, LogIn } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Turnstile } from '@/components/turnstile'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { useCountdown } from '@/hooks/use-countdown'

import { phoneLogin, sendPhoneVerificationCode } from '../api'
import { useAuthRedirect } from '../hooks/use-auth-redirect'
import { useTurnstile } from '../hooks/use-turnstile'
import {
  normalizePhone,
  phoneFormSchema,
  type PhoneFormValues,
} from '../lib/phone'

/** Seconds before the code can be requested again; mirrors the server default. */
const RESEND_COOLDOWN = 60

export function PhoneAuthForm(props: {
  redirectTo?: string
  affCode?: string
}) {
  const { t } = useTranslation()
  const { handleLoginSuccess } = useAuthRedirect()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSending, setIsSending] = useState(false)

  const {
    isTurnstileEnabled,
    turnstileSiteKey,
    turnstileToken,
    setTurnstileToken,
    validateTurnstile,
  } = useTurnstile()
  const {
    secondsLeft,
    isActive: isCoolingDown,
    start: startCountdown,
  } = useCountdown({ initialSeconds: RESEND_COOLDOWN })

  const form = useForm<PhoneFormValues>({
    resolver: zodResolver(phoneFormSchema),
    defaultValues: { phone: '', code: '' },
  })

  async function handleSendCode() {
    const phone = normalizePhone(form.getValues('phone'))
    const valid = await form.trigger('phone')
    if (!valid) return
    if (!validateTurnstile()) return

    setIsSending(true)
    try {
      const res = await sendPhoneVerificationCode(phone, turnstileToken)
      if (res?.success) {
        startCountdown()
        toast.success(t('Verification code sent'))
      } else {
        toast.error(res?.message || t('Failed to send verification code'))
      }
    } catch {
      // Request errors surface through the global interceptor.
    } finally {
      setIsSending(false)
    }
  }

  async function onSubmit(values: PhoneFormValues) {
    setIsSubmitting(true)
    try {
      const res = await phoneLogin(
        normalizePhone(values.phone),
        values.code,
        props.affCode
      )
      if (res?.success) {
        // Same session handling as password sign-in, so the auth bundle,
        // saved language and redirect all behave identically.
        await handleLoginSuccess(res.data, props.redirectTo)
      } else {
        toast.error(res?.message || t('Sign in failed'))
      }
    } catch {
      // Request errors surface through the global interceptor.
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className='grid gap-4'>
        <FormField
          control={form.control}
          name='phone'
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('Phone number')}</FormLabel>
              <FormControl>
                <Input
                  type='tel'
                  autoComplete='tel'
                  inputMode='numeric'
                  placeholder={t('Enter your phone number')}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name='code'
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('Verification code')}</FormLabel>
              <div className='flex gap-2'>
                <FormControl>
                  <Input
                    autoComplete='one-time-code'
                    inputMode='numeric'
                    placeholder={t('Enter code')}
                    {...field}
                  />
                </FormControl>
                <Button
                  type='button'
                  variant='outline'
                  className='shrink-0'
                  onClick={handleSendCode}
                  disabled={isSending || isCoolingDown}
                >
                  {isSending && <Loader2 className='size-4 animate-spin' />}
                  {isCoolingDown
                    ? t('{{seconds}}s', { seconds: secondsLeft })
                    : t('Get code')}
                </Button>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        {isTurnstileEnabled && (
          <Turnstile
            siteKey={turnstileSiteKey}
            onVerify={setTurnstileToken}
            onExpire={() => setTurnstileToken('')}
          />
        )}

        <Button
          type='submit'
          className='mt-2 w-full justify-center gap-2'
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <Loader2 className='size-4 animate-spin' />
          ) : (
            <LogIn className='size-4' />
          )}
          {t('Sign in')}
        </Button>
      </form>
    </Form>
  )
}

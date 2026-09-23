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
 * WeChat sign-in as its own tab: scan the official account's QR code, reply
 * "验证码" in WeChat, then type the code it sends back.
 */

import { Loader2 } from 'lucide-react'
import { useState, type FormEvent, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useStatus } from '@/hooks/use-status'
import { isAuthBundle } from '@/lib/api'
import { getServerErrorMessageKey } from '@/lib/server-error-message'

import { wechatLoginByCode } from '../api'
import { useAuthRedirect } from '../hooks/use-auth-redirect'

function readWeChatQrCodeUrl(status: Record<string, unknown> | null): string {
  if (!status) return ''
  const data = (status.data ?? {}) as Record<string, unknown>
  const candidates = [
    status.wechat_qrcode,
    status.wechat_qr_code,
    status.wechat_qrcode_image_url,
    status.wechat_qr_code_image_url,
    status.wechat_account_qrcode_image_url,
    status.WeChatAccountQRCodeImageURL,
    data.wechat_qrcode,
    data.WeChatAccountQRCodeImageURL,
  ]
  const found = candidates.find(
    (value): value is string => typeof value === 'string' && value !== ''
  )
  return found ?? ''
}

export function WeChatSignInForm(props: {
  redirectTo?: string
  agreed: boolean
  agreement: ReactNode
  onRequireAgreement: () => void
}) {
  const { t } = useTranslation()
  const { status } = useStatus()
  const { handleLoginSuccess } = useAuthRedirect()
  const [code, setCode] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const qrCodeUrl = readWeChatQrCodeUrl(
    status as Record<string, unknown> | null
  )

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!props.agreed) {
      props.onRequireAgreement()
      return
    }
    if (!code.trim()) {
      toast.error(t('Please enter the verification code'))
      return
    }

    setIsSubmitting(true)
    try {
      const res = await wechatLoginByCode(code.trim())
      if (res?.success && isAuthBundle(res.data)) {
        await handleLoginSuccess(res.data, props.redirectTo)
        toast.success(t('Signed in via WeChat'))
        return
      }
      if (getServerErrorMessageKey(res)) return
      toast.error(res?.message || t('Login failed'))
    } catch (error: unknown) {
      if (getServerErrorMessageKey(error)) return
      toast.error(t('Login failed'))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className='grid gap-4'>
      <div className='flex flex-col items-center gap-3 py-2'>
        {qrCodeUrl ? (
          <img
            src={qrCodeUrl}
            alt={t('WeChat login QR code')}
            className='bg-card size-40 rounded-lg border object-contain p-2 shadow-sm'
          />
        ) : (
          <p className='text-muted-foreground rounded-lg border border-dashed px-4 py-10 text-center text-sm'>
            {t('QR code is not configured. Please contact support.')}
          </p>
        )}
        <p className='text-sm font-medium'>
          {t('Scan with WeChat to sign in')}
        </p>
        <p className='text-muted-foreground text-center text-xs'>
          {t(
            'Follow the official account and reply “验证码” to get your sign-in code.'
          )}
        </p>
      </div>

      <div className='grid gap-1.5'>
        <Label htmlFor='wechat-code' className='leading-5'>
          {t('Verification code')}
        </Label>
        <Input
          id='wechat-code'
          className='h-10 px-3'
          value={code}
          onChange={(event) => setCode(event.target.value)}
          placeholder={t('Enter code')}
          autoComplete='one-time-code'
          inputMode='numeric'
        />
      </div>

      {props.agreement}

      <Button type='submit' className='w-full' disabled={isSubmitting}>
        {isSubmitting && <Loader2 className='animate-spin' />}
        {t('Sign in')}
      </Button>
    </form>
  )
}

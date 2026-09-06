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
 * Official Alipay and WeChat Pay, as distinct from the aggregator channels the
 * epay provider reaches under the same brand names.
 *
 * Rendered as its own block rather than folded into the existing payment list,
 * so the upstream wallet card stays untouched and this disappears entirely
 * when neither channel is configured.
 */

import { Loader2, QrCode, Wallet } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useStatus } from '@/hooks/use-status'
import { getSelf } from '@/lib/api'

import { getTopUpStatus, requestAlipayPay, requestWechatPay } from '../api-cn'

/** How often to ask whether a scanned QR payment has settled. */
const POLL_INTERVAL_MS = 3000
/** Stop polling after this long; the order stays payable, we just stop asking. */
const POLL_TIMEOUT_MS = 5 * 60 * 1000

export function CNPaymentSection(props: {
  amount: number
  minTopup: number
  /**
   * Whether the upstream card is showing its own amount input. When it is not,
   * this block renders one, because these channels do not depend on the
   * built-in online top-up switch that gates that input.
   */
  sharedAmountVisible: boolean
}) {
  const { t } = useTranslation()
  const { status } = useStatus()
  const record = status as Record<string, unknown> | null

  // The upstream card hides its amount input entirely when the built-in online
  // top-up switch is off, but these channels are independent of that switch.
  // Falling back to an input of our own keeps them usable on their own.
  const [ownAmount, setOwnAmount] = useState('')

  const alipayEnabled = Boolean(record?.alipay_enabled)
  const wechatEnabled = Boolean(record?.wechat_pay_enabled)

  const [pending, setPending] = useState<'alipay' | 'wechat' | null>(null)
  const [qrCodeUrl, setQrCodeUrl] = useState('')
  const [qrTradeNo, setQrTradeNo] = useState('')
  const pollTimer = useRef<number | null>(null)

  const stopPolling = () => {
    if (pollTimer.current !== null) {
      window.clearInterval(pollTimer.current)
      pollTimer.current = null
    }
  }

  // Clean up on unmount so a closed wallet page does not keep polling.
  useEffect(() => stopPolling, [])

  // Prefer the shared amount when the upstream input is on screen, so the two
  // never disagree; otherwise use the one rendered here.
  const needsOwnInput = !props.sharedAmountVisible
  const effectiveAmount = resolveAmount(
    props.sharedAmountVisible ? props.amount : 0,
    ownAmount
  )
  const amountValid = effectiveAmount >= props.minTopup && effectiveAmount > 0

  async function handleAlipay() {
    if (!amountValid) {
      toast.error(t('Please enter a valid amount'))
      return
    }
    setPending('alipay')
    try {
      const res = await requestAlipayPay(effectiveAmount)
      if (res?.success && res.data?.url) {
        // Alipay hosts the checkout, so the browser leaves this page.
        window.location.href = res.data.url
      } else {
        toast.error(res?.message || t('Failed to start the payment'))
      }
    } catch {
      // Request errors surface through the global interceptor.
    } finally {
      setPending(null)
    }
  }

  async function handleWechat() {
    if (!amountValid) {
      toast.error(t('Please enter a valid amount'))
      return
    }
    setPending('wechat')
    try {
      const res = await requestWechatPay(effectiveAmount)
      if (res?.success && res.data?.code_url) {
        setQrCodeUrl(res.data.code_url)
        setQrTradeNo(res.data.trade_no)
        startPolling(res.data.trade_no)
      } else {
        toast.error(res?.message || t('Failed to start the payment'))
      }
    } catch {
      // Request errors surface through the global interceptor.
    } finally {
      setPending(null)
    }
  }

  // The gateway notifies the server, not the browser, so the page has to ask
  // whether the order settled rather than being told.
  function startPolling(tradeNo: string) {
    stopPolling()
    const startedAt = Date.now()
    pollTimer.current = window.setInterval(async () => {
      if (Date.now() - startedAt > POLL_TIMEOUT_MS) {
        stopPolling()
        return
      }
      try {
        const state = await getTopUpStatus(tradeNo)
        if (state === 'success') {
          stopPolling()
          closeQr()
          await getSelf()
          toast.success(t('Payment received, your balance has been updated'))
        }
      } catch {
        // A failed poll is not worth surfacing; the next tick retries.
      }
    }, POLL_INTERVAL_MS)
  }

  function closeQr() {
    stopPolling()
    setQrCodeUrl('')
    setQrTradeNo('')
  }

  if (!alipayEnabled && !wechatEnabled) {
    return null
  }

  return (
    <div className='space-y-2.5 sm:space-y-3'>
      <Label className='text-muted-foreground text-xs font-medium tracking-wider uppercase'>
        {t('Alipay & WeChat Pay')}
      </Label>
      {needsOwnInput && (
        <Input
          type='number'
          inputMode='numeric'
          min={props.minTopup}
          value={ownAmount}
          onChange={(event) => setOwnAmount(event.target.value)}
          placeholder={t('Amount, at least {{min}}', { min: props.minTopup })}
        />
      )}

      <div className='grid grid-cols-1 gap-1.5 sm:grid-cols-2 sm:gap-3'>
        {alipayEnabled && (
          <Button
            variant='outline'
            className='h-11 justify-start gap-2'
            onClick={handleAlipay}
            disabled={pending !== null}
          >
            {pending === 'alipay' ? (
              <Loader2 className='size-4 animate-spin' />
            ) : (
              <Wallet className='size-4' aria-hidden='true' />
            )}
            {t('Alipay')}
          </Button>
        )}
        {wechatEnabled && (
          <Button
            variant='outline'
            className='h-11 justify-start gap-2'
            onClick={handleWechat}
            disabled={pending !== null}
          >
            {pending === 'wechat' ? (
              <Loader2 className='size-4 animate-spin' />
            ) : (
              <QrCode className='size-4' aria-hidden='true' />
            )}
            {t('WeChat Pay')}
          </Button>
        )}
      </div>

      <Dialog
        open={Boolean(qrCodeUrl)}
        onOpenChange={(open) => {
          if (!open) closeQr()
        }}
      >
        <DialogContent className='sm:max-w-sm'>
          <DialogHeader>
            <DialogTitle>{t('Scan to pay with WeChat')}</DialogTitle>
            <DialogDescription>
              {t(
                'Your balance updates automatically once the payment goes through.'
              )}
            </DialogDescription>
          </DialogHeader>
          <div className='flex flex-col items-center gap-3 py-2'>
            {qrCodeUrl && (
              // White backing regardless of theme: a QR code inverted by dark
              // mode will not scan.
              <div className='rounded-lg bg-white p-3'>
                <QRCodeSVG value={qrCodeUrl} size={200} />
              </div>
            )}
            <p className='text-muted-foreground font-mono text-xs break-all'>
              {qrTradeNo}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/**
 * Resolve which amount to charge: the shared one from the upstream card when
 * it is present, otherwise whatever was typed into this block's own input.
 * A non-numeric entry resolves to zero, which fails validation rather than
 * reaching the server.
 */
function resolveAmount(sharedAmount: number, typedAmount: string): number {
  if (sharedAmount > 0) return sharedAmount
  const parsed = Number.parseInt(typedAmount, 10)
  if (!Number.isFinite(parsed)) return 0
  return parsed
}

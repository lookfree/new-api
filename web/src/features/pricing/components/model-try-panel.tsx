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
import { Link, useLocation } from '@tanstack/react-router'
import { Lock, Send, Sparkles, Square } from 'lucide-react'
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
} from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { useStatus } from '@/hooks/use-status'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth-store'

import { useTryItChat } from '../hooks/use-try-it-chat'
import {
  estimateConversationTokens,
  estimateCostUsd,
  formatTryCost,
  getTryPricing,
  INSUFFICIENT_QUOTA_CODE,
  TRY_MAX_INPUT_CHARS,
} from '../lib/try-it'
import type { PricingModel } from '../types'

/**
 * The prototype's "试一下" panel: a small chat locked to one model, with a
 * temperature slider and a running token and cost figure. Replies are real and
 * billed to the signed-in user; a visitor is asked to sign in instead of sent.
 */
export function ModelTryPanel(props: {
  model: PricingModel
  /** Group the request is billed under; the server's default when omitted. */
  group?: string
  inputRef?: RefObject<HTMLInputElement | null>
}) {
  const { t } = useTranslation()
  const { status } = useStatus()
  const signedIn = useAuthStore((state) => Boolean(state.auth.user))
  const href = useLocation({ select: (location) => location.href })
  const chat = useTryItChat({
    model: props.model.model_name,
    group: props.group,
  })
  const [showSignInHint, setShowSignInHint] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)
  const sliderId = useId()

  useEffect(() => {
    const list = listRef.current
    if (list) list.scrollTop = list.scrollHeight
  }, [chat.messages])

  const yuanPerCredit = Number(status?.price)
  const pricing = useMemo(
    () => getTryPricing(props.model, props.group),
    [props.model, props.group]
  )

  // Once every reply so far reported real usage, show what was actually used.
  const exact = chat.turns.length > 0 && chat.turns.every((turn) => turn.exact)
  let tokens: number
  let costUsd: number | null
  if (exact) {
    const inputTokens = chat.turns.reduce(
      (sum, turn) => sum + turn.inputTokens,
      0
    )
    const outputTokens = chat.turns.reduce(
      (sum, turn) => sum + turn.outputTokens,
      0
    )
    tokens = inputTokens + outputTokens
    costUsd = estimateCostUsd(pricing, {
      inputTokens,
      outputTokens,
      requests: chat.turns.length,
    })
  } else {
    const estimate = estimateConversationTokens(chat.messages, chat.input)
    tokens = estimate.inputTokens + estimate.outputTokens
    const sent = chat.messages.filter((message) => message.role === 'user')
    costUsd = estimateCostUsd(pricing, {
      ...estimate,
      requests: sent.length + (chat.input.trim() ? 1 : 0),
    })
  }

  function handleSend() {
    if (!chat.input.trim() || chat.streaming) return
    if (!signedIn) {
      setShowSignInHint(true)
      return
    }
    setShowSignInHint(false)
    void chat.send()
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    // Enter also confirms an IME candidate, which must not send the message.
    if (event.key !== 'Enter' || event.nativeEvent.isComposing) return
    event.preventDefault()
    handleSend()
  }

  const lastIndex = chat.messages.length - 1

  return (
    <div className='bg-card rounded-xl border'>
      <div className='flex items-center justify-between gap-3 border-b px-4 py-3'>
        <div className='flex min-w-0 items-center gap-2'>
          <Sparkles
            className='text-primary size-4 shrink-0'
            aria-hidden='true'
          />
          <h3 className='shrink-0 text-sm font-semibold'>{t('Try it out')}</h3>
          <span
            title={t('Locked to this model')}
            className='bg-muted text-muted-foreground inline-flex min-w-0 items-center gap-1 rounded-md px-2 py-0.5 text-xs'
          >
            <Lock className='size-3 shrink-0' aria-hidden='true' />
            <span className='truncate'>{props.model.model_name}</span>
          </span>
        </div>
        <div className='shrink-0 text-right text-xs'>
          <div className='text-muted-foreground'>
            {exact ? t('Tokens used') : t('Est. tokens')}:{' '}
            <span className='text-foreground font-medium tabular-nums'>
              {tokens.toLocaleString()}
            </span>
          </div>
          <div className='text-muted-foreground'>
            {exact ? t('Actual cost') : t('Est. cost')}:{' '}
            <span className='text-primary font-medium tabular-nums'>
              {formatTryCost(
                costUsd,
                Number.isFinite(yuanPerCredit) ? yuanPerCredit : undefined
              )}
            </span>
          </div>
        </div>
      </div>

      <div
        ref={listRef}
        role='log'
        aria-live='polite'
        aria-label={t('Try-it conversation')}
        className='h-48 space-y-3 overflow-y-auto p-4'
      >
        <Bubble role='assistant'>
          {t("Hi! I'm running on this model — send a message to try.")}
        </Bubble>
        {chat.messages.map((message, index) => {
          const waiting = chat.streaming && index === lastIndex
          let body: ReactNode = message.content
          if (!message.content) {
            body = waiting ? (
              <span className='opacity-50'>…</span>
            ) : (
              <span className='opacity-60'>
                {t('The model returned no content.')}
              </span>
            )
          }
          return (
            <Bubble key={message.id} role={message.role}>
              {body}
            </Bubble>
          )
        })}
      </div>

      {chat.error && (
        <div
          role='alert'
          className='text-destructive bg-destructive/5 flex flex-wrap items-center gap-x-2 border-t px-4 py-2.5 text-sm'
        >
          <span>{chat.error.message}</span>
          {chat.error.code === INSUFFICIENT_QUOTA_CODE && signedIn && (
            <Link to='/wallet' className='font-medium underline'>
              {t('Top up now')}
            </Link>
          )}
        </div>
      )}

      <div className='flex items-center gap-3 border-t px-4 py-2.5'>
        <label htmlFor={sliderId} className='text-muted-foreground text-xs'>
          {t('Sampling temperature')}
        </label>
        <input
          id={sliderId}
          type='range'
          min={0}
          max={1}
          step={0.1}
          value={chat.temperature}
          onChange={(event) => chat.setTemperature(Number(event.target.value))}
          className='accent-primary h-1.5 flex-1 cursor-pointer'
        />
        <span className='w-8 text-right text-xs font-medium tabular-nums'>
          {chat.temperature.toFixed(1)}
        </span>
      </div>

      {showSignInHint && !signedIn && (
        <div className='bg-muted/50 flex flex-wrap items-center justify-between gap-2 border-t px-4 py-2.5 text-sm'>
          <span className='text-muted-foreground'>
            {t('Sign in to try it')}
          </span>
          <div className='flex items-center gap-2'>
            <Button
              size='sm'
              variant='outline'
              render={<Link to='/sign-in' search={{ redirect: href }} />}
            >
              {t('Sign in')}
            </Button>
            <Button size='sm' render={<Link to='/sign-up' />}>
              {t('Sign up')}
            </Button>
          </div>
        </div>
      )}

      <div className='flex items-end gap-2 border-t p-3'>
        <input
          ref={props.inputRef}
          value={chat.input}
          maxLength={TRY_MAX_INPUT_CHARS}
          onChange={(event) => chat.setInput(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t('Type a message to try this model…')}
          aria-label={t('Type a message to try this model…')}
          className='bg-background focus-visible:border-ring focus-visible:ring-ring/30 h-9 min-w-0 flex-1 rounded-lg border px-3 text-sm transition-colors outline-none focus-visible:ring-3'
        />
        {chat.streaming ? (
          <Button variant='outline' onClick={chat.stop}>
            <Square aria-hidden='true' />
            {t('Stop')}
          </Button>
        ) : (
          <Button onClick={handleSend} disabled={!chat.input.trim()}>
            <Send aria-hidden='true' />
            {t('Send')}
          </Button>
        )}
      </div>
    </div>
  )
}

function Bubble(props: { role: 'user' | 'assistant'; children: ReactNode }) {
  return (
    <div
      className={cn(
        'flex',
        props.role === 'user' ? 'justify-end' : 'justify-start'
      )}
    >
      <div
        className={cn(
          'max-w-[85%] rounded-lg px-3 py-2 text-sm leading-relaxed break-words whitespace-pre-wrap',
          props.role === 'user'
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted text-foreground'
        )}
      >
        {props.children}
      </div>
    </div>
  )
}

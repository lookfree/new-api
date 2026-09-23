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
 * Contact page.
 *
 * Contact methods come from the `ContactInfo` option so operations can change
 * them without a deploy; the message form posts to /api/contact, which
 * forwards to the configured inbox. Either half degrades on its own: with no
 * channels configured the page is just the form, and with no inbox configured
 * the form is replaced by a short note rather than a control that fails.
 * Layout follows the Zetone prototype: centered heading, channel cards on the
 * left, the message form on the right.
 */

import { Mail, MessageCircle, Phone } from 'lucide-react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { PublicLayout } from '@/components/layout'
import { PageTransition } from '@/components/page-transition'
import { Card, CardContent } from '@/components/ui/card'
import { useStatus } from '@/hooks/use-status'
import { cn } from '@/lib/utils'

import { ContactForm } from './components/contact-form'
import { parseContactChannels } from './lib/channels'
import type { ContactChannel } from './types'

const CHANNEL_ICONS = {
  email: Mail,
  phone: Phone,
  wecom: MessageCircle,
  wechat: MessageCircle,
} as const

export function Contact() {
  const { t } = useTranslation()
  const { status } = useStatus()

  const record = status as Record<string, unknown> | null
  const channels = useMemo(
    () => parseContactChannels(record?.contact_info),
    [record?.contact_info]
  )
  const formEnabled = Boolean(record?.contact_form_enabled)

  return (
    <PublicLayout showMainContainer={false} showFooter>
      <PageTransition className='mx-auto w-full max-w-6xl px-4 pt-[calc(57px+3rem)] pb-12 md:pt-[calc(57px+4rem)] md:pb-16'>
        <div className='mx-auto max-w-2xl text-center'>
          <h1 className='text-3xl font-semibold tracking-tight text-balance md:text-4xl'>
            {t('Contact us')}
          </h1>
          <p className='text-muted-foreground mt-3 leading-relaxed text-pretty'>
            {t(
              'Technical questions, partnerships or feedback — we would love to hear from you.'
            )}
          </p>
        </div>

        <div
          className={cn(
            'mt-10 grid gap-6',
            channels.length > 0
              ? 'md:grid-cols-[1fr_1.4fr]'
              : 'mx-auto max-w-2xl'
          )}
        >
          {channels.length > 0 && (
            <div aria-label={t('Get in touch')} className='flex flex-col gap-4'>
              {channels.map((channel) => (
                <ChannelCard
                  key={`${channel.kind}-${channel.label}`}
                  channel={channel}
                />
              ))}
            </div>
          )}

          <Card className='py-6'>
            <CardContent>
              {formEnabled ? (
                <ContactForm />
              ) : (
                <>
                  <h2 className='mb-4 text-lg font-semibold'>
                    {t('Send a message')}
                  </h2>
                  <p className='text-muted-foreground bg-muted/40 rounded-lg border px-4 py-6 text-sm leading-relaxed'>
                    {t(
                      'The message form is not configured yet. Please reach us through one of the channels listed here.'
                    )}
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </PageTransition>
    </PublicLayout>
  )
}

function ChannelCard(props: { channel: ContactChannel }) {
  const Icon = CHANNEL_ICONS[props.channel.kind]
  return (
    <Card>
      <CardContent className='flex items-center gap-4'>
        {props.channel.qr ? (
          <img
            src={props.channel.qr}
            alt={props.channel.label}
            className='bg-card size-[72px] shrink-0 rounded-lg border object-contain p-1 shadow-sm'
          />
        ) : (
          <span className='bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-lg'>
            <Icon className='size-5' aria-hidden='true' />
          </span>
        )}
        <div className='min-w-0'>
          <p className='text-muted-foreground text-sm'>{props.channel.label}</p>
          <p
            className={cn(
              props.channel.qr ? 'text-sm' : 'text-base font-medium',
              'break-all'
            )}
          >
            {props.channel.value}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

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
 */

import { Building2, Mail, MessageCircle, Phone } from 'lucide-react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { PublicLayout } from '@/components/layout'
import { PageTransition } from '@/components/page-transition'
import { Card, CardContent } from '@/components/ui/card'
import { useStatus } from '@/hooks/use-status'

import { ContactForm } from './components/contact-form'
import { parseContactChannels } from './lib/channels'
import type { ContactChannel } from './types'

const CHANNEL_ICONS = {
  email: Mail,
  phone: Phone,
  wecom: Building2,
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
    <PublicLayout showMainContainer={false}>
      <PageTransition className='mx-auto w-full max-w-5xl px-4 pt-16 pb-16 sm:px-6 sm:pt-20'>
        <header className='mb-10 max-w-2xl'>
          <h1 className='text-[clamp(1.875rem,4vw,2.5rem)] leading-tight font-bold tracking-tight'>
            {t('Contact us')}
          </h1>
          <p className='text-muted-foreground/80 mt-3 leading-relaxed'>
            {t(
              'Technical questions, partnerships or feedback — we would love to hear from you.'
            )}
          </p>
        </header>

        <div className='grid gap-8 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]'>
          {channels.length > 0 && (
            <section aria-labelledby='contact-channels'>
              <h2
                id='contact-channels'
                className='text-muted-foreground mb-3 text-xs font-semibold tracking-wide uppercase'
              >
                {t('Get in touch')}
              </h2>
              <div className='flex flex-col gap-3'>
                {channels.map((channel) => (
                  <ChannelCard
                    key={`${channel.kind}-${channel.label}`}
                    channel={channel}
                  />
                ))}
              </div>
            </section>
          )}

          <section aria-labelledby='contact-form'>
            <h2
              id='contact-form'
              className='text-muted-foreground mb-3 text-xs font-semibold tracking-wide uppercase'
            >
              {t('Send a message')}
            </h2>
            {formEnabled ? (
              <ContactForm />
            ) : (
              <p className='text-muted-foreground bg-muted/40 rounded-lg border px-4 py-6 text-sm leading-relaxed'>
                {t(
                  'The message form is not configured yet. Please reach us through one of the channels listed here.'
                )}
              </p>
            )}
          </section>
        </div>
      </PageTransition>
    </PublicLayout>
  )
}

function ChannelCard(props: { channel: ContactChannel }) {
  const Icon = CHANNEL_ICONS[props.channel.kind]
  return (
    <Card>
      <CardContent className='flex items-start gap-3 p-4'>
        <span className='bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-lg'>
          <Icon className='size-4' aria-hidden='true' />
        </span>
        <div className='min-w-0'>
          <p className='text-muted-foreground text-sm'>{props.channel.label}</p>
          <p className='font-medium break-all'>{props.channel.value}</p>
          {props.channel.qr && (
            <img
              src={props.channel.qr}
              alt={props.channel.label}
              className='border-border mt-3 size-28 rounded-md border object-contain'
            />
          )}
        </div>
      </CardContent>
    </Card>
  )
}

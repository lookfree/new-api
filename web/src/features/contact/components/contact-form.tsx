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
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Send } from 'lucide-react'
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
import { Textarea } from '@/components/ui/textarea'
import { useTurnstile } from '@/features/auth/hooks/use-turnstile'

import { sendContactMessage } from '../api'
import { contactFormSchema, type ContactFormValues } from '../lib/schema'

export function ContactForm() {
  const { t } = useTranslation()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const {
    isTurnstileEnabled,
    turnstileSiteKey,
    turnstileToken,
    setTurnstileToken,
    validateTurnstile,
  } = useTurnstile()

  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: { name: '', contact: '', message: '' },
  })

  async function onSubmit(values: ContactFormValues) {
    if (!validateTurnstile()) return

    setIsSubmitting(true)
    try {
      const res = await sendContactMessage(values, turnstileToken)
      if (res?.success) {
        form.reset()
        toast.success(t('Message sent. We will get back to you shortly.'))
      } else {
        toast.error(res?.message || t('Failed to send message'))
      }
    } catch {
      // Request errors surface through the global interceptor.
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-4'>
        <div className='grid gap-4 sm:grid-cols-2'>
          <FormField
            control={form.control}
            name='name'
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('Name')}</FormLabel>
                <FormControl>
                  <Input placeholder={t('Your name')} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name='contact'
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('Email or phone')}</FormLabel>
                <FormControl>
                  <Input placeholder={t('How we can reach you')} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name='message'
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('Message')}</FormLabel>
              <FormControl>
                <Textarea
                  rows={6}
                  placeholder={t('Tell us what you need...')}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {isTurnstileEnabled && (
          <Turnstile
            siteKey={turnstileSiteKey}
            onVerify={(token: string) => setTurnstileToken(token)}
          />
        )}

        <Button type='submit' disabled={isSubmitting} className='w-full sm:w-auto'>
          {isSubmitting ? (
            <Loader2 className='size-4 animate-spin' />
          ) : (
            <Send className='size-4' />
          )}
          {t('Submit')}
        </Button>
      </form>
    </Form>
  )
}

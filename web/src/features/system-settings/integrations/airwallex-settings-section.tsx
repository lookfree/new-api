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
import { useTranslation } from 'react-i18next'

import { CopyButton } from '@/components/copy-button'
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'

import {
  SettingsSwitchContent,
  SettingsSwitchItem,
} from '../components/settings-form-layout'
import type { AirwallexSettingsValues } from './airwallex-options'
import { removeTrailingSlash } from './utils'

/**
 * Fields live in the payment page's react-hook-form, so this renders inside
 * that form's provider and binds by field name.
 */
export function AirwallexSettingsSection() {
  const { t } = useTranslation()
  const webhookUrl = `${removeTrailingSlash(window.location.origin)}/api/airwallex/webhook`

  return (
    <div className='space-y-4'>
      <div>
        <h3 className='text-lg font-medium'>{t('Airwallex Gateway')}</h3>
        <p className='text-muted-foreground text-sm'>
          {t('Configuration for Airwallex payment integration')}
        </p>
      </div>

      <div className='rounded-md bg-blue-50 p-4 text-sm text-blue-900 dark:bg-blue-950 dark:text-blue-100'>
        <p className='mb-2 font-medium'>{t('Setup notes:')}</p>
        <ul className='list-inside list-disc space-y-1'>
          <li>
            {t(
              'Payments are settled in CNY on the Airwallex hosted payment page. Customers can pay by bank card, Alipay or WeChat Pay, depending on what is enabled on your Airwallex account.'
            )}
          </li>
          <li>
            {t(
              "In Airwallex, allow-list this server's outbound IP address on the API key. Requests from any other address are rejected."
            )}
          </li>
          <li>
            {t(
              'The minimum top-up follows the general minimum top-up setting (General tab).'
            )}
          </li>
          <li>
            {t(
              'The amount charged in CNY is the top-up amount × the general price (local currency / USD) × any amount discount, and must be at least ¥0.01.'
            )}
          </li>
        </ul>
      </div>

      <FormField<AirwallexSettingsValues, 'AirwallexEnabled'>
        name='AirwallexEnabled'
        render={({ field }) => (
          <SettingsSwitchItem>
            <SettingsSwitchContent>
              <FormLabel>{t('Enable Airwallex')}</FormLabel>
              <FormDescription>
                {t(
                  'Customers only see Airwallex in the wallet when payment compliance is confirmed, this switch is on, and the client ID, API key and webhook secret are all saved.'
                )}
              </FormDescription>
            </SettingsSwitchContent>
            <FormControl>
              <Switch checked={field.value} onCheckedChange={field.onChange} />
            </FormControl>
          </SettingsSwitchItem>
        )}
      />

      <div className='grid gap-6 md:grid-cols-2 md:items-start'>
        <FormField<AirwallexSettingsValues, 'AirwallexClientId'>
          name='AirwallexClientId'
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('Client ID')}</FormLabel>
              <FormControl>
                <Input
                  placeholder={t('Enter Airwallex client ID')}
                  autoComplete='off'
                  {...field}
                  onChange={(event) => field.onChange(event.target.value)}
                />
              </FormControl>
              <FormDescription>
                {t('Client ID from Airwallex (Developer → API keys)')}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField<AirwallexSettingsValues, 'AirwallexApiKey'>
          name='AirwallexApiKey'
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('API Key')}</FormLabel>
              <FormControl>
                <Input
                  type='password'
                  placeholder={t('Enter Airwallex API key')}
                  autoComplete='new-password'
                  {...field}
                  onChange={(event) => field.onChange(event.target.value)}
                />
              </FormControl>
              <FormDescription>
                {t('Airwallex API key (leave blank unless updating)')}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className='grid gap-6 md:grid-cols-2 md:items-start'>
        <FormField<AirwallexSettingsValues, 'AirwallexWebhookSecret'>
          name='AirwallexWebhookSecret'
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('Webhook Secret')}</FormLabel>
              <FormControl>
                <Input
                  type='password'
                  placeholder={t('Enter webhook secret')}
                  autoComplete='new-password'
                  {...field}
                  onChange={(event) => field.onChange(event.target.value)}
                />
              </FormControl>
              <FormDescription>
                {t('Webhook signing secret (leave blank unless updating)')}
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className='grid gap-2'>
          <Label htmlFor='airwallex-webhook-url'>{t('Webhook URL')}</Label>
          <div className='flex items-center gap-2'>
            <Input
              id='airwallex-webhook-url'
              readOnly
              value={webhookUrl}
              className='font-mono text-xs'
              onFocus={(event) => event.currentTarget.select()}
            />
            <CopyButton
              value={webhookUrl}
              variant='outline'
              size='icon'
              tooltip={t('Copy webhook URL')}
              aria-label={t('Copy webhook URL')}
            />
          </div>
          <p className='text-muted-foreground text-sm'>
            {t(
              'Register this exact URL in the Airwallex dashboard (Developer → Webhooks) and subscribe to the payment_intent.succeeded event.'
            )}
          </p>
        </div>
      </div>
    </div>
  )
}

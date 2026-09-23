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
import { useId } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { useTheme } from '@/context/theme-provider'
import { INTERFACE_LANGUAGE_OPTIONS } from '@/i18n/languages'

import { NOTIFICATION_SETTINGS_ID } from '../constants'
import { useInterfaceLanguage, useNotificationsEnabled } from '../hooks'
import { parseUserSettings } from '../lib'
import {
  summarizeNotification,
  type NotificationSummary,
} from '../lib/notification-summary'
import type { UserProfile } from '../types'
import { ProfileCard, ProfileCardSkeleton } from './profile-card'
import { SegmentedControl } from './segmented-control'
import { ToggleSwitch } from './toggle-switch'

const THEME_OPTIONS = [
  { value: 'light', label: 'Light mode' },
  { value: 'dark', label: 'Dark mode' },
] as const

const CHANNEL_LABELS: Record<string, string> = {
  webhook: 'Webhook',
  bark: 'Bark',
  gotify: 'Gotify',
}

function scrollToNotificationSettings() {
  document
    .querySelector(`#${NOTIFICATION_SETTINGS_ID}`)
    ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

/**
 * The prototype's notification row: what alerts are, and the switch that turns
 * them on or off. The email channel keeps the prototype's wording; any other
 * channel is named, since "email" would be wrong there. Where alerts go is set
 * in the notification settings card, which the button scrolls to.
 */
function NotificationRow(props: {
  summary: NotificationSummary
  enabled: boolean
  saving: boolean
  onEnabledChange: (enabled: boolean) => void
  onBindEmail: () => void
}) {
  const { t } = useTranslation()
  const titleId = useId()
  const descriptionId = useId()
  const summary = props.summary

  let title = t('Email notifications')
  let description = t('Receive balance alerts and usage reports by email.')
  if (summary.kind === 'email-unbound') {
    description = t('Bind an email address to receive balance alert emails.')
  } else if (summary.kind === 'channel') {
    title = t('Balance alerts')
    description = t('Receive balance alerts via {{channel}}.', {
      channel: CHANNEL_LABELS[summary.channel],
    })
  }

  return (
    <div className='flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between'>
      <div className='min-w-0'>
        <p id={titleId} className='text-sm font-medium'>
          {title}
        </p>
        <p
          id={descriptionId}
          className='text-muted-foreground mt-0.5 text-xs leading-relaxed'
        >
          {description}
        </p>
      </div>
      <div className='flex shrink-0 items-center justify-end gap-2'>
        {summary.kind === 'email-unbound' && (
          <Button variant='outline' size='sm' onClick={props.onBindEmail}>
            {t('Bind Email')}
          </Button>
        )}
        <Button
          variant='ghost'
          size='sm'
          onClick={scrollToNotificationSettings}
        >
          {t('Configure')}
        </Button>
        <ToggleSwitch
          aria-labelledby={titleId}
          aria-describedby={descriptionId}
          checked={props.enabled}
          readOnly={props.saving}
          onCheckedChange={props.onEnabledChange}
        />
      </div>
    </div>
  )
}

/**
 * The prototype's "偏好设置" card: appearance, interface language and the
 * notification switch. Appearance and language take effect the moment they are
 * chosen; language and the switch are also saved to the account.
 */
export function PreferencesCard(props: {
  profile: UserProfile | null
  loading: boolean
  onProfileUpdate: () => void | Promise<void>
  onBindEmail: () => void
}) {
  const { t } = useTranslation()
  const { resolvedTheme, setTheme } = useTheme()
  const language = useInterfaceLanguage(props.profile, props.onProfileUpdate)
  const notifications = useNotificationsEnabled(
    props.profile,
    props.onProfileUpdate
  )

  if (props.loading) return <ProfileCardSkeleton rows={3} />
  if (!props.profile) return null

  const summary = summarizeNotification(
    parseUserSettings(props.profile.setting),
    props.profile.email
  )

  return (
    <ProfileCard
      title={t('Preferences')}
      contentClassName='space-y-5 text-base'
    >
      <div>
        <p className='text-sm font-medium'>{t('Appearance')}</p>
        <SegmentedControl
          label={t('Appearance')}
          value={resolvedTheme}
          options={THEME_OPTIONS.map((option) => ({
            value: option.value,
            label: t(option.label),
          }))}
          onChange={setTheme}
        />
      </div>

      <div>
        <p className='text-sm font-medium'>{t('Interface Language')}</p>
        <SegmentedControl
          label={t('Interface Language')}
          value={language.language}
          options={INTERFACE_LANGUAGE_OPTIONS.map((option) => ({
            value: option.code,
            label: option.code === 'zhCN' ? '中文' : option.label,
          }))}
          onChange={language.changeLanguage}
          disabled={language.saving}
        />
      </div>

      <NotificationRow
        summary={summary}
        enabled={notifications.enabled}
        saving={notifications.saving}
        onEnabledChange={notifications.setEnabled}
        onBindEmail={props.onBindEmail}
      />
    </ProfileCard>
  )
}

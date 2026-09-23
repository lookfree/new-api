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

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getRoleLabel } from '@/lib/roles'

import type { UserProfile } from '../types'
import { ProfileCard, ProfileCardSkeleton } from './profile-card'

export const DISPLAY_NAME_MAX_LENGTH = 20

const inputClassName =
  'mt-1.5 h-9 bg-background px-3 text-sm dark:bg-background'

/**
 * The prototype's "个人资料" card: nickname and email side by side. The
 * nickname is edited here and saved with the page's save button; the email can
 * only change through the verification-code dialog, so it is shown read-only
 * next to the button that opens that dialog.
 */
export function ProfileBasicsCard(props: {
  profile: UserProfile | null
  loading: boolean
  displayName: string
  onDisplayNameChange: (value: string) => void
  onEditEmail: () => void
}) {
  const { t } = useTranslation()

  if (props.loading) return <ProfileCardSkeleton rows={1} />
  if (!props.profile) return null

  const profile = props.profile
  const identity = [
    `@${profile.username}`,
    `${t('User ID')} ${profile.id}`,
    getRoleLabel(profile.role),
    profile.group,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <ProfileCard
      title={t('Profile')}
      action={
        <span className='text-muted-foreground hidden text-xs leading-5 font-normal sm:inline'>
          {identity}
        </span>
      }
      contentClassName='grid gap-4 text-base sm:grid-cols-2'
    >
      <div>
        <label htmlFor='profile-display-name' className='text-sm font-medium'>
          {t('Nickname')}
        </label>
        <Input
          id='profile-display-name'
          className={inputClassName}
          value={props.displayName}
          maxLength={DISPLAY_NAME_MAX_LENGTH}
          placeholder={profile.username}
          onChange={(event) => props.onDisplayNameChange(event.target.value)}
        />
      </div>
      <div>
        <label htmlFor='profile-email' className='text-sm font-medium'>
          {t('Email')}
        </label>
        <div className='mt-1.5 flex gap-2'>
          <Input
            id='profile-email'
            readOnly
            className='bg-muted/40 h-9 px-3 text-sm'
            value={profile.email ?? ''}
            placeholder={t('Not bound')}
          />
          <Button
            variant='outline'
            className='h-9 shrink-0'
            onClick={props.onEditEmail}
          >
            {profile.email ? t('Change') : t('Bind')}
          </Button>
        </div>
      </div>
      <p className='text-muted-foreground text-xs sm:hidden'>{identity}</p>
    </ProfileCard>
  )
}

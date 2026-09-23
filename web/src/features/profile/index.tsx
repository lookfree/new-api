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
import { useQueryClient } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { ConsolePage, ConsolePageHeader } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { SELF_QUERY_KEY } from '@/hooks/use-self'
import { useStatus } from '@/hooks/use-status'
import { useAuthStore } from '@/stores/auth-store'

import { AccountBindingsCard } from './components/account-bindings-card'
import { CheckinCalendarCard } from './components/checkin-calendar-card'
import { EmailBindDialog } from './components/dialogs/email-bind-dialog'
import { LoginSessionsCard } from './components/login-sessions-card'
import { NotificationSettingsCard } from './components/notification-settings-card'
import { PasskeyCard } from './components/passkey-card'
import { PreferencesCard } from './components/preferences-card'
import { ProfileBasicsCard } from './components/profile-basics-card'
import { ProfileCardSkeleton } from './components/profile-card'
import { ProfileSecurityCard } from './components/profile-security-card'
import { SidebarModulesCard } from './components/sidebar-modules-card'
import { TwoFACard } from './components/two-fa-card'
import { useProfile } from './hooks'

/**
 * Account settings, laid out like the prototype's settings view: the profile
 * and preferences cards with one save button, then the account features the
 * prototype has no page for (bindings, notification channels, security,
 * sessions, passkey, 2FA, check-in, sidebar) as cards of the same style.
 */
export function Profile() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { profile, loading, updating, refreshProfile, updateProfile } =
    useProfile()
  const { status } = useStatus()
  const authUser = useAuthStore((s) => s.auth.user)
  const setAuthUser = useAuthStore((s) => s.auth.setUser)
  const permissions = authUser?.permissions
  const [displayNameDraft, setDisplayNameDraft] = useState<string | null>(null)
  const [emailDialogOpen, setEmailDialogOpen] = useState(false)

  const savedDisplayName = profile?.display_name ?? ''
  const displayName = displayNameDraft ?? savedDisplayName
  const trimmedDisplayName = displayName.trim()
  const dirty =
    displayNameDraft !== null && trimmedDisplayName !== savedDisplayName

  const checkinEnabled = status?.checkin_enabled === true
  const turnstileEnabled = !!(
    status?.turnstile_check && status?.turnstile_site_key
  )
  const turnstileSiteKey = status?.turnstile_site_key || ''
  const canConfigureSidebar = permissions?.sidebar_settings !== false

  // The account menu reads the name from the auth store, which is only filled
  // at sign-in, so mirror what the server now says about the profile.
  useEffect(() => {
    if (!profile || !authUser) return
    if (
      authUser.display_name === profile.display_name &&
      authUser.email === profile.email
    ) {
      return
    }
    setAuthUser({
      ...authUser,
      display_name: profile.display_name,
      email: profile.email,
    })
  }, [profile, authUser, setAuthUser])

  // Everything that shows the balance or the name reads the shared "self"
  // query, so a profile change must invalidate it as well as reload this page.
  const refresh = useCallback(async () => {
    await refreshProfile()
    await queryClient.invalidateQueries({ queryKey: SELF_QUERY_KEY })
  }, [refreshProfile, queryClient])

  async function handleSave() {
    if (!dirty) {
      toast.info(t('No changes to save'))
      return
    }
    // The server ignores an empty name instead of clearing it, so saving one
    // would report success while changing nothing.
    if (trimmedDisplayName === '') {
      toast.error(t('Nickname cannot be empty'))
      return
    }
    const saved = await updateProfile({ display_name: trimmedDisplayName })
    if (saved) {
      setDisplayNameDraft(null)
      await queryClient.invalidateQueries({ queryKey: SELF_QUERY_KEY })
    }
  }

  return (
    <ConsolePage>
      <ConsolePageHeader title={t('Settings')} />

      <ProfileBasicsCard
        profile={profile}
        loading={loading}
        displayName={displayName}
        onDisplayNameChange={setDisplayNameDraft}
        onEditEmail={() => setEmailDialogOpen(true)}
      />
      <PreferencesCard
        profile={profile}
        loading={loading}
        onProfileUpdate={refresh}
        onBindEmail={() => setEmailDialogOpen(true)}
      />

      <div className='flex justify-end'>
        <Button onClick={handleSave} disabled={updating}>
          {updating && <Loader2 className='animate-spin' />}
          {t('Save changes')}
        </Button>
      </div>

      <AccountBindingsCard profile={profile} onUpdate={refresh} />
      {loading && <ProfileCardSkeleton rows={3} />}
      {profile && (
        <NotificationSettingsCard profile={profile} onUpdate={refresh} />
      )}
      <ProfileSecurityCard profile={profile} loading={loading} />
      <LoginSessionsCard />
      <div className='grid gap-6 md:grid-cols-2 md:items-start'>
        <PasskeyCard loading={loading} />
        <TwoFACard loading={loading} />
      </div>
      {checkinEnabled && (
        <CheckinCalendarCard
          checkinEnabled={checkinEnabled}
          turnstileEnabled={turnstileEnabled}
          turnstileSiteKey={turnstileSiteKey}
        />
      )}
      {canConfigureSidebar && <SidebarModulesCard />}

      <EmailBindDialog
        open={emailDialogOpen}
        onOpenChange={setEmailDialogOpen}
        currentEmail={profile?.email}
        onSuccess={refresh}
      />
    </ConsolePage>
  )
}

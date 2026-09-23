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
import { Shield, AlertTriangle, RefreshCw } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { StatusBadge } from '@/components/status-badge'
import { Button } from '@/components/ui/button'
import { IconBadge } from '@/components/ui/icon-badge'
import { useDialogs } from '@/hooks/use-dialog'

import { useTwoFA } from '../hooks'
import { TwoFABackupDialog } from './dialogs/two-fa-backup-dialog'
import { TwoFADisableDialog } from './dialogs/two-fa-disable-dialog'
import { TwoFASetupDialog } from './dialogs/two-fa-setup-dialog'
import { ProfileCard, ProfileCardSkeleton } from './profile-card'

// ============================================================================
// Two-Factor Authentication Card Component
// ============================================================================

interface TwoFACardProps {
  loading: boolean
}

type DialogKey = 'setup' | 'disable' | 'backup'

export function TwoFACard({ loading: pageLoading }: TwoFACardProps) {
  const { t } = useTranslation()
  const { status, loading, refetch } = useTwoFA(!pageLoading)
  const dialogs = useDialogs<DialogKey>()

  if (pageLoading || loading) return <ProfileCardSkeleton rows={1} />

  return (
    <>
      <ProfileCard
        title={t('Two-Factor Authentication')}
        description={t('Add an extra layer of security to your account')}
      >
        <div className='space-y-6'>
          {/* Status Section */}
          <div className='flex flex-col gap-4'>
            <div className='flex items-start gap-4'>
              <IconBadge tone='success' size='sm'>
                <Shield />
              </IconBadge>
              <div className='space-y-1'>
                <div className='flex items-center gap-2'>
                  <p className='font-medium'>{t('Two-Step Verification')}</p>
                  {status.enabled ? (
                    <StatusBadge
                      label={t('Enabled')}
                      variant='success'
                      showDot
                      copyable={false}
                    />
                  ) : (
                    <StatusBadge
                      label={t('Disabled')}
                      variant='neutral'
                      showDot
                      copyable={false}
                    />
                  )}
                  {status.locked && (
                    <StatusBadge
                      label={t('Locked')}
                      variant='danger'
                      showDot
                      copyable={false}
                    />
                  )}
                </div>
                <p className='text-muted-foreground text-sm'>
                  {status.enabled
                    ? t('Backup codes remaining: {{count}}', {
                        count: status.backup_codes_remaining,
                      })
                    : t('Add an extra layer of security to your account')}
                </p>
              </div>
            </div>

            {!status.enabled && (
              <Button className='w-full' onClick={() => dialogs.open('setup')}>
                {t('Enable')}
              </Button>
            )}
          </div>

          {/* Actions Section - Only show when enabled */}
          {status.enabled && (
            <div className='flex flex-col gap-3 border-t pt-6'>
              <Button
                variant='outline'
                className='flex-1'
                onClick={() => dialogs.open('backup')}
              >
                <RefreshCw className='mr-2 h-4 w-4' />
                {t('Regenerate Backup Codes')}
              </Button>
              <Button
                variant='destructive'
                className='flex-1'
                onClick={() => dialogs.open('disable')}
              >
                <AlertTriangle className='mr-2 h-4 w-4' />
                {t('Disable 2FA')}
              </Button>
            </div>
          )}
        </div>
      </ProfileCard>

      {/* Dialogs */}
      <TwoFASetupDialog
        open={dialogs.isOpen('setup')}
        onOpenChange={(open) =>
          open ? dialogs.open('setup') : dialogs.close('setup')
        }
        onSuccess={refetch}
      />

      <TwoFADisableDialog
        open={dialogs.isOpen('disable')}
        onOpenChange={(open) =>
          open ? dialogs.open('disable') : dialogs.close('disable')
        }
        onSuccess={refetch}
      />

      <TwoFABackupDialog
        open={dialogs.isOpen('backup')}
        onOpenChange={(open) =>
          open ? dialogs.open('backup') : dialogs.close('backup')
        }
        onSuccess={refetch}
      />
    </>
  )
}

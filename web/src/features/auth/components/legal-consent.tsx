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
import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/utils'

import type { SystemStatus } from '../types'

interface LegalConsentProps {
  status: SystemStatus | null
  checked: boolean
  onCheckedChange: (nextValue: boolean) => void
  className?: string
}

export function LegalConsent({
  status,
  checked,
  onCheckedChange,
  className,
}: LegalConsentProps) {
  const { t } = useTranslation()
  const hasUserAgreement = Boolean(status?.user_agreement_enabled)
  const hasPrivacyPolicy = Boolean(status?.privacy_policy_enabled)

  if (!hasUserAgreement && !hasPrivacyPolicy) {
    return null
  }

  return (
    <label
      className={cn(
        'text-muted-foreground flex items-start gap-2 text-xs leading-relaxed',
        className
      )}
    >
      <input
        type='checkbox'
        checked={checked}
        onChange={(event) => onCheckedChange(event.target.checked)}
        className='accent-primary mt-0.5 size-4 shrink-0'
      />
      <span>
        {t('I have read and agree to the')}{' '}
        {hasUserAgreement && (
          <Link
            to='/user-agreement'
            target='_blank'
            className='text-primary hover:underline'
          >
            {t('Terms of Service')}
          </Link>
        )}
        {hasUserAgreement && hasPrivacyPolicy && (
          <> {t('and', { context: 'terms' })} </>
        )}
        {hasPrivacyPolicy && (
          <Link
            to='/privacy-policy'
            target='_blank'
            className='text-primary hover:underline'
          >
            {t('Privacy Policy')}
          </Link>
        )}
      </span>
    </label>
  )
}

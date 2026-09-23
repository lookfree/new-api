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
import {
  ArrowRight,
  Check,
  ChevronDown,
  ChevronUp,
  CreditCard,
  FileText,
  KeyRound,
  RadioTower,
  Store,
  TerminalSquare,
  type LucideIcon,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useSelf } from '@/hooks/use-self'
import { ROLE } from '@/lib/roles'
import { cn } from '@/lib/utils'

import { useOverviewSetup } from '../../hooks/use-overview-setup'

const SETUP_GUIDE_VISIBILITY_STORAGE_KEY =
  'dashboard_overview_setup_guide_expanded'

type GuideLinkTarget =
  | '/keys'
  | '/wallet'
  | '/playground'
  | '/channels'
  | '/usage-logs'
  | '/marketplace'

interface StartStep {
  title: string
  description: string
  to: GuideLinkTarget
  icon: LucideIcon
  completed: boolean
}

interface QuickAction {
  title: string
  description: string
  to: GuideLinkTarget
  icon: LucideIcon
  adminOnly?: boolean
}

function getSavedSetupGuideExpanded(): boolean | null {
  if (typeof window === 'undefined') return null
  const saved = window.localStorage.getItem(SETUP_GUIDE_VISIBILITY_STORAGE_KEY)
  if (saved === 'expanded') return true
  if (saved === 'collapsed') return false
  return null
}

function saveSetupGuideExpanded(expanded: boolean): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(
    SETUP_GUIDE_VISIBILITY_STORAGE_KEY,
    expanded ? 'expanded' : 'collapsed'
  )
}

function StartStepRow(props: { step: StartStep }) {
  const Icon = props.step.icon

  return (
    <li>
      <Link
        to={props.step.to}
        className='hover:bg-muted/40 focus-visible:ring-ring flex items-center gap-3 px-4 py-3 transition-colors outline-none focus-visible:ring-2'
      >
        <span
          aria-hidden='true'
          className='bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-lg'
        >
          <Icon className='size-4' />
        </span>
        <span className='flex min-w-0 flex-1 flex-col gap-0.5'>
          <span className='truncate text-sm font-medium'>
            {props.step.title}
          </span>
          <span className='text-muted-foreground line-clamp-1 text-xs'>
            {props.step.description}
          </span>
        </span>
        {props.step.completed ? (
          <span
            aria-hidden='true'
            className='bg-success/12 text-success flex size-6 shrink-0 items-center justify-center rounded-full'
          >
            <Check className='size-3.5' />
          </span>
        ) : (
          <ArrowRight
            className='text-muted-foreground size-4 shrink-0'
            aria-hidden='true'
          />
        )}
      </Link>
    </li>
  )
}

function QuickActionRow(props: { action: QuickAction }) {
  const Icon = props.action.icon

  return (
    <Link
      to={props.action.to}
      className='hover:bg-muted/40 focus-visible:ring-ring flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors outline-none focus-visible:ring-2'
    >
      <span
        aria-hidden='true'
        className='bg-muted text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-lg'
      >
        <Icon className='size-4' />
      </span>
      <span className='flex min-w-0 flex-col gap-0.5'>
        <span className='truncate text-sm font-medium'>
          {props.action.title}
        </span>
        <span className='text-muted-foreground line-clamp-1 text-xs'>
          {props.action.description}
        </span>
      </span>
    </Link>
  )
}

/**
 * The getting-started checklist and the recommended shortcuts, as plain cards.
 * Expanded for a new account until its three steps are done, then collapsed
 * to one line; the customer's own choice, once made, is remembered.
 */
export function SetupGuide() {
  const { t } = useTranslation()
  const { user } = useSelf()
  const setup = useOverviewSetup()
  const [manualExpanded, setManualExpanded] = useState<boolean | null>(() =>
    getSavedSetupGuideExpanded()
  )

  const requestCount = Number(user?.request_count ?? 0)
  const remainQuota = Number(user?.quota ?? 0)
  const usedQuota = Number(user?.used_quota ?? 0)
  const isAdmin = Boolean(user?.role && user.role >= ROLE.ADMIN)

  const steps = useMemo<StartStep[]>(
    () => [
      {
        title: t('Create API Key'),
        description: t('Create a key for your app or service'),
        to: '/keys',
        icon: KeyRound,
        completed: Boolean(setup.preferredKey),
      },
      {
        title: t('Add credits'),
        description: t('Keep enough balance before production traffic'),
        to: '/wallet',
        icon: CreditCard,
        completed: remainQuota > 0 || usedQuota > 0,
      },
      {
        title: t('Send a request'),
        description: t('Verify routing with Playground or your client'),
        to: '/playground',
        icon: TerminalSquare,
        completed: requestCount > 0,
      },
    ],
    [remainQuota, requestCount, setup.preferredKey, t, usedQuota]
  )

  const quickActions = useMemo<QuickAction[]>(
    () =>
      [
        {
          title: t('API Keys'),
          description: t('Create a key for your app or service'),
          to: '/keys' as const,
          icon: KeyRound,
        },
        {
          title: t('Channels'),
          description: t('Configure upstream providers and routing.'),
          to: '/channels' as const,
          icon: RadioTower,
          adminOnly: true,
        },
        {
          title: t('Usage Logs'),
          description: t('Inspect requests, errors, and billing details'),
          to: '/usage-logs' as const,
          icon: FileText,
        },
        {
          title: t('Model marketplace'),
          description: t('Review model rates before scaling traffic'),
          to: '/marketplace' as const,
          icon: Store,
        },
      ].filter((action) => !action.adminOnly || isAdmin),
    [isAdmin, t]
  )

  const completedCount = steps.filter((step) => step.completed).length
  const setupComplete = completedCount === steps.length
  const statusReady = setup.apiKeysFetched && Boolean(user)
  const expanded = manualExpanded ?? (statusReady && !setupComplete)
  const progress = t('Setup progress: {{completed}}/{{total}}', {
    completed: completedCount,
    total: steps.length,
  })

  function toggle() {
    setManualExpanded(!expanded)
    saveSetupGuideExpanded(!expanded)
  }

  if (!expanded) {
    return (
      <Card>
        <CardContent className='flex flex-wrap items-center justify-between gap-3'>
          <div className='flex min-w-0 items-center gap-3'>
            <span
              aria-hidden='true'
              className='bg-success/12 text-success flex size-9 shrink-0 items-center justify-center rounded-lg'
            >
              <Check className='size-4' />
            </span>
            <div className='min-w-0'>
              <div className='flex items-center gap-2'>
                <h3 className='truncate text-sm font-semibold'>
                  {setupComplete ? t('Setup guide complete') : t('Setup guide')}
                </h3>
                <Badge variant='muted'>{progress}</Badge>
              </div>
              <p className='text-muted-foreground line-clamp-1 text-xs'>
                {setupComplete
                  ? t('Your setup guide is collapsed so usage stays in focus.')
                  : t('Setup guide is collapsed. Expand it anytime.')}
              </p>
            </div>
          </div>
          <Button variant='outline' size='sm' onClick={toggle}>
            <ChevronDown data-icon='inline-start' />
            {t('Show setup guide')}
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className='grid gap-4 lg:grid-cols-3'>
      <Card className='lg:col-span-2'>
        <CardHeader className='flex flex-row items-center justify-between'>
          <div className='flex min-w-0 items-center gap-2'>
            <CardTitle>{t('Get started')}</CardTitle>
            <Badge variant='muted'>{progress}</Badge>
          </div>
          <Button variant='outline' size='sm' onClick={toggle}>
            <ChevronUp data-icon='inline-start' />
            {t('Hide setup guide')}
          </Button>
        </CardHeader>
        <CardContent>
          <ol className={cn('divide-y overflow-hidden rounded-lg border')}>
            {steps.map((step) => (
              <StartStepRow key={step.title} step={step} />
            ))}
          </ol>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('Recommended actions')}</CardTitle>
        </CardHeader>
        <CardContent className='space-y-2'>
          {quickActions.map((action) => (
            <QuickActionRow key={action.title} action={action} />
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

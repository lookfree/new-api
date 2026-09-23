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
import { Link, useNavigate } from '@tanstack/react-router'
import { Menu, X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Dialog } from '@/components/dialog'
import { NotificationPopover } from '@/components/notification-popover'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useNotifications } from '@/hooks/use-notifications'
import { useStatus } from '@/hooks/use-status'
import { useSystemConfig } from '@/hooks/use-system-config'
import { useTopNavLinks } from '@/hooks/use-top-nav-links'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth-store'

import { defaultTopNavLinks } from '../config/top-nav.config'
import type { TopNavLink } from '../types'
import { HeaderLogo } from './header-logo'
import { PublicLanguageToggle, ThemeToggle } from './public-toggles'

const AUTH_PROMPT_SECONDS = 5

type AuthPromptTarget = {
  title: string
  href: string
}

export interface PublicHeaderProps {
  navLinks?: TopNavLink[]
  mobileLinks?: TopNavLink[]
  navContent?: React.ReactNode
  showThemeSwitch?: boolean
  showLanguageSwitcher?: boolean
  logo?: React.ReactNode
  siteName?: string
  homeUrl?: string
  leftContent?: React.ReactNode
  rightContent?: React.ReactNode
  showNavigation?: boolean
  showAuthButtons?: boolean
  showNotifications?: boolean
  className?: string
}

export function PublicHeader(props: PublicHeaderProps) {
  const {
    navLinks = defaultTopNavLinks,
    showThemeSwitch = true,
    showLanguageSwitcher = true,
    logo: customLogo,
    siteName: customSiteName,
    homeUrl = '/',
    showAuthButtons = true,
    showNotifications = true,
  } = props

  const { t } = useTranslation()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [authPromptTarget, setAuthPromptTarget] =
    useState<AuthPromptTarget | null>(null)
  const [authPromptSecondsLeft, setAuthPromptSecondsLeft] =
    useState(AUTH_PROMPT_SECONDS)
  const { auth } = useAuthStore()
  const {
    systemName,
    logo: systemLogo,
    loading,
    logoLoaded,
  } = useSystemConfig()
  const dynamicLinks = useTopNavLinks()
  const { status } = useStatus()
  const notifications = useNotifications()

  const user = auth.user
  const isAuthenticated = !!user
  const displaySiteName = customSiteName || systemName
  const links = dynamicLinks.length > 0 ? dynamicLinks : navLinks
  const registerEnabled =
    !status?.self_use_mode_enabled && status?.register_enabled !== false

  useEffect(() => {
    if (!authPromptTarget) return

    const intervalId = window.setInterval(() => {
      setAuthPromptSecondsLeft((seconds) => Math.max(seconds - 1, 0))
    }, 1000)

    const timeoutId = window.setTimeout(() => {
      const redirect = authPromptTarget.href
      setAuthPromptTarget(null)
      navigate({ to: '/sign-in', search: { redirect } })
    }, AUTH_PROMPT_SECONDS * 1000)

    return () => {
      window.clearInterval(intervalId)
      window.clearTimeout(timeoutId)
    }
  }, [authPromptTarget, navigate])

  const closeAuthPrompt = useCallback(() => {
    setAuthPromptTarget(null)
    setAuthPromptSecondsLeft(AUTH_PROMPT_SECONDS)
  }, [])

  const navigateToSignIn = useCallback(() => {
    const redirect = authPromptTarget?.href || '/'
    setAuthPromptTarget(null)
    navigate({ to: '/sign-in', search: { redirect } })
  }, [authPromptTarget?.href, navigate])

  const handleNavLinkClick = useCallback(
    (
      event: React.MouseEvent<HTMLAnchorElement>,
      link: TopNavLink,
      closeMobile = false
    ) => {
      if (link.disabled) {
        event.preventDefault()
        return
      }

      if (link.requiresAuth) {
        event.preventDefault()
        if (closeMobile) {
          setMobileOpen(false)
        }
        setAuthPromptSecondsLeft(AUTH_PROMPT_SECONDS)
        setAuthPromptTarget({
          title: t(link.title),
          href: link.href,
        })
        return
      }

      if (closeMobile) {
        setMobileOpen(false)
      }
    },
    [t]
  )

  let logoNode: React.ReactNode = customLogo
  if (loading) {
    logoNode = <Skeleton className='size-full rounded-md' />
  } else if (!customLogo) {
    logoNode = (
      <HeaderLogo
        src={systemLogo}
        loading={loading}
        logoLoaded={logoLoaded}
        className='size-full rounded-md object-contain'
      />
    )
  }

  let authNode: React.ReactNode
  if (loading) {
    authNode = <Skeleton className='h-8 w-20 rounded-md' />
  } else if (isAuthenticated) {
    authNode = <ProfileDropdown />
  } else {
    authNode = (
      <div className='hidden items-center gap-2 sm:flex'>
        <Button variant='ghost' size='sm' render={<Link to='/sign-in' />}>
          {t('Sign in')}
        </Button>
        {registerEnabled && (
          <Button size='sm' render={<Link to='/sign-up' />}>
            {t('Sign up')}
          </Button>
        )}
      </div>
    )
  }

  const renderNavLink = (link: TopNavLink, className: string) => {
    const linkClassName = cn(
      className,
      link.disabled && 'pointer-events-none opacity-50'
    )
    if (link.external) {
      return (
        <a
          key={`${link.href}#${link.hash ?? ''}`}
          href={link.href}
          target='_blank'
          rel='noopener noreferrer'
          aria-disabled={link.disabled}
          tabIndex={link.disabled ? -1 : undefined}
          onClick={(event) => handleNavLinkClick(event, link, true)}
          className={linkClassName}
        >
          {t(link.title)}
        </a>
      )
    }
    return (
      <Link
        key={`${link.href}#${link.hash ?? ''}`}
        to={link.href}
        hash={link.hash}
        disabled={link.disabled}
        onClick={(event) => handleNavLinkClick(event, link, true)}
        className={linkClassName}
      >
        {t(link.title)}
      </Link>
    )
  }

  return (
    <>
      <header className='bg-background/80 fixed inset-x-0 top-0 z-50 w-full border-b backdrop-blur'>
        <div className='mx-auto flex h-14 max-w-6xl items-center gap-4 px-4 sm:px-6'>
          <Link to={homeUrl} className='group flex shrink-0 items-center gap-2'>
            <div className='flex size-7 shrink-0 items-center justify-center'>
              {logoNode}
            </div>
            <span className='text-base leading-none font-semibold tracking-tight'>
              {loading ? <Skeleton className='h-4 w-16' /> : displaySiteName}
            </span>
          </Link>

          <nav className='ml-4 hidden items-center gap-1 md:flex'>
            {links.map((link) =>
              renderNavLink(
                link,
                'text-foreground hover:bg-muted inline-flex h-7 items-center rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] font-medium whitespace-nowrap transition-all'
              )
            )}
          </nav>

          <div className='ml-auto flex items-center gap-2'>
            <div className='flex items-center gap-1'>
              {showLanguageSwitcher && <PublicLanguageToggle />}
              {showThemeSwitch && <ThemeToggle />}
            </div>
            {showNotifications && isAuthenticated && (
              <div className='hidden md:block'>
                <NotificationPopover
                  open={notifications.popoverOpen}
                  onOpenChange={notifications.setPopoverOpen}
                  unreadCount={notifications.unreadCount}
                  activeTab={notifications.activeTab}
                  onTabChange={notifications.setActiveTab}
                  notice={notifications.notice}
                  announcements={notifications.announcements}
                  loading={notifications.loading}
                />
              </div>
            )}
            {showAuthButtons && authNode}
            <Button
              type='button'
              variant='ghost'
              size='icon-sm'
              className='md:hidden'
              onClick={() => setMobileOpen((open) => !open)}
              aria-label={t('Toggle navigation menu')}
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X /> : <Menu />}
            </Button>
          </div>
        </div>

        {mobileOpen && (
          <div className='bg-background border-t md:hidden'>
            <nav className='mx-auto flex max-w-6xl flex-col gap-1 px-4 py-3'>
              {links.map((link) =>
                renderNavLink(
                  link,
                  'text-foreground hover:bg-muted rounded-md px-3 py-2 text-sm font-medium'
                )
              )}
              {showAuthButtons && !loading && (
                <div className='mt-2 flex flex-col gap-2 border-t pt-3'>
                  {isAuthenticated ? (
                    <Button
                      render={<Link to='/dashboard' />}
                      onClick={() => setMobileOpen(false)}
                    >
                      {t('Go to Dashboard')}
                    </Button>
                  ) : (
                    <>
                      <Button
                        variant='outline'
                        render={<Link to='/sign-in' />}
                        onClick={() => setMobileOpen(false)}
                      >
                        {t('Sign in')}
                      </Button>
                      {registerEnabled && (
                        <Button
                          render={<Link to='/sign-up' />}
                          onClick={() => setMobileOpen(false)}
                        >
                          {t('Sign up')}
                        </Button>
                      )}
                    </>
                  )}
                </div>
              )}
            </nav>
          </div>
        )}
      </header>

      <Dialog
        open={!!authPromptTarget}
        onOpenChange={(open) => {
          if (!open) {
            closeAuthPrompt()
          }
        }}
        title={t('Sign in required')}
        description={t('Please sign in to view {{module}}.', {
          module: authPromptTarget?.title || '',
        })}
        contentClassName='sm:max-w-md'
        contentHeight='auto'
        footer={
          <>
            <Button variant='outline' onClick={closeAuthPrompt}>
              {t('Cancel')}
            </Button>
            <Button onClick={navigateToSignIn}>{t('Sign in now')}</Button>
          </>
        }
      >
        <div className='bg-muted/40 text-muted-foreground rounded-lg px-3 py-2 text-sm'>
          {t('Redirecting to sign in in {{seconds}} seconds.', {
            seconds: authPromptSecondsLeft,
          })}
        </div>
      </Dialog>
    </>
  )
}

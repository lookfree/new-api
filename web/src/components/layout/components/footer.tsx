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
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { useSystemConfig } from '@/hooks/use-system-config'
import { cn } from '@/lib/utils'

interface FooterLink {
  text: string
  href: string
}

interface FooterColumnProps {
  title: string
  links: FooterLink[]
}

interface FooterProps {
  logo?: string
  name?: string
  columns?: FooterColumnProps[]
  copyright?: string
  className?: string
}

const NEW_API_FOOTER_ATTRIBUTION_KEY = [
  'footer',
  'new' + 'api',
  'projectAttributionSuffix',
].join('.')

function FooterLinkItem(props: { link: FooterLink }) {
  const { t } = useTranslation()
  const isExternal = props.link.href.startsWith('http')
  const label = t(props.link.text)

  if (isExternal) {
    return (
      <a
        href={props.link.href}
        target='_blank'
        rel='noopener noreferrer'
        className='text-muted-foreground hover:text-foreground text-sm transition-colors duration-200'
      >
        {label}
      </a>
    )
  }

  const [path, hash] = props.link.href.split('#')
  return (
    <Link
      to={path || '/'}
      hash={hash}
      className='text-muted-foreground hover:text-foreground text-sm transition-colors duration-200'
    >
      {label}
    </Link>
  )
}

// inline=true returns just the inner span for composition in a parent flex
// row. inline=false wraps in a centered/right-aligned div (default).
function ProjectAttribution(props: { currentYear: number; inline?: boolean }) {
  const { t } = useTranslation()
  const content = (
    <span className='text-muted-foreground/45'>
      &copy; {props.currentYear}{' '}
      <a
        href='https://github.com/QuantumNous/new-api'
        target='_blank'
        rel='noopener noreferrer'
        className='text-foreground/70 hover:text-foreground font-medium transition-colors'
      >
        {t('New API')}
      </a>
      . {t(NEW_API_FOOTER_ATTRIBUTION_KEY)}
    </span>
  )
  if (props.inline) {
    return content
  }
  return (
    <div className='text-muted-foreground/45 text-center text-xs sm:text-right'>
      {content}
    </div>
  )
}

export function Footer(props: FooterProps) {
  const { t } = useTranslation()
  const {
    systemName,
    logo: systemLogo,
    footerHtml,
    demoSiteEnabled,
  } = useSystemConfig()

  const displayLogo = systemLogo || props.logo || '/logo.png'
  const displayName = systemName || props.name || 'New API'
  const isDemoSiteMode = Boolean(demoSiteEnabled)
  const currentYear = new Date().getFullYear()

  const fallbackColumns = useMemo<FooterColumnProps[]>(
    () => [
      {
        title: t('footer.columns.about.title'),
        links: [
          {
            text: t('footer.columns.about.links.aboutProject'),
            href: 'https://docs.newapi.pro/wiki/project-introduction/',
          },
          {
            text: t('footer.columns.about.links.contact'),
            href: 'https://docs.newapi.pro/support/community-interaction/',
          },
          {
            text: t('footer.columns.about.links.features'),
            href: 'https://docs.newapi.pro/wiki/features-introduction/',
          },
        ],
      },
      {
        title: t('footer.columns.docs.title'),
        links: [
          {
            text: t('footer.columns.docs.links.quickStart'),
            href: 'https://docs.newapi.pro/getting-started/',
          },
          {
            text: t('footer.columns.docs.links.installation'),
            href: 'https://docs.newapi.pro/installation/',
          },
          {
            text: t('footer.columns.docs.links.apiDocs'),
            href: 'https://docs.newapi.pro/api/',
          },
        ],
      },
      {
        title: t('footer.columns.related.title'),
        links: [
          {
            text: t('footer.columns.related.links.oneApi'),
            href: 'https://github.com/songquanpeng/one-api',
          },
          {
            text: t('footer.columns.related.links.midjourney'),
            href: 'https://github.com/novicezk/midjourney-proxy',
          },
          {
            text: t('footer.columns.related.links.newApiKeyTool'),
            href: 'https://github.com/Calcium-Ion/new-api-key-tool',
          },
        ],
      },
    ],
    [t]
  )

  const zetoneColumns = useMemo<FooterColumnProps[]>(
    () => [
      {
        title: 'Product',
        links: [
          { text: 'Model marketplace', href: '/pricing' },
          { text: 'Prices', href: '/#pricing' },
          { text: 'API docs', href: '/docs' },
          { text: 'Refer & earn', href: '/invite' },
        ],
      },
      {
        title: 'Resources',
        links: [
          { text: 'Docs', href: '/docs' },
          { text: 'Contact', href: '/contact' },
          { text: 'Console', href: '/dashboard' },
        ],
      },
      {
        title: 'Company',
        links: [
          { text: 'Contact', href: '/contact' },
          { text: 'Terms of Service', href: '/user-agreement' },
          { text: 'Privacy Policy', href: '/privacy-policy' },
        ],
      },
    ],
    []
  )

  const displayColumns =
    props.columns ?? (isDemoSiteMode ? fallbackColumns : zetoneColumns)

  return (
    <footer className={cn('bg-background relative z-10', props.className)}>
      <div className='mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1.4fr_repeat(3,1fr)]'>
        <div>
          <Link to='/' className='flex items-center gap-2'>
            <img
              src={displayLogo}
              alt={displayName}
              className='size-7 rounded-md object-contain'
            />
            <span className='text-base leading-none font-semibold tracking-tight'>
              {displayName}
            </span>
          </Link>
          {footerHtml ? (
            <div
              className='custom-footer text-muted-foreground mt-4 max-w-xs text-sm leading-relaxed'
              dangerouslySetInnerHTML={{ __html: footerHtml }}
            />
          ) : (
            <p className='text-muted-foreground mt-4 max-w-xs text-sm leading-relaxed'>
              {t('One API for every model — at home and abroad')}
            </p>
          )}
        </div>
        {displayColumns.map((column) => (
          <div key={column.title}>
            <h3 className='text-sm font-semibold'>{t(column.title)}</h3>
            <ul className='mt-3 flex flex-col gap-2'>
              {column.links.map((link) => (
                <li key={`${link.text}-${link.href}`}>
                  <FooterLinkItem link={link} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className='border-t'>
        <div className='text-muted-foreground mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-5 text-xs sm:flex-row sm:px-6'>
          <p>
            &copy; {currentYear} {displayName}.{' '}
            {props.copyright ?? t('All rights reserved.')}
          </p>
          <ProjectAttribution currentYear={currentYear} inline />
        </div>
      </div>
    </footer>
  )
}

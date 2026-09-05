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
/**
 * Developer documentation.
 *
 * The nav item for this page already existed but pointed at a route that was
 * never built, so `/docs` returned the 404 page whenever no external docs URL
 * was configured. Content mirrors the Zetone prototype: quick start, auth,
 * call examples, model list, billing and error codes.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { PublicLayout } from '@/components/layout'
import { PageTransition } from '@/components/page-transition'
import { useStatus } from '@/hooks/use-status'
import { cn } from '@/lib/utils'

import { SampleTabs } from './components/sample-tabs'
import {
  isScrolledToBottom,
  pickActiveSection,
  type SectionOffset,
} from './lib/active-section'
import { resolveApiBaseUrl } from './lib/base-url'
import {
  buildCallSamples,
  buildModelListSample,
  FALLBACK_SAMPLE_MODEL,
} from './lib/samples'

const SECTIONS = [
  { id: 'quickstart', title: 'Quick start' },
  { id: 'auth', title: 'Authentication' },
  { id: 'examples', title: 'Call examples' },
  { id: 'models', title: 'Model list' },
  { id: 'billing', title: 'Billing' },
  { id: 'errors', title: 'Error codes' },
] as const

type SectionId = (typeof SECTIONS)[number]['id']

/**
 * Distance below the viewport top at which a heading counts as "reached".
 * Clears the sticky site header so the highlight changes when the heading
 * becomes visible, not when it slides under the header.
 */
const READING_LINE_OFFSET = 120

const ERROR_CODES: { code: string; meaning: string }[] = [
  { code: '401', meaning: 'Unauthorized: missing or invalid key' },
  { code: '403', meaning: 'Forbidden: the key cannot access this model' },
  { code: '429', meaning: 'Too many requests: rate limited' },
  { code: '500', meaning: 'Upstream error, please retry later' },
]

export function Docs() {
  const { t } = useTranslation()
  const { status } = useStatus()
  const [activeSection, setActiveSection] = useState<SectionId>('quickstart')
  const sectionRefs = useRef<Partial<Record<SectionId, HTMLElement | null>>>({})

  const baseUrl = useMemo(() => resolveApiBaseUrl(status), [status])
  const callSamples = useMemo(
    () => buildCallSamples(baseUrl, FALLBACK_SAMPLE_MODEL),
    [baseUrl]
  )
  const modelListSample = useMemo(
    () => buildModelListSample(baseUrl),
    [baseUrl]
  )

  // Highlight the section the reader is currently in. Measured on scroll rather
  // than with IntersectionObserver, because the sections are registered by
  // callback refs whose timing relative to the observer setup is not guaranteed
  // once the page transition wrapper is involved.
  useEffect(() => {
    let frame = 0

    const measure = () => {
      frame = 0
      const offsets: SectionOffset<SectionId>[] = []
      for (const section of SECTIONS) {
        const element = sectionRefs.current[section.id]
        if (element) {
          offsets.push({
            id: section.id,
            top: element.getBoundingClientRect().top,
          })
        }
      }
      const next = pickActiveSection(offsets, {
        readingLine: READING_LINE_OFFSET,
        atBottom: isScrolledToBottom(
          window.scrollY,
          window.innerHeight,
          document.documentElement.scrollHeight
        ),
      })
      if (next) setActiveSection(next)
    }

    const schedule = () => {
      if (frame) return
      frame = window.requestAnimationFrame(measure)
    }

    measure()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    return () => {
      if (frame) window.cancelAnimationFrame(frame)
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
    }
  }, [])

  const scrollToSection = (id: SectionId) => {
    setActiveSection(id)
    sectionRefs.current[id]?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })
  }

  return (
    <PublicLayout showMainContainer={false}>
      <PageTransition className='mx-auto w-full max-w-6xl px-4 pt-16 pb-16 sm:px-6 sm:pt-20'>
        <header className='mb-10'>
          <h1 className='text-[clamp(1.875rem,4vw,2.5rem)] leading-tight font-bold tracking-tight'>
            {t('Documentation')}
          </h1>
          <p className='text-muted-foreground/80 mt-3 max-w-2xl leading-relaxed'>
            {t(
              'Call every model through one OpenAI-compatible endpoint. Point your client at the base URL below and switch models by changing a single field.'
            )}
          </p>
        </header>

        <div className='grid gap-10 md:grid-cols-[190px_minmax(0,1fr)]'>
          <aside className='md:sticky md:top-20 md:h-fit'>
            <p className='text-muted-foreground mb-3 text-xs font-semibold tracking-wide uppercase'>
              {t('On this page')}
            </p>
            <nav className='flex flex-col gap-1'>
              {SECTIONS.map((section) => (
                <button
                  key={section.id}
                  type='button'
                  onClick={() => scrollToSection(section.id)}
                  aria-current={
                    activeSection === section.id ? 'true' : undefined
                  }
                  className={cn(
                    'rounded-md px-3 py-1.5 text-left text-sm transition-colors',
                    activeSection === section.id
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                  )}
                >
                  {t(section.title)}
                </button>
              ))}
            </nav>
          </aside>

          <article className='min-w-0 space-y-14'>
            <DocsSection
              id='quickstart'
              title={t('Quick start')}
              refs={sectionRefs}
            >
              <p>
                {t(
                  'This gateway exposes an OpenAI-compatible API. Point base_url at the address below and use your key to call any model.'
                )}
              </p>
              <dl className='divide-border bg-muted/40 mt-4 divide-y rounded-lg border text-sm'>
                <div className='flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3'>
                  <dt className='text-muted-foreground w-24 shrink-0'>
                    {t('Base URL')}
                  </dt>
                  <dd className='font-mono break-all'>{baseUrl}/v1</dd>
                </div>
                <div className='flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3'>
                  <dt className='text-muted-foreground w-24 shrink-0'>
                    {t('Protocol')}
                  </dt>
                  <dd>{t('OpenAI compatible')}</dd>
                </div>
              </dl>
            </DocsSection>

            <DocsSection
              id='auth'
              title={t('Authentication')}
              refs={sectionRefs}
            >
              <p>
                {t(
                  'Every request carries your key as a Bearer token in the Authorization header. Create and revoke keys in the console.'
                )}
              </p>
              <div className='bg-muted/40 mt-4 rounded-lg border px-4 py-3'>
                <code className='text-foreground font-mono text-sm break-all'>
                  Authorization: Bearer &lt;your-api-key&gt;
                </code>
              </div>
            </DocsSection>

            <DocsSection
              id='examples'
              title={t('Call examples')}
              refs={sectionRefs}
            >
              <p>
                {t(
                  'The examples below send one chat completion request. Switch models by changing the model field; nothing else changes.'
                )}
              </p>
              <div className='mt-4'>
                <SampleTabs samples={callSamples} />
              </div>
            </DocsSection>

            <DocsSection id='models' title={t('Model list')} refs={sectionRefs}>
              <p>
                {t(
                  'Browse the model square for pricing and capabilities, or fetch the list programmatically.'
                )}
              </p>
              <div className='mt-4'>
                <SampleTabs samples={modelListSample} />
              </div>
            </DocsSection>

            <DocsSection id='billing' title={t('Billing')} refs={sectionRefs}>
              <p>
                {t(
                  'Requests are billed per input and output token in real time. One balance covers every model; usage and spend are itemized in the console.'
                )}
              </p>
            </DocsSection>

            <DocsSection
              id='errors'
              title={t('Error codes')}
              refs={sectionRefs}
            >
              <p>
                {t(
                  'The API follows standard HTTP status codes. Error responses carry an error.code and an error.message field.'
                )}
              </p>
              <div className='mt-4 overflow-x-auto rounded-lg border'>
                <table className='w-full text-sm'>
                  <thead className='bg-muted/50 text-left'>
                    <tr>
                      <th className='px-4 py-2 font-medium'>{t('Status')}</th>
                      <th className='px-4 py-2 font-medium'>{t('Meaning')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ERROR_CODES.map((row) => (
                      <tr key={row.code} className='border-t'>
                        <td className='text-primary px-4 py-2 font-mono tabular-nums'>
                          {row.code}
                        </td>
                        <td className='text-muted-foreground px-4 py-2'>
                          {t(row.meaning)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </DocsSection>
          </article>
        </div>
      </PageTransition>
    </PublicLayout>
  )
}

function DocsSection(props: {
  id: SectionId
  title: string
  refs: React.RefObject<Partial<Record<SectionId, HTMLElement | null>>>
  children: React.ReactNode
}) {
  return (
    <section
      id={props.id}
      ref={(element) => {
        props.refs.current[props.id] = element
      }}
      className='scroll-mt-24'
    >
      <h2 className='text-2xl font-semibold tracking-tight'>{props.title}</h2>
      <div className='text-muted-foreground mt-3 leading-relaxed'>
        {props.children}
      </div>
    </section>
  )
}

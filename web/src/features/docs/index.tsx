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
 * was configured. Layout and copy mirror the Zetone prototype: quick start,
 * auth, call examples, model list, billing and error codes, with the live base
 * URL and a model from the live catalog filled into the copy and the samples.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { PublicLayout } from '@/components/layout'
import { PageTransition } from '@/components/page-transition'
import { CodeSampleCard } from '@/features/home/components/code-sample-card'
import { usePricingData } from '@/features/pricing/hooks/use-pricing-data'
import { useStatus } from '@/hooks/use-status'
import { useSystemConfig } from '@/hooks/use-system-config'
import { cn } from '@/lib/utils'

import {
  isScrolledToBottom,
  pickActiveSection,
  type SectionOffset,
} from './lib/active-section'
import { resolveApiBaseUrl } from './lib/base-url'
import { buildCallSamples, FALLBACK_SAMPLE_MODEL } from './lib/samples'

const SECTION_IDS = [
  'quickstart',
  'auth',
  'examples',
  'models',
  'billing',
  'errors',
] as const

type SectionId = (typeof SECTION_IDS)[number]

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
  const { systemName } = useSystemConfig()
  const { models } = usePricingData()
  const [activeSection, setActiveSection] = useState<SectionId>('quickstart')
  const sectionRefs = useRef<Partial<Record<SectionId, HTMLElement | null>>>({})

  const baseUrl = useMemo(() => resolveApiBaseUrl(status), [status])
  const sampleModel = models?.[0]?.model_name || FALLBACK_SAMPLE_MODEL
  const callSamples = useMemo(
    () => buildCallSamples(baseUrl, sampleModel),
    [baseUrl, sampleModel]
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
      for (const id of SECTION_IDS) {
        const element = sectionRefs.current[id]
        if (element) {
          offsets.push({ id, top: element.getBoundingClientRect().top })
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

  const titles: Record<SectionId, string> = {
    quickstart: t('Quick start'),
    auth: t('Authentication', { context: 'docs' }),
    examples: t('Call examples'),
    models: t('Model list'),
    billing: t('Billing'),
    errors: t('Error codes'),
  }

  const bodies: Record<SectionId, string> = {
    quickstart: t(
      '{{name}} exposes an OpenAI-compatible API. Point base_url to {{url}} and use your key to call any model.',
      { name: systemName, url: `${baseUrl}/v1` }
    ),
    auth: t(
      'All requests must include your key as a Bearer token in the Authorization header. Create and manage keys in the console.'
    ),
    examples: t(
      'The examples below show a chat completion request in cURL, Python and Node.js. Switch models by changing the model field.'
    ),
    models: t(
      'Browse the marketplace or call /v1/models to list available models. Use the model ID in the model field.'
    ),
    billing: t(
      'Billed per input and output token in real time. One balance covers all models; view usage and top up in the console.'
    ),
    errors: t(
      'The API follows standard HTTP status codes; error responses include error.code and error.message fields.'
    ),
  }

  return (
    <PublicLayout showMainContainer={false} showFooter>
      <PageTransition className='mx-auto w-full max-w-6xl px-4 pt-[calc(57px+2.5rem)] pb-10 md:pt-[calc(57px+3.5rem)] md:pb-14'>
        <header className='mb-8'>
          <h1 className='text-3xl font-semibold tracking-tight text-balance md:text-4xl'>
            {t('Documentation')}
          </h1>
        </header>

        <div className='grid gap-8 md:grid-cols-[200px_1fr]'>
          <aside className='md:sticky md:top-24 md:h-fit'>
            <p className='text-muted-foreground mb-3 text-xs font-semibold tracking-wide uppercase'>
              {t('On this page')}
            </p>
            <nav className='flex flex-col gap-1'>
              {SECTION_IDS.map((id) => (
                <button
                  key={id}
                  type='button'
                  onClick={() => scrollToSection(id)}
                  aria-current={activeSection === id ? 'true' : undefined}
                  className={cn(
                    'rounded-md px-3 py-1.5 text-left text-sm transition-colors',
                    activeSection === id
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                  )}
                >
                  {titles[id]}
                </button>
              ))}
            </nav>
          </aside>

          <article className='min-w-0 space-y-12'>
            {SECTION_IDS.map((id) => (
              <section
                key={id}
                id={id}
                ref={(element) => {
                  sectionRefs.current[id] = element
                }}
                className='scroll-mt-24'
              >
                <h2 className='text-2xl font-semibold tracking-tight text-pretty'>
                  {titles[id]}
                </h2>
                <p className='text-muted-foreground mt-3 leading-relaxed'>
                  {bodies[id]}
                </p>
                {id === 'examples' && (
                  <div className='mt-5'>
                    <CodeSampleCard
                      samples={callSamples}
                      highlight={sampleModel}
                    />
                  </div>
                )}
                {id === 'errors' && (
                  <div className='mt-5 overflow-hidden rounded-lg border'>
                    <table className='w-full text-sm'>
                      <thead className='bg-muted/50 text-left'>
                        <tr>
                          <th className='px-4 py-2 font-medium'>
                            {t('Status code')}
                          </th>
                          <th className='px-4 py-2 font-medium'>
                            {t('Meaning')}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {ERROR_CODES.map((row) => (
                          <tr key={row.code} className='border-t'>
                            <td className='text-primary px-4 py-2 font-mono'>
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
                )}
              </section>
            ))}
          </article>
        </div>
      </PageTransition>
    </PublicLayout>
  )
}

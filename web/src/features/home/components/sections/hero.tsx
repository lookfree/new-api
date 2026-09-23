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
import { ArrowRight, Sparkles } from 'lucide-react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { resolveApiBaseUrl } from '@/features/docs/lib/base-url'
import { useStatus } from '@/hooks/use-status'

import { buildHeroSamples } from '../../lib/hero-samples'
import { CodeSampleCard } from '../code-sample-card'
import { DocsButton } from '../docs-button'

interface HeroProps {
  className?: string
  isAuthenticated?: boolean
}

// Headline figures from the Zetone prototype. Marketing copy, not live data.
const HERO_STATS = [
  { value: '120+', labelKey: 'Available models' },
  { value: '99.9%', labelKey: 'Service uptime' },
  { value: '0.4s', labelKey: 'Avg. time to first token' },
  { value: '30k+', labelKey: 'Developers' },
] as const

export function Hero(props: HeroProps) {
  const { t } = useTranslation()
  const { status } = useStatus()

  const samples = useMemo(
    () => buildHeroSamples(resolveApiBaseUrl(status)),
    [status]
  )

  return (
    <section className='relative overflow-hidden border-b pt-14'>
      <div className='mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-24'>
        <div>
          <span className='bg-primary/10 text-primary mb-5 inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium'>
            <Sparkles className='size-3' aria-hidden='true' />
            {t('LLM aggregation gateway')}
          </span>
          <h1 className='text-4xl leading-tight font-bold tracking-tight text-pretty sm:text-5xl'>
            {t('One API for every model — at home and abroad')}
          </h1>
          <p className='text-muted-foreground mt-5 max-w-xl text-base leading-relaxed text-pretty sm:text-lg'>
            {t(
              'A unified OpenAI-compatible endpoint. One base_url, one key, one balance — with smart routing and automatic failover across leading models worldwide.'
            )}
          </p>
          <div className='mt-7 flex flex-wrap items-center gap-3'>
            {props.isAuthenticated ? (
              <Button size='lg' render={<Link to='/dashboard' />}>
                {t('Go to Dashboard')}
                <ArrowRight />
              </Button>
            ) : (
              <Button size='lg' render={<Link to='/sign-up' />}>
                {t('Get started now')}
                <ArrowRight />
              </Button>
            )}
            <DocsButton size='lg' />
          </div>

          <dl className='mt-10 grid max-w-md grid-cols-4 gap-4'>
            {HERO_STATS.map((stat) => (
              <div key={stat.labelKey}>
                <dt className='text-foreground text-2xl font-bold tracking-tight'>
                  {stat.value}
                </dt>
                <dd className='text-muted-foreground mt-1 text-xs'>
                  {t(stat.labelKey)}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <div className='lg:pl-4'>
          <CodeSampleCard samples={samples} className='shadow-lg' />
        </div>
      </div>
    </section>
  )
}

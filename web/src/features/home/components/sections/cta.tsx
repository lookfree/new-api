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
import { ArrowRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'

import { DocsButton } from '../docs-button'

interface CTAProps {
  className?: string
  isAuthenticated?: boolean
}

export function CTA(props: CTAProps) {
  const { t } = useTranslation()

  if (props.isAuthenticated) {
    return null
  }

  return (
    <section className='border-b'>
      <div className='mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20'>
        <div className='bg-card rounded-xl border px-6 py-12 text-center sm:px-12'>
          <h2 className='text-3xl font-bold tracking-tight text-balance'>
            {t('Start building today')}
          </h2>
          <p className='text-muted-foreground mx-auto mt-3 max-w-xl leading-relaxed text-pretty'>
            {t(
              'Pay as you go — top up and send your first request in minutes.'
            )}
          </p>
          <div className='mt-7 flex flex-wrap items-center justify-center gap-3'>
            <Button size='lg' render={<Link to='/sign-up' />}>
              {t('Get started now')}
              <ArrowRight />
            </Button>
            <DocsButton size='lg' />
          </div>
        </div>
      </div>
    </section>
  )
}

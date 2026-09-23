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
import { Check, Copy } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard'
import { cn } from '@/lib/utils'

import type { HeroSample } from '../lib/hero-samples'

export function CodeSampleCard(props: {
  samples: HeroSample[]
  className?: string
}) {
  const { t } = useTranslation()
  const [active, setActive] = useState(0)
  const { copiedText, copyToClipboard } = useCopyToClipboard({
    notify: false,
    resetAfterMs: 1500,
  })
  const current = props.samples[active] ?? props.samples[0]

  if (!current) return null

  const copied = copiedText === current.code

  return (
    <div
      className={cn(
        'bg-card overflow-hidden rounded-lg border',
        props.className
      )}
    >
      <div className='bg-muted/40 flex items-center justify-between border-b px-2'>
        <div
          role='tablist'
          aria-label={t('Code language')}
          className='flex items-center gap-1 overflow-x-auto'
        >
          {props.samples.map((sample, index) => {
            const isActive = index === active
            return (
              <button
                key={sample.label}
                type='button'
                role='tab'
                aria-selected={isActive}
                onClick={() => setActive(index)}
                className={cn(
                  'rounded-md px-3 py-2 text-xs font-medium transition-colors',
                  isActive
                    ? 'text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {sample.label}
                <span
                  aria-hidden='true'
                  className={cn(
                    'mt-1.5 block h-0.5 rounded-full',
                    isActive ? 'bg-primary' : 'bg-transparent'
                  )}
                />
              </button>
            )
          })}
        </div>
        <button
          type='button'
          onClick={() => copyToClipboard(current.code)}
          className='text-muted-foreground hover:text-foreground flex items-center gap-1 rounded-md px-2 py-1 text-xs transition-colors'
        >
          {copied ? (
            <Check className='size-3.5 text-emerald-600' aria-hidden='true' />
          ) : (
            <Copy className='size-3.5' aria-hidden='true' />
          )}
          {copied ? t('Copied') : t('Copy')}
        </button>
      </div>
      <pre className='overflow-x-auto p-4 text-[13px] leading-relaxed'>
        <code className='text-foreground font-mono'>{current.code}</code>
      </pre>
    </div>
  )
}

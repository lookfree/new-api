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
import { Check, Copy } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { fetchTokenKey } from '@/features/keys/api'
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard'
import { cn } from '@/lib/utils'

import { useOverviewSetup } from '../../hooks/use-overview-setup'
import { buildQuickStartSamples } from '../../lib/quick-start'

/**
 * Prototype's quick-start card. The samples carry the real base URL, model and
 * a masked key; copying substitutes the full key when the user has one, so
 * what lands on the clipboard runs as is.
 */
export function QuickStartCard() {
  const { t } = useTranslation()
  const setup = useOverviewSetup()
  const { copyToClipboard } = useCopyToClipboard({ notify: false })
  const [active, setActive] = useState(0)
  const [copying, setCopying] = useState(false)
  const [copied, setCopied] = useState(false)

  const samples = useMemo(
    () =>
      buildQuickStartSamples({
        baseUrl: setup.baseUrl,
        apiKey: setup.displayKey,
        model: setup.model,
      }),
    [setup.baseUrl, setup.displayKey, setup.model]
  )
  const current = samples[active] ?? samples[0]

  async function handleCopy() {
    if (copying) return
    setCopying(true)
    try {
      let text = current.code
      if (setup.preferredKey) {
        const result = await fetchTokenKey(setup.preferredKey.id)
        const key =
          result.success && result.data?.key ? `sk-${result.data.key}` : ''
        if (!key) {
          toast.error(result.message || t('Failed to copy to clipboard'))
          return
        }
        text = text.split(setup.displayKey).join(key)
      }
      if (await copyToClipboard(text)) {
        toast.success(t('Copied to clipboard'))
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
      } else {
        toast.error(t('Failed to copy to clipboard'))
      }
    } finally {
      setCopying(false)
    }
  }

  return (
    <Card>
      <CardHeader className='flex flex-row items-center justify-between'>
        <CardTitle>{t('Quick start')}</CardTitle>
        <Badge variant='muted'>{t('OpenAI compatible')}</Badge>
      </CardHeader>
      <CardContent>
        <div className='bg-card overflow-hidden rounded-lg border'>
          <div className='bg-muted/40 flex items-center justify-between border-b px-2'>
            <div className='flex items-center gap-1 overflow-x-auto'>
              {samples.map((sample, index) => (
                <button
                  key={sample.label}
                  type='button'
                  onClick={() => setActive(index)}
                  className={cn(
                    'rounded-md px-3 py-2 text-xs font-medium transition-colors',
                    index === active
                      ? 'text-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {sample.label}
                  {index === active && (
                    <span className='bg-primary mt-1.5 block h-0.5 rounded-full' />
                  )}
                </button>
              ))}
            </div>
            <button
              type='button'
              onClick={handleCopy}
              disabled={copying}
              aria-label={t('Copy ready-to-run curl')}
              className='text-muted-foreground hover:text-foreground flex items-center gap-1 rounded-md px-2 py-1 text-xs transition-colors'
            >
              {copied ? (
                <Check className='text-success size-3.5' />
              ) : (
                <Copy className='size-3.5' />
              )}
              {copied ? t('Copied') : t('Copy')}
            </button>
          </div>
          <pre className='overflow-x-auto p-4 text-[13px] leading-relaxed'>
            <code className='text-foreground font-mono'>{current.code}</code>
          </pre>
        </div>
        <div className='mt-3 flex justify-end gap-2'>
          <Button
            variant='outline'
            size='sm'
            render={<Link to='/marketplace' />}
          >
            {t('Browse models')}
          </Button>
          <Button variant='outline' size='sm' render={<Link to='/docs' />}>
            {t('View docs')}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

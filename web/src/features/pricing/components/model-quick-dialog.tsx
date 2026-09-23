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
import { Dialog as DialogPrimitive } from '@base-ui/react/dialog'
import { ArrowUpRight, Route, X } from 'lucide-react'
import { useEffect, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from '@/components/ui/dialog'
import { resolveApiBaseUrl } from '@/features/docs/lib/base-url'
import { CodeSampleCard } from '@/features/home/components/code-sample-card'
import { useStatus } from '@/hooks/use-status'
import { getLobeIcon } from '@/lib/lobe-icon'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth-store'

import { buildModelCallSamples } from '../lib/call-samples'
import { parseTags } from '../lib/filters'
import {
  buildQuickPriceCells,
  type QuickPriceCell,
} from '../lib/quick-price-cells'
import { pickTryGroup, supportsTryChat } from '../lib/try-it'
import type { ModelZone } from '../lib/zones'
import type { PricingModel, TokenUnit } from '../types'
import { ModelTryPanel } from './model-try-panel'

const ZONE_LABEL_KEYS = {
  domestic: 'Domestic models',
  international: 'International models',
} as const

// Static class names, so Tailwind sees every column count it may need.
const COLUMNS_CLASS: Record<number, string> = {
  1: 'sm:grid-cols-1',
  2: 'sm:grid-cols-2',
  3: 'sm:grid-cols-3',
  4: 'sm:grid-cols-4',
  5: 'sm:grid-cols-5',
}

export interface ModelQuickDialogProps {
  model: PricingModel | null
  open: boolean
  /** Scroll to the try panel and focus its message box when the dialog opens. */
  focusTry?: boolean
  zone?: ModelZone
  tokenUnit: TokenUnit
  showRechargePrice: boolean
  priceRate: number
  usdExchangeRate: number
  selectedGroup?: string
  /** Groups the viewer can bill a request to. */
  usableGroups: readonly string[]
  onOpenChange: (open: boolean) => void
  onOpenFullDetails: (model: PricingModel) => void
}

/**
 * The prototype's model detail dialog: overview, price table, capabilities,
 * routing note, call example and a real try-out chat. The full drawer with
 * per-group prices, endpoints and performance stays one click away.
 */
export function ModelQuickDialog(props: ModelQuickDialogProps) {
  const { t, i18n } = useTranslation()
  const { status } = useStatus()
  const ownGroup = useAuthStore((state) => state.auth.user?.group)
  const bodyRef = useRef<HTMLDivElement>(null)
  const tryRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const { open, focusTry } = props
  useEffect(() => {
    if (!open || !focusTry) return
    const timer = window.setTimeout(() => {
      tryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 150)
    return () => window.clearTimeout(timer)
  }, [open, focusTry])

  const model = props.model
  const cells = useMemo(
    () =>
      model
        ? buildQuickPriceCells(model, {
            tokenUnit: props.tokenUnit,
            showRechargePrice: props.showRechargePrice,
            priceRate: props.priceRate,
            usdExchangeRate: props.usdExchangeRate,
            selectedGroup: props.selectedGroup,
          })
        : [],
    [
      model,
      props.tokenUnit,
      props.showRechargePrice,
      props.priceRate,
      props.usdExchangeRate,
      props.selectedGroup,
    ]
  )
  const baseUrl = resolveApiBaseUrl(status)
  const samples = useMemo(
    () => (model ? buildModelCallSamples(baseUrl, model.model_name) : []),
    [model, baseUrl]
  )
  const tryGroup = useMemo(
    () =>
      model ? pickTryGroup(model, props.usableGroups, ownGroup) : undefined,
    [model, props.usableGroups, ownGroup]
  )

  if (!model) return null

  const tags = parseTags(model.tags)
  const chatCapable = supportsTryChat(model)
  const iconKey = model.icon || model.vendor_icon
  const icon = iconKey ? getLobeIcon(iconKey, 28) : null
  const zoneLabel =
    props.zone && props.zone !== 'other' ? t(ZONE_LABEL_KEYS[props.zone]) : null
  const brand = String(status?.system_name || 'Zetone')
  const isZh = i18n.language.startsWith('zh')
  const separator = isZh ? '、' : ', '
  const colon = isZh ? '：' : ': '

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogPortal>
        <DialogOverlay className='bg-foreground/50 supports-backdrop-filter:backdrop-blur-sm' />
        <DialogPrimitive.Viewport className='fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:p-6'>
          <DialogPrimitive.Popup
            data-slot='dialog-content'
            initialFocus={(openType) => {
              // Focus without scrolling: the overlay scrolls, and focusing the
              // tall body would otherwise pull it away from the header. The
              // message box stays unfocused on touch, to keep the keyboard shut.
              const target =
                focusTry && openType !== 'touch'
                  ? inputRef.current
                  : bodyRef.current
              target?.focus({ preventScroll: true })
              return false
            }}
            className='bg-background data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 relative my-4 w-full max-w-2xl rounded-xl border shadow-xl duration-100 outline-none'
          >
            <div className='flex items-center gap-3 border-b p-5'>
              <span className='bg-primary/10 text-primary flex size-11 shrink-0 items-center justify-center rounded-lg font-mono text-sm font-semibold'>
                {icon || model.model_name.charAt(0).toUpperCase()}
              </span>
              <div className='min-w-0'>
                <DialogTitle className='truncate text-lg leading-7 font-semibold tracking-tight'>
                  {model.model_name}
                </DialogTitle>
                <DialogDescription className='truncate'>
                  {model.vendor_name || t('Model details')}
                </DialogDescription>
              </div>
              <div className='ms-auto flex shrink-0 items-center gap-2'>
                {zoneLabel && (
                  <Badge variant='muted' className='max-sm:hidden'>
                    {zoneLabel}
                  </Badge>
                )}
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => props.onOpenFullDetails(model)}
                >
                  <span className='max-sm:sr-only'>{t('Full details')}</span>
                  <ArrowUpRight aria-hidden='true' />
                </Button>
                <DialogPrimitive.Close
                  aria-label={t('Close')}
                  className='text-muted-foreground hover:bg-muted hover:text-foreground rounded-md p-1.5 transition-colors'
                >
                  <X className='size-5' aria-hidden='true' />
                </DialogPrimitive.Close>
              </div>
            </div>

            <div
              ref={bodyRef}
              tabIndex={-1}
              className='space-y-6 p-5 outline-none'
            >
              <section>
                <h3 className='text-sm font-semibold'>{t('Model overview')}</h3>
                <p className='text-muted-foreground mt-1.5 text-sm leading-relaxed'>
                  {model.description?.trim() ||
                    t(
                      'This model is available through the OpenAI-compatible API. Just set the model field to call it — no other code changes needed.'
                    )}
                </p>
              </section>

              {cells.length > 0 && (
                <section>
                  <h3 className='mb-2 text-sm font-semibold'>
                    {t('Price table')}
                  </h3>
                  <div
                    className={cn(
                      'bg-border grid grid-cols-2 gap-px overflow-hidden rounded-lg border',
                      COLUMNS_CLASS[cells.length]
                    )}
                  >
                    {cells.map((cell, index) => (
                      <PriceCell
                        key={cell.kind}
                        cell={cell}
                        tokenUnit={props.tokenUnit}
                        spanOnMobile={
                          index === cells.length - 1 && cells.length % 2 === 1
                        }
                      />
                    ))}
                  </div>
                </section>
              )}

              {tags.length > 0 && (
                <section>
                  <h3 className='mb-2 text-sm font-semibold'>
                    {t('Capability tags')}
                  </h3>
                  <div className='flex flex-wrap gap-1.5'>
                    {tags.map((tag) => (
                      <Badge key={tag} variant='brand'>
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  <p className='text-muted-foreground mt-2.5 text-sm'>
                    <span className='text-foreground font-medium'>
                      {t('Use cases')}
                      {colon}
                    </span>
                    {tags.join(separator)}
                  </p>
                </section>
              )}

              <section className='bg-muted/40 rounded-lg border p-4'>
                <h3 className='flex items-center gap-2 text-sm font-semibold'>
                  <Route className='text-primary size-4' aria-hidden='true' />
                  {t('Provider & routing')}
                </h3>
                <p className='text-muted-foreground mt-1.5 text-sm leading-relaxed'>
                  {t(
                    'Requests are routed through the {{name}} gateway to the best upstream channel, with second-level failover for stability.',
                    { name: brand }
                  )}
                </p>
              </section>

              {chatCapable ? (
                <>
                  <section>
                    <h3 className='mb-2 text-sm font-semibold'>
                      {t('Call example')}
                    </h3>
                    <CodeSampleCard
                      samples={samples}
                      highlight={model.model_name}
                    />
                  </section>

                  <div ref={tryRef}>
                    <ModelTryPanel
                      model={model}
                      group={tryGroup}
                      inputRef={inputRef}
                    />
                  </div>
                </>
              ) : (
                <section className='bg-muted/40 flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4'>
                  <p className='text-muted-foreground text-sm leading-relaxed'>
                    {t(
                      'This is not a chat model, so it cannot be tried here. See the full details for its endpoints and call examples.'
                    )}
                  </p>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={() => props.onOpenFullDetails(model)}
                  >
                    {t('Full details')}
                    <ArrowUpRight aria-hidden='true' />
                  </Button>
                </section>
              )}
            </div>
          </DialogPrimitive.Popup>
        </DialogPrimitive.Viewport>
      </DialogPortal>
    </Dialog>
  )
}

function PriceCell(props: {
  cell: QuickPriceCell
  tokenUnit: TokenUnit
  spanOnMobile: boolean
}) {
  const { t } = useTranslation()
  const cell = props.cell

  let label = t('Pricing')
  let value = ''
  let sub = ''
  switch (cell.kind) {
    case 'input':
      label = t('Input')
      value = cell.value
      sub = t(props.tokenUnit === 'K' ? '/ 1K tokens' : '/ 1M tokens')
      break
    case 'output':
      label = t('Output')
      value = cell.value
      sub = t(props.tokenUnit === 'K' ? '/ 1K tokens' : '/ 1M tokens')
      break
    case 'cache':
      label = t('Cached')
      value = cell.value
      sub = t(props.tokenUnit === 'K' ? '/ 1K tokens' : '/ 1M tokens')
      break
    case 'context':
      label = t('Context')
      value = cell.value
      break
    case 'maxOutput':
      label = t('Max output')
      value = cell.value
      sub = t('tokens')
      break
    case 'requestPrice':
      value = cell.value
      sub = t('per request')
      break
    case 'dynamic':
      value = t('Dynamic Pricing')
      sub = t('See the full details for tier prices.')
      break
    case 'usage':
      value = t('Usage-based billing · price not configured')
      break
  }

  return (
    <div
      className={cn('bg-card p-3', props.spanOnMobile && 'max-sm:col-span-2')}
    >
      <p className='text-muted-foreground text-xs'>{label}</p>
      <p className='mt-1 flex flex-wrap items-baseline gap-x-1 font-semibold tabular-nums'>
        {value}
        {sub && (
          <span className='text-muted-foreground text-[11px] font-normal'>
            {sub}
          </span>
        )}
      </p>
    </div>
  )
}

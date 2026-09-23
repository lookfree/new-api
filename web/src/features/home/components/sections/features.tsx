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
import { CreditCard, GitBranch, Globe2, Plug } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Card } from '@/components/ui/card'

const FEATURE_ITEMS = [
  {
    icon: Plug,
    titleKey: 'Unified OpenAI-compatible API',
    descKey:
      'One base_url and one key for every model. Switch models by changing the model name — zero migration cost.',
  },
  {
    icon: GitBranch,
    titleKey: 'Smart routing & failover',
    descKey:
      'Automatically picks the best upstream channel and fails over in seconds, keeping your calls stable.',
  },
  {
    icon: CreditCard,
    titleKey: 'Pay-as-you-go billing',
    descKey:
      'Real-time per-token billing. One balance covers every model, with clear usage and spend.',
  },
  {
    icon: Globe2,
    titleKey: 'Domestic & international zones',
    descKey:
      'Domestic and international models in clearly separated zones for compliant, flexible access.',
  },
] as const

export function Features() {
  const { t } = useTranslation()

  return (
    <section id='how-it-works' className='border-b'>
      <div className='mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:py-20'>
        <div className='max-w-2xl'>
          <h2 className='text-3xl font-bold tracking-tight text-balance'>
            {t('How it works', { context: 'home' })}
          </h2>
          <p className='text-muted-foreground mt-3 leading-relaxed text-pretty'>
            {t(
              'Switch models by changing a single field — the rest of your code stays the same.'
            )}
          </p>
        </div>

        <div className='mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
          {FEATURE_ITEMS.map((item) => {
            const Icon = item.icon
            return (
              <Card key={item.titleKey} className='gap-0 p-5'>
                <span className='bg-primary/10 text-primary flex size-10 items-center justify-center rounded-lg'>
                  <Icon className='size-5' aria-hidden='true' />
                </span>
                <h3 className='mt-4 font-semibold'>{t(item.titleKey)}</h3>
                <p className='text-muted-foreground mt-2 text-sm leading-relaxed'>
                  {t(item.descKey)}
                </p>
              </Card>
            )
          })}
        </div>
      </div>
    </section>
  )
}

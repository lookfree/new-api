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
import { useTranslation } from 'react-i18next'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

import type { OverviewModelShare } from '../../lib/overview-usage'

/** Prototype's ranked list: model name, share of calls, progress bar. */
export function TopModelsCard(props: {
  models: OverviewModelShare[]
  loading: boolean
}) {
  const { t } = useTranslation()

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('Most called models')}</CardTitle>
      </CardHeader>
      <CardContent className='space-y-3'>
        {props.models.length === 0 && (
          <p className='text-muted-foreground py-10 text-center text-sm'>
            {props.loading ? t('Loading...') : t('No usage yet')}
          </p>
        )}
        {props.models.map((model) => (
          <div key={model.model}>
            <div className='mb-1 flex items-center justify-between gap-2 text-sm'>
              <span className='min-w-0 truncate font-medium'>
                {model.model}
              </span>
              <span className='text-muted-foreground tabular-nums'>
                {model.share}%
              </span>
            </div>
            <div className='bg-muted h-2 overflow-hidden rounded-full'>
              <div
                className='bg-primary h-full rounded-full'
                style={{ width: `${model.share}%` }}
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

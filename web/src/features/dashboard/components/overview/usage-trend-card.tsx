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
import { VChart } from '@visactor/react-vchart'
import { useTranslation } from 'react-i18next'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useTheme } from '@/context/theme-provider'
import { formatNumber } from '@/lib/format'
import { VCHART_OPTION } from '@/lib/vchart'

import type { OverviewDailyUsage } from '../../lib/overview-usage'

// VChart draws on canvas, which cannot read the oklch CSS variables; these
// are the sRGB equivalents of the prototype's --chart-1 in each theme.
const CHART_COLOR = { light: '#ba0000', dark: '#db2d25' } as const

/** Prototype's area chart of the last seven days of requests. */
export function UsageTrendCard(props: {
  daily: OverviewDailyUsage[]
  loading: boolean
}) {
  const { t } = useTranslation()
  const { resolvedTheme } = useTheme()
  const theme = resolvedTheme === 'dark' ? 'dark' : 'light'
  const color = CHART_COLOR[theme]

  // With no traffic the axis would otherwise count in fractions of a request.
  const hasTraffic = props.daily.some((day) => day.requests > 0)

  const spec = {
    type: 'area',
    data: [{ id: 'daily', values: props.daily }],
    xField: 'day',
    yField: 'requests',
    line: { style: { stroke: color, lineWidth: 2, curveType: 'monotone' } },
    area: {
      style: {
        curveType: 'monotone',
        fill: {
          gradient: 'linear',
          x0: 0.5,
          y0: 0,
          x1: 0.5,
          y1: 1,
          stops: [
            { offset: 0, color, opacity: 0.35 },
            { offset: 1, color, opacity: 0 },
          ],
        },
      },
    },
    point: { visible: false },
    axes: [
      {
        orient: 'left',
        min: 0,
        ...(hasTraffic ? {} : { max: 4 }),
        grid: { style: { lineDash: [3, 3] } },
        domainLine: { visible: false },
        tick: { visible: false },
      },
      {
        orient: 'bottom',
        // Points run edge to edge instead of sitting inside band padding.
        trimPadding: true,
        domainLine: { visible: false },
        tick: { visible: false },
      },
    ],
    tooltip: {
      mark: {
        content: [
          {
            key: t('Requests'),
            value: (d: { requests: number }) => formatNumber(d?.requests),
          },
        ],
      },
    },
    theme,
    background: 'transparent',
  }

  return (
    <Card className='lg:col-span-2'>
      <CardHeader>
        <CardTitle>{t('Usage — last 7 days')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className='h-64'>
          {!props.loading && (
            <VChart key={theme} spec={spec} option={VCHART_OPTION} />
          )}
        </div>
      </CardContent>
    </Card>
  )
}

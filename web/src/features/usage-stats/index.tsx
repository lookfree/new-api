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
import { useQuery } from '@tanstack/react-query'
import { VChart } from '@visactor/react-vchart'
import { Activity, Coins, Cpu } from 'lucide-react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { ConsolePageHeader } from '@/components/layout'
import { StatTile } from '@/components/stat-tile'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useTheme } from '@/context/theme-provider'
import { getUserQuotaDates } from '@/features/dashboard/api'
import { splitQueryRange } from '@/features/dashboard/lib/overview-usage'
import { formatCompactNumber, formatNumber, formatQuota } from '@/lib/format'
import { VCHART_OPTION } from '@/lib/vchart'

import {
  OTHER_MODELS_KEY,
  summarizeUsage,
  usageRangeStart,
} from './lib/summarize'

// VChart draws on canvas, which cannot read the oklch CSS variables; these are
// the sRGB equivalents of the Zetone --chart-1..5 tokens.
const CHART_COLORS = ['#ba0000', '#00a445', '#db7600', '#6c6867', '#a59c9b']

export function UsageStats() {
  const { t } = useTranslation()
  const { resolvedTheme } = useTheme()
  const chartTheme = resolvedTheme === 'dark' ? 'dark' : 'light'

  const range = useMemo(
    () => ({
      start: usageRangeStart(new Date()),
      end: Math.floor(Date.now() / 1000),
    }),
    []
  )

  // The endpoint refuses ranges over 30 days, and the month tiles can need 31.
  const query = useQuery({
    queryKey: ['usage-stats', range.start, range.end],
    queryFn: async () => {
      const pages = await Promise.all(
        splitQueryRange(range.start, range.end).map(([start, end]) =>
          getUserQuotaDates({
            start_timestamp: start,
            end_timestamp: end,
            default_time: 'hour',
          })
        )
      )
      return pages.flatMap((page) => page.data ?? [])
    },
    staleTime: 60 * 1000,
  })

  const summary = useMemo(
    () => summarizeUsage(query.data ?? [], new Date()),
    [query.data]
  )

  const pieData = summary.byModel.map((slice) => ({
    model: slice.model === OTHER_MODELS_KEY ? t('Others') : slice.model,
    share: slice.share,
  }))

  const barSpec = {
    type: 'bar',
    data: [{ id: 'daily', values: summary.daily }],
    xField: 'day',
    yField: 'requests',
    bar: { style: { fill: CHART_COLORS[0], cornerRadius: [4, 4, 0, 0] } },
    axes: [
      { orient: 'left', grid: { style: { lineDash: [3, 3] } } },
      { orient: 'bottom' },
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
    theme: chartTheme,
    background: 'transparent',
  }

  const pieSpec = {
    type: 'pie',
    data: [{ id: 'models', values: pieData }],
    categoryField: 'model',
    valueField: 'share',
    innerRadius: 0.6,
    outerRadius: 0.9,
    padAngle: 1,
    color: CHART_COLORS,
    label: { visible: false },
    legends: { visible: false },
    tooltip: {
      mark: {
        content: [
          {
            key: (d: { model: string }) => d?.model,
            value: (d: { share: number }) => `${d?.share}%`,
          },
        ],
      },
    },
    theme: chartTheme,
    background: 'transparent',
  }

  const lineSpec = {
    type: 'line',
    data: [{ id: 'daily', values: summary.daily }],
    xField: 'day',
    yField: 'tokens',
    line: { style: { stroke: CHART_COLORS[1], lineWidth: 2 } },
    point: {
      style: { fill: CHART_COLORS[1], size: 6, stroke: CHART_COLORS[1] },
    },
    axes: [
      {
        orient: 'left',
        grid: { style: { lineDash: [3, 3] } },
        label: { formatMethod: (v: number) => formatCompactNumber(v) },
      },
      { orient: 'bottom' },
    ],
    tooltip: {
      mark: {
        content: [
          {
            key: t('Tokens'),
            value: (d: { tokens: number }) => formatNumber(d?.tokens),
          },
        ],
      },
    },
    theme: chartTheme,
    background: 'transparent',
  }

  return (
    <div className='space-y-6'>
      <ConsolePageHeader
        title={t('Usage statistics')}
        description={t(
          'View requests, token consumption and spend distribution.'
        )}
      />

      <div className='grid gap-4 sm:grid-cols-3'>
        <StatTile
          label={t('Requests this month')}
          value={formatNumber(summary.monthRequests)}
          icon={<Activity />}
        />
        <StatTile
          label={t('Tokens this month')}
          value={formatCompactNumber(summary.monthTokens)}
          icon={<Cpu />}
        />
        <StatTile
          label={t("Today's spend")}
          value={formatQuota(summary.todayQuota)}
          icon={<Coins />}
        />
      </div>

      <div className='grid gap-4 lg:grid-cols-3'>
        <Card className='lg:col-span-2'>
          <CardHeader>
            <CardTitle>{t('Daily requests')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className='h-64'>
              {!query.isLoading && (
                <VChart
                  key={`bar-${chartTheme}`}
                  spec={barSpec}
                  option={VCHART_OPTION}
                />
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('Spend by model')}</CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length === 0 ? (
              <div className='text-muted-foreground flex h-64 items-center justify-center text-sm'>
                {t('No usage yet')}
              </div>
            ) : (
              <>
                <div className='h-64'>
                  <VChart
                    key={`pie-${chartTheme}`}
                    spec={pieSpec}
                    option={VCHART_OPTION}
                  />
                </div>
                <div className='mt-2 space-y-1.5'>
                  {pieData.map((slice, i) => (
                    <div
                      key={slice.model}
                      className='flex items-center gap-2 text-xs'
                    >
                      <span
                        className='size-2.5 rounded-full'
                        style={{
                          background: CHART_COLORS[i % CHART_COLORS.length],
                        }}
                      />
                      <span className='text-muted-foreground flex-1 truncate'>
                        {slice.model}
                      </span>
                      <span className='tabular-nums'>{slice.share}%</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('Token usage trend')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className='h-56'>
            {!query.isLoading && (
              <VChart
                key={`line-${chartTheme}`}
                spec={lineSpec}
                option={VCHART_OPTION}
              />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

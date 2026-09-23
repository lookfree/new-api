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
import { useMemo } from 'react'

import { getUserQuotaDates } from '../api'
import {
  overviewRangeStart,
  splitQueryRange,
  summarizeOverviewUsage,
} from '../lib/overview-usage'

/**
 * The signed-in user's own usage for the overview: one query over the previous
 * and current month, cut into chunks the endpoint accepts and summarized on
 * the client so the tiles, the trend and the model ranking share one request.
 */
export function useOverviewUsage() {
  const range = useMemo(
    () => ({
      start: overviewRangeStart(new Date()),
      end: Math.floor(Date.now() / 1000),
    }),
    []
  )

  return useQuery({
    queryKey: ['dashboard', 'overview', 'usage', range.start],
    queryFn: async () => {
      const responses = await Promise.all(
        splitQueryRange(range.start, range.end).map(([start, end]) =>
          getUserQuotaDates({
            start_timestamp: start,
            end_timestamp: end,
            default_time: 'hour',
          })
        )
      )
      const failed = responses.find((response) => !response.success)
      if (failed) throw new Error('Failed to load usage data')
      return summarizeOverviewUsage(
        responses.flatMap((response) => response.data ?? []),
        new Date()
      )
    },
    staleTime: 60 * 1000,
  })
}

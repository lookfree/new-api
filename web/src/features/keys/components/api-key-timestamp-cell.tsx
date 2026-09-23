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
import dayjs from 'dayjs'

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { formatTimestampToDate } from '@/lib/format'
import { cn } from '@/lib/utils'

interface ApiKeyTimestampCellProps {
  /** Unix seconds; 0 or -1 mean "never". */
  timestamp: number
  className?: string
}

export function ApiKeyTimestampCell(props: ApiKeyTimestampCellProps) {
  if (!props.timestamp || props.timestamp === -1) {
    return <span className='text-muted-foreground'>-</span>
  }

  const date = dayjs.unix(props.timestamp)

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <time
            dateTime={date.toISOString()}
            tabIndex={0}
            className={cn('tabular-nums', props.className)}
          />
        }
      >
        {date.format('YYYY-MM-DD')}
      </TooltipTrigger>
      <TooltipContent>
        <span className='font-mono tabular-nums'>
          {formatTimestampToDate(props.timestamp)}
        </span>
      </TooltipContent>
    </Tooltip>
  )
}

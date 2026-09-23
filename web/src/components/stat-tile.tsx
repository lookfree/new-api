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
import type { ReactNode } from 'react'

import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

/**
 * Prototype stat tile: muted label, large tabular value, optional hint line
 * and a tinted icon badge on the right.
 */
export function StatTile(props: {
  label: ReactNode
  value: ReactNode
  hint?: ReactNode
  icon?: ReactNode
  className?: string
}) {
  return (
    <Card className={cn('gap-0 px-5', props.className)}>
      <div className='flex items-start justify-between gap-3'>
        <div className='min-w-0'>
          <p className='text-muted-foreground text-sm'>{props.label}</p>
          <p className='mt-2 text-2xl font-semibold tracking-tight tabular-nums'>
            {props.value}
          </p>
          {props.hint != null && (
            <p className='text-muted-foreground mt-1 text-xs'>{props.hint}</p>
          )}
        </div>
        {props.icon != null && (
          <span
            aria-hidden='true'
            className='bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-lg [&_svg]:size-4'
          >
            {props.icon}
          </span>
        )}
      </div>
    </Card>
  )
}

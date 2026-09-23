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

import { cn } from '@/lib/utils'

import { Main } from './main'

/**
 * Page frame of the console pages that mirror the Zetone prototype: a scroll
 * area with the prototype's `p-4 sm:p-6` padding around a centered `max-w-5xl`
 * column whose children are spaced 24px apart.
 */
export function ConsolePage(props: {
  children: ReactNode
  className?: string
}) {
  return (
    <Main>
      <div className='min-h-0 flex-1 overflow-auto p-4 sm:p-6'>
        <div
          className={cn('mx-auto w-full max-w-5xl space-y-6', props.className)}
        >
          {props.children}
        </div>
      </div>
    </Main>
  )
}

/**
 * Prototype page heading: `text-2xl` title, muted subtitle and optional
 * actions, bottom-aligned with the subtitle like the prototype's keys page.
 */
export function ConsolePageHeader(props: {
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
}) {
  return (
    <div className='flex flex-wrap items-end justify-between gap-3'>
      <div className='min-w-0'>
        <h2 className='text-2xl font-semibold tracking-tight'>{props.title}</h2>
        {props.description != null && (
          <p className='text-muted-foreground mt-1'>{props.description}</p>
        )}
      </div>
      {props.actions != null && (
        <div className='flex shrink-0 items-center gap-2'>{props.actions}</div>
      )}
    </div>
  )
}

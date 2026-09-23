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

import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

/**
 * Settings card in the prototype's style: a plain card whose title is
 * `text-sm`, with an optional muted description and a right-aligned action.
 * Like the prototype's, it does not lift on hover (the app's global card hover
 * effect is switched off for it).
 */
export function ProfileCard(props: {
  title: ReactNode
  description?: ReactNode
  action?: ReactNode
  id?: string
  className?: string
  contentClassName?: string
  children: ReactNode
}) {
  // The card header is a two-row grid, so an action beside a title with no
  // description would add an empty row's gap. A flex row keeps the header the
  // prototype's height.
  const inlineAction = props.action != null && props.description == null

  return (
    <Card
      id={props.id}
      data-card-hover='false'
      className={cn('scroll-mt-4 gap-5', props.className)}
    >
      <CardHeader
        className={
          inlineAction ? 'flex items-center justify-between gap-3' : undefined
        }
      >
        <CardTitle className='text-sm tracking-tight'>{props.title}</CardTitle>
        {props.description != null && (
          <CardDescription className='text-xs'>
            {props.description}
          </CardDescription>
        )}
        {inlineAction && props.action}
        {!inlineAction && props.action != null && (
          <CardAction>{props.action}</CardAction>
        )}
      </CardHeader>
      <CardContent className={props.contentClassName}>
        {props.children}
      </CardContent>
    </Card>
  )
}

/** Loading placeholder with the same outer shape as {@link ProfileCard}. */
export function ProfileCardSkeleton(props: { rows?: number }) {
  const rows = Array.from({ length: props.rows ?? 2 }, (_, index) => index)
  return (
    <Card data-card-hover='false'>
      <CardHeader>
        <Skeleton className='h-4 w-28' />
      </CardHeader>
      <CardContent className='space-y-3'>
        {rows.map((row) => (
          <Skeleton key={row} className='h-16 w-full' />
        ))}
      </CardContent>
    </Card>
  )
}

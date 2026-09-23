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
import { useTranslation } from 'react-i18next'

import {
  Card,
  CardAction,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

interface PanelWrapperProps {
  title: ReactNode
  description?: ReactNode
  loading?: boolean
  empty?: boolean
  emptyMessage?: string
  height?: string
  className?: string
  headerActions?: ReactNode
  children?: ReactNode
}

/**
 * A list panel in the prototype's card look: header with a rule under it,
 * body running edge to edge so rows can carry their own dividers.
 */
export function PanelWrapper(props: PanelWrapperProps) {
  const { t } = useTranslation()
  const height = props.height ?? 'h-64'
  const ready = !props.loading && !props.empty

  let body: ReactNode = props.children
  if (props.loading) {
    body = <Skeleton className={`w-full ${height}`} />
  } else if (props.empty) {
    body = (
      <div
        className={cn(
          'text-muted-foreground flex items-center justify-center px-4 text-sm',
          height
        )}
      >
        {props.emptyMessage ?? t('No data available')}
      </div>
    )
  }

  return (
    <Card className={cn('gap-0 pb-0', props.className)}>
      <CardHeader className='border-b'>
        <CardTitle>{props.title}</CardTitle>
        {props.description != null && (
          <CardDescription>{props.description}</CardDescription>
        )}
        {ready && props.headerActions != null && (
          <CardAction>{props.headerActions}</CardAction>
        )}
      </CardHeader>
      <div className={cn(props.loading && 'p-5')}>{body}</div>
    </Card>
  )
}

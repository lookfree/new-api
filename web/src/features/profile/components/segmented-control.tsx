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
import { useRef, type KeyboardEvent } from 'react'

import { cn } from '@/lib/utils'

const ARROW_KEY_STEPS: Record<string, number> = {
  ArrowRight: 1,
  ArrowDown: 1,
  ArrowLeft: -1,
  ArrowUp: -1,
}

export type SegmentedOption<T extends string> = {
  value: T
  label: string
}

/**
 * The prototype's two-way switch (light / dark, 中文 / English): a bordered
 * pill whose active segment is filled with the primary color. Implemented as a
 * radio group so it is one tab stop and arrow keys move between segments.
 * While `disabled` (a save in flight) the segments stay focusable and only
 * ignore changes: a real `disabled` attribute would drop keyboard focus.
 */
export function SegmentedControl<T extends string>(props: {
  label: string
  value: T
  options: SegmentedOption<T>[]
  onChange: (value: T) => void
  disabled?: boolean
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])

  function handleKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    index: number
  ) {
    const step = ARROW_KEY_STEPS[event.key]
    if (!step) return
    event.preventDefault()
    if (props.disabled) return
    const next = (index + step + props.options.length) % props.options.length
    props.onChange(props.options[next].value)
    refs.current[next]?.focus()
  }

  return (
    <div
      role='radiogroup'
      aria-label={props.label}
      className='mt-2 inline-flex rounded-lg border p-1'
    >
      {props.options.map((option, index) => {
        const active = option.value === props.value
        return (
          <button
            key={option.value}
            ref={(node) => {
              refs.current[index] = node
            }}
            type='button'
            role='radio'
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            aria-disabled={props.disabled || undefined}
            onClick={() => {
              if (!props.disabled) props.onChange(option.value)
            }}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className={cn(
              'rounded-md px-4 py-1.5 text-sm font-medium transition-colors aria-disabled:opacity-50',
              active
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

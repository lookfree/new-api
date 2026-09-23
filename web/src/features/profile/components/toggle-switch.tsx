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
import { Switch as SwitchPrimitive } from '@base-ui/react/switch'

import { cn } from '@/lib/utils'

type ToggleSwitchProps = Omit<SwitchPrimitive.Root.Props, 'className'> & {
  className?: string
}

/**
 * The prototype's toggle: a 44x24 pill with a 20px thumb. The shared Switch is
 * a smaller control (32x18), so the settings page builds this one on the same
 * primitive, keeping a real switch (role, keyboard, focus) at the prototype's
 * proportions.
 */
export function ToggleSwitch(props: ToggleSwitchProps) {
  return (
    <SwitchPrimitive.Root
      {...props}
      className={cn(
        'focus-visible:ring-ring/50 data-checked:bg-primary data-unchecked:bg-input dark:data-unchecked:bg-input/80 relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors outline-none focus-visible:ring-3 data-disabled:cursor-not-allowed data-disabled:opacity-50 data-readonly:cursor-progress',
        props.className
      )}
    >
      <SwitchPrimitive.Thumb className='bg-background dark:data-checked:bg-primary-foreground dark:data-unchecked:bg-foreground pointer-events-none absolute top-0.5 left-0.5 block size-5 rounded-full shadow transition-transform data-checked:translate-x-5' />
    </SwitchPrimitive.Root>
  )
}

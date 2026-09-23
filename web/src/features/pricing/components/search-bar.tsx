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
import { Search, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface SearchBarProps {
  value: string
  onChange: (value: string) => void
  onClear: () => void
  placeholder?: string
  className?: string
}

export function SearchBar(props: SearchBarProps) {
  const { t } = useTranslation()

  return (
    <div className={cn('relative', props.className)}>
      <Search className='text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2' />
      <input
        type='text'
        placeholder={props.placeholder || t('Search models...')}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        className='bg-background focus-visible:border-ring focus-visible:ring-ring/30 h-9 w-full rounded-lg border pr-9 pl-9 text-sm transition-colors outline-none focus-visible:ring-3'
        aria-label={t('Search models')}
      />
      {props.value && (
        <Button
          variant='ghost'
          size='icon-xs'
          onClick={props.onClear}
          className='text-muted-foreground hover:text-foreground absolute top-1/2 right-1.5 -translate-y-1/2'
          aria-label={t('Clear search')}
        >
          <X />
        </Button>
      )}
    </div>
  )
}

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
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'

type ApiKeysPaginationProps = {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
}

export function ApiKeysPagination(props: ApiKeysPaginationProps) {
  const { t } = useTranslation()
  if (props.totalPages <= 1) return null

  return (
    <div className='text-muted-foreground flex items-center justify-between gap-3 border-t px-5 py-3 text-sm'>
      <span>
        {t('Page {{current}} of {{total}}', {
          current: props.page,
          total: props.totalPages,
        })}
      </span>
      <div className='flex items-center gap-2'>
        <Button
          variant='outline'
          size='sm'
          disabled={props.page <= 1}
          onClick={() => props.onPageChange(props.page - 1)}
        >
          <ChevronLeft />
          {t('Previous page')}
        </Button>
        <Button
          variant='outline'
          size='sm'
          disabled={props.page >= props.totalPages}
          onClick={() => props.onPageChange(props.page + 1)}
        >
          {t('Next page')}
          <ChevronRight />
        </Button>
      </div>
    </div>
  )
}

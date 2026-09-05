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
import { useTranslation } from 'react-i18next'

import { Badge } from '@/components/ui/badge'
import { formatQuota } from '@/lib/format'

import type { AffRecord } from '../types'

export function AffRecordsTable(props: {
  records: AffRecord[]
  isLoading: boolean
  isError: boolean
}) {
  const { t } = useTranslation()

  if (props.isLoading) {
    return (
      <p className='text-muted-foreground px-5 py-10 text-center text-sm'>
        {t('Loading...')}
      </p>
    )
  }

  if (props.isError) {
    return (
      <p className='text-muted-foreground px-5 py-10 text-center text-sm'>
        {t('Failed to load referral records')}
      </p>
    )
  }

  if (props.records.length === 0) {
    return (
      <p className='text-muted-foreground px-5 py-10 text-center text-sm'>
        {t('No one has signed up through your link yet.')}
      </p>
    )
  }

  return (
    <div className='overflow-x-auto'>
      <table className='w-full text-sm'>
        <thead>
          <tr className='bg-muted/40 text-muted-foreground border-b text-left text-xs'>
            <th className='px-5 py-3 font-medium'>{t('Invitee')}</th>
            <th className='px-5 py-3 font-medium'>{t('Signed up')}</th>
            <th className='px-5 py-3 font-medium'>{t('Has topped up')}</th>
            <th className='px-5 py-3 text-right font-medium'>
              {t('Their top-up')}
            </th>
            <th className='px-5 py-3 text-right font-medium'>
              {t('My reward')}
            </th>
          </tr>
        </thead>
        <tbody>
          {props.records.map((record) => (
            <tr key={record.invitee_id} className='border-b last:border-0'>
              <td className='px-5 py-3 font-mono'>{record.display}</td>
              <td className='text-muted-foreground px-5 py-3 tabular-nums'>
                {record.registered_at
                  ? dayjs.unix(record.registered_at).format('YYYY-MM-DD')
                  : '—'}
              </td>
              <td className='px-5 py-3'>
                <Badge variant={record.topped_up ? 'default' : 'ghost'}>
                  {record.topped_up ? t('Yes') : t('Not yet')}
                </Badge>
              </td>
              <td className='px-5 py-3 text-right tabular-nums'>
                {record.topped_up ? record.topup_money.toFixed(2) : '—'}
              </td>
              <td className='text-primary px-5 py-3 text-right font-medium tabular-nums'>
                {record.reward_quota > 0
                  ? formatQuota(record.reward_quota)
                  : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

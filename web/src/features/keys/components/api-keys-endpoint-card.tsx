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
import { Check, Copy } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useStatus } from '@/hooks/use-status'
import { copyToClipboard } from '@/lib/copy-to-clipboard'

const COPIED_FLASH_MS = 1500

export function ApiKeysEndpointCard() {
  const { t } = useTranslation()
  const { status } = useStatus()
  const [copied, setCopied] = useState(false)

  const configured = String(status?.server_address ?? '').trim()
  const endpoint = `${(configured || window.location.origin).replace(/\/+$/, '')}/v1`

  async function handleCopy() {
    if (!(await copyToClipboard(endpoint))) return
    setCopied(true)
    setTimeout(() => setCopied(false), COPIED_FLASH_MS)
  }

  return (
    <Card className='gap-5'>
      <CardHeader>
        <CardTitle className='text-sm leading-5'>{t('API endpoint')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className='bg-muted/40 flex items-center justify-between gap-3 rounded-lg border px-3 py-2'>
          <code className='min-w-0 truncate font-mono text-sm'>{endpoint}</code>
          <Button variant='ghost' size='sm' onClick={handleCopy}>
            {copied ? <Check className='text-success' /> : <Copy />}
            {copied ? t('Copied') : t('Copy')}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

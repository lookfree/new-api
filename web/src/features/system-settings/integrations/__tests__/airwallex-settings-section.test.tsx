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
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useForm } from 'react-hook-form'
import { describe, expect, test, vi } from 'vitest'

import { Form } from '@/components/ui/form'
import { copyToClipboard } from '@/lib/copy-to-clipboard'

import type { AirwallexSettingsValues } from '../airwallex-options'
import { AirwallexSettingsSection } from '../airwallex-settings-section'

vi.mock('@/lib/copy-to-clipboard', () => ({
  copyToClipboard: vi.fn().mockResolvedValue(true),
}))

function Harness(props: { defaults?: Partial<AirwallexSettingsValues> }) {
  const form = useForm<AirwallexSettingsValues>({
    defaultValues: {
      AirwallexEnabled: false,
      AirwallexClientId: '',
      AirwallexApiKey: '',
      AirwallexWebhookSecret: '',
      ...props.defaults,
    },
  })
  return (
    <Form {...form}>
      <AirwallexSettingsSection />
    </Form>
  )
}

describe('AirwallexSettingsSection', () => {
  test("shows this site's webhook URL as a read-only field the admin can copy", async () => {
    const user = userEvent.setup()
    render(<Harness />)
    const webhookUrl = `${window.location.origin}/api/airwallex/webhook`

    const field = screen.getByLabelText('Webhook URL')
    expect(field).toHaveValue(webhookUrl)
    expect(field).toHaveAttribute('readonly')

    await user.click(screen.getByRole('button', { name: 'Copy webhook URL' }))

    expect(copyToClipboard).toHaveBeenCalledWith(webhookUrl)
  })

  test('tells the admin which event to subscribe to and to allow-list the server IP', () => {
    render(<Harness />)

    expect(
      screen.getByText(/subscribe to the payment_intent\.succeeded event/)
    ).toBeInTheDocument()
    expect(
      screen.getByText(/allow-list this server's outbound IP/)
    ).toBeInTheDocument()
  })

  test('masks the API key and webhook secret but not the client id', () => {
    render(<Harness />)

    expect(screen.getByLabelText('API Key')).toHaveAttribute('type', 'password')
    expect(screen.getByLabelText('Webhook Secret')).toHaveAttribute(
      'type',
      'password'
    )
    expect(screen.getByLabelText('Client ID')).not.toHaveAttribute(
      'type',
      'password'
    )
  })

  test('prefills the stored client id and starts the secrets blank', () => {
    render(<Harness defaults={{ AirwallexClientId: 'client-123' }} />)

    expect(screen.getByLabelText('Client ID')).toHaveValue('client-123')
    expect(screen.getByLabelText('API Key')).toHaveValue('')
    expect(screen.getByLabelText('Webhook Secret')).toHaveValue('')
  })

  test('takes typed credentials', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    await user.type(screen.getByLabelText('Client ID'), 'client-456')
    await user.type(screen.getByLabelText('API Key'), 'secret-key')

    expect(screen.getByLabelText('Client ID')).toHaveValue('client-456')
    expect(screen.getByLabelText('API Key')).toHaveValue('secret-key')
  })

  test('toggles the enable switch', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    const enable = screen.getByRole('switch', { name: 'Enable Airwallex' })
    expect(enable).toHaveAttribute('aria-checked', 'false')

    await user.click(enable)

    expect(enable).toHaveAttribute('aria-checked', 'true')
  })
})

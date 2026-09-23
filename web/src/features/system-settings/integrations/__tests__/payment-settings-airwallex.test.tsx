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
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import { SettingsPageProvider } from '../../components/settings-page-context'
import { PaymentSettingsSection } from '../payment-settings-section'

const updateSystemOption = vi.hoisted(() => vi.fn())

vi.mock('../../api', () => ({
  updateSystemOption,
  confirmPaymentCompliance: vi.fn(),
}))

type SectionProps = Parameters<typeof PaymentSettingsSection>[0]

function buildProps(overrides: Partial<SectionProps> = {}): SectionProps {
  return {
    defaultValues: {
      PayAddress: '',
      EpayId: '',
      EpayKey: '',
      Price: 7.3,
      MinTopUp: 1,
      CustomCallbackAddress: '',
      PayMethods: '',
      AmountOptions: '',
      AmountDiscount: '',
      StripeApiSecret: '',
      StripeWebhookSecret: '',
      StripePriceId: '',
      StripeUnitPrice: 8,
      StripeMinTopUp: 1,
      StripePromotionCodesEnabled: false,
      CreemApiKey: '',
      CreemWebhookSecret: '',
      CreemTestMode: false,
      CreemProducts: '[]',
    },
    airwallexDefaultValues: {
      AirwallexEnabled: false,
      AirwallexClientId: '',
      AirwallexApiKey: '',
      AirwallexWebhookSecret: '',
    },
    waffoDefaultValues: {
      WaffoEnabled: false,
      WaffoApiKey: '',
      WaffoPrivateKey: '',
      WaffoPublicCert: '',
      WaffoSandboxPublicCert: '',
      WaffoSandboxApiKey: '',
      WaffoSandboxPrivateKey: '',
      WaffoSandbox: false,
      WaffoMerchantId: '',
      WaffoCurrency: 'USD',
      WaffoUnitPrice: 1,
      WaffoMinTopUp: 1,
      WaffoNotifyUrl: '',
      WaffoReturnUrl: '',
      WaffoPayMethods: '[]',
    },
    waffoPancakeDefaultValues: {
      WaffoPancakeMerchantID: '',
      WaffoPancakePrivateKey: '',
      WaffoPancakeReturnURL: '',
    },
    complianceDefaults: {
      confirmed: true,
      termsVersion: 'v1',
      confirmedAt: 1_700_000_000,
      confirmedBy: 1,
    },
    ...overrides,
  }
}

function renderSection(props: SectionProps) {
  // The page's Save button is portaled into the page header.
  const actions = document.createElement('div')
  document.body.appendChild(actions)
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  render(
    <QueryClientProvider client={queryClient}>
      <SettingsPageProvider actionsContainer={actions}>
        <PaymentSettingsSection {...props} />
      </SettingsPageProvider>
    </QueryClientProvider>
  )
}

async function openAirwallexTab(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('tab', { name: 'Airwallex' }))
}

async function save(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Save all settings' }))
}

beforeEach(() => {
  updateSystemOption.mockResolvedValue({ success: true })
})

afterEach(() => {
  document.body.innerHTML = ''
})

describe('PaymentSettingsSection Airwallex tab', () => {
  test('saves the enable switch, client id and typed secrets as flat options', async () => {
    const user = userEvent.setup()
    renderSection(buildProps())
    await openAirwallexTab(user)

    await user.type(screen.getByLabelText('Client ID'), 'client-123')
    await user.type(screen.getByLabelText('API Key'), 'api-key-1')
    await user.type(screen.getByLabelText('Webhook Secret'), 'whsec-1')
    await user.click(screen.getByRole('switch', { name: 'Enable Airwallex' }))
    await save(user)

    await waitFor(() => expect(updateSystemOption).toHaveBeenCalledTimes(4))
    expect(updateSystemOption.mock.calls.map(([request]) => request)).toEqual(
      expect.arrayContaining([
        { key: 'AirwallexEnabled', value: true },
        { key: 'AirwallexClientId', value: 'client-123' },
        { key: 'AirwallexApiKey', value: 'api-key-1' },
        { key: 'AirwallexWebhookSecret', value: 'whsec-1' },
      ])
    )
  })

  test('leaves stored secrets alone when only the client id changes', async () => {
    const user = userEvent.setup()
    renderSection(
      buildProps({
        airwallexDefaultValues: {
          AirwallexEnabled: true,
          AirwallexClientId: 'client-123',
          AirwallexApiKey: '',
          AirwallexWebhookSecret: '',
        },
      })
    )
    await openAirwallexTab(user)

    await user.clear(screen.getByLabelText('Client ID'))
    await user.type(screen.getByLabelText('Client ID'), 'client-456')
    await save(user)

    await waitFor(() => expect(updateSystemOption).toHaveBeenCalledTimes(1))
    expect(updateSystemOption).toHaveBeenCalledWith({
      key: 'AirwallexClientId',
      value: 'client-456',
    })
  })

  test('refuses to enable Airwallex without a client id and saves nothing', async () => {
    const user = userEvent.setup()
    renderSection(buildProps())
    await openAirwallexTab(user)

    await user.click(screen.getByRole('switch', { name: 'Enable Airwallex' }))
    await save(user)

    expect(
      await screen.findByText('Client ID is required to enable Airwallex')
    ).toBeInTheDocument()
    expect(updateSystemOption).not.toHaveBeenCalled()
  })

  test('sends no Airwallex option when only another setting changes', async () => {
    const user = userEvent.setup()
    renderSection(buildProps())

    await user.click(screen.getByRole('tab', { name: 'Epay' }))
    await user.type(screen.getByLabelText('Epay merchant ID'), '10001')
    await save(user)

    await waitFor(() => expect(updateSystemOption).toHaveBeenCalledTimes(1))
    expect(updateSystemOption).toHaveBeenCalledWith({
      key: 'EpayId',
      value: '10001',
    })
  })
})

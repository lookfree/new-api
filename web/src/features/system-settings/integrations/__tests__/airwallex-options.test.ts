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
import { describe, expect, test } from 'vitest'

import {
  getAirwallexOptionUpdates,
  type AirwallexSettingsValues,
} from '../airwallex-options'

const stored: AirwallexSettingsValues = {
  AirwallexEnabled: false,
  AirwallexClientId: 'client-123',
  // GET /api/option/ never returns the secrets, so they load as empty.
  AirwallexApiKey: '',
  AirwallexWebhookSecret: '',
}

describe('getAirwallexOptionUpdates', () => {
  test('sends nothing when the form matches what is stored', () => {
    expect(getAirwallexOptionUpdates({ ...stored }, stored)).toEqual([])
  })

  test('sends the enable switch as a boolean option', () => {
    expect(
      getAirwallexOptionUpdates({ ...stored, AirwallexEnabled: true }, stored)
    ).toEqual([{ key: 'AirwallexEnabled', value: true }])
    expect(
      getAirwallexOptionUpdates(
        { ...stored, AirwallexEnabled: false },
        { ...stored, AirwallexEnabled: true }
      )
    ).toEqual([{ key: 'AirwallexEnabled', value: false }])
  })

  test('sends a changed client id trimmed, and ignores whitespace-only edits', () => {
    expect(
      getAirwallexOptionUpdates(
        { ...stored, AirwallexClientId: '  client-456  ' },
        stored
      )
    ).toEqual([{ key: 'AirwallexClientId', value: 'client-456' }])
    expect(
      getAirwallexOptionUpdates(
        { ...stored, AirwallexClientId: ' client-123 ' },
        stored
      )
    ).toEqual([])
  })

  test('can clear the client id', () => {
    expect(
      getAirwallexOptionUpdates({ ...stored, AirwallexClientId: '' }, stored)
    ).toEqual([{ key: 'AirwallexClientId', value: '' }])
  })

  test('never sends a blank secret, so stored secrets are not wiped', () => {
    expect(
      getAirwallexOptionUpdates(
        { ...stored, AirwallexApiKey: '', AirwallexWebhookSecret: '   ' },
        stored
      )
    ).toEqual([])
  })

  test('sends a typed API key and webhook secret trimmed', () => {
    expect(
      getAirwallexOptionUpdates(
        {
          ...stored,
          AirwallexApiKey: ' new-key ',
          AirwallexWebhookSecret: ' new-secret ',
        },
        stored
      )
    ).toEqual([
      { key: 'AirwallexApiKey', value: 'new-key' },
      { key: 'AirwallexWebhookSecret', value: 'new-secret' },
    ])
  })

  test('sends every changed option in one save', () => {
    expect(
      getAirwallexOptionUpdates(
        {
          AirwallexEnabled: true,
          AirwallexClientId: 'client-456',
          AirwallexApiKey: 'new-key',
          AirwallexWebhookSecret: 'new-secret',
        },
        stored
      ).map((update) => update.key)
    ).toEqual([
      'AirwallexEnabled',
      'AirwallexClientId',
      'AirwallexApiKey',
      'AirwallexWebhookSecret',
    ])
  })
})

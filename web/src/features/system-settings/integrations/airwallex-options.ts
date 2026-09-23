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
import type { UpdateOptionRequest } from '../types'

export type AirwallexSettingsValues = {
  AirwallexEnabled: boolean
  AirwallexClientId: string
  AirwallexApiKey: string
  AirwallexWebhookSecret: string
}

/**
 * The options to save so the stored Airwallex settings match `next`.
 *
 * GET /api/option/ never returns the API key or the webhook secret, so an
 * empty secret field means "keep what is stored" and is never sent; a secret
 * is only written when the operator typed a new one.
 */
export function getAirwallexOptionUpdates(
  next: AirwallexSettingsValues,
  initial: AirwallexSettingsValues
): UpdateOptionRequest[] {
  const updates: UpdateOptionRequest[] = []
  const clientId = next.AirwallexClientId.trim()
  const apiKey = next.AirwallexApiKey.trim()
  const webhookSecret = next.AirwallexWebhookSecret.trim()

  if (next.AirwallexEnabled !== initial.AirwallexEnabled) {
    updates.push({ key: 'AirwallexEnabled', value: next.AirwallexEnabled })
  }
  if (clientId !== initial.AirwallexClientId.trim()) {
    updates.push({ key: 'AirwallexClientId', value: clientId })
  }
  if (apiKey && apiKey !== initial.AirwallexApiKey.trim()) {
    updates.push({ key: 'AirwallexApiKey', value: apiKey })
  }
  if (
    webhookSecret &&
    webhookSecret !== initial.AirwallexWebhookSecret.trim()
  ) {
    updates.push({ key: 'AirwallexWebhookSecret', value: webhookSecret })
  }

  return updates
}

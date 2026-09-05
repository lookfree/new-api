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
import type { ContactChannel } from '../types'

/**
 * Parse the `ContactInfo` option into the cards the contact page renders.
 *
 * Operators edit this as JSON in system settings, so the parser is forgiving:
 * anything unusable yields an empty list, and the page then shows only the
 * form. Entries missing a label or value are dropped rather than rendering
 * blank cards.
 *
 * Wire format:
 *   [{"kind":"email","label":"Email","value":"support@example.com"},
 *    {"kind":"wechat","label":"Support WeChat","value":"zetone","qr":"/qr.png"}]
 */
const KNOWN_KINDS = new Set<ContactChannel['kind']>([
  'email',
  'phone',
  'wecom',
  'wechat',
])

export function parseContactChannels(raw: unknown): ContactChannel[] {
  if (raw === null || raw === undefined || raw === '') return []

  let parsed: unknown = raw
  if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw)
    } catch {
      return []
    }
  }
  if (!Array.isArray(parsed)) return []

  const channels: ContactChannel[] = []
  for (const entry of parsed) {
    if (!entry || typeof entry !== 'object') continue
    const record = entry as Record<string, unknown>
    const label = typeof record.label === 'string' ? record.label.trim() : ''
    const value = typeof record.value === 'string' ? record.value.trim() : ''
    if (!label || !value) continue

    const rawKind = record.kind
    const kind =
      typeof rawKind === 'string' && KNOWN_KINDS.has(rawKind as never)
        ? (rawKind as ContactChannel['kind'])
        : 'email'
    const qr = typeof record.qr === 'string' && record.qr ? record.qr : undefined

    channels.push({ kind, label, value, qr })
  }
  return channels
}

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
/**
 * Resolve the public API base URL shown in documentation and code samples.
 *
 * Prefers the `ServerAddress` option an operator configures in system
 * settings, which is what customers actually call. Falls back to the origin
 * the page is served from, so a fresh install still shows a working URL
 * instead of a placeholder.
 */
export function resolveApiBaseUrl(status: unknown): string {
  const read = (source: unknown): string | undefined => {
    if (!source || typeof source !== 'object') return undefined
    const record = source as Record<string, unknown>
    const candidate = record.server_address ?? record.serverAddress
    return typeof candidate === 'string' && candidate ? candidate : undefined
  }

  const configured =
    read(status) ?? read((status as { data?: unknown } | null)?.data)

  if (configured) {
    return configured.replace(/\/+$/, '')
  }
  if (typeof window !== 'undefined') {
    return window.location.origin
  }
  return ''
}

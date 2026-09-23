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
const CONTEXT_FORMAT = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 1,
})

/**
 * Context window as the prototype prints it: 8K, 128K, 200K, 2M. Sizes that
 * are a power of two times 1024 are quoted in binary units (8192 is 8K,
 * 131072 is 128K, 1048576 is 1M) because that is how those windows are
 * named; everything else is decimal (200000 is 200K, 128000 is 128K).
 * Unknown sizes show "-".
 */
export function formatContextLength(tokens?: number): string {
  if (!tokens || !Number.isFinite(tokens) || tokens <= 0) return '-'
  const kibi = tokens / 1024
  if (Number.isInteger(kibi) && (kibi & (kibi - 1)) === 0) {
    return kibi >= 1024 ? `${kibi / 1024}M` : `${kibi}K`
  }
  if (tokens >= 1_000_000) {
    return `${CONTEXT_FORMAT.format(tokens / 1_000_000)}M`
  }
  if (tokens >= 1_000) return `${CONTEXT_FORMAT.format(tokens / 1_000)}K`
  return CONTEXT_FORMAT.format(tokens)
}

/**
 * Pads a formatted price to at least two decimals ("$0.6" becomes "$0.60"),
 * which is how the prototype's pricing table prints them, while keeping any
 * extra precision the price needs ("$16.4384" stays as is). Text without a
 * number, such as the "-" placeholder, is returned untouched.
 */
export function padPriceDecimals(formatted: string, minDecimals = 2): string {
  const match = formatted.match(/^([^\d-]*)(-?\d[\d,]*)(?:\.(\d+))?(.*)$/)
  if (!match) return formatted
  const [, prefix, whole, fraction = '', suffix] = match
  return `${prefix}${whole}.${fraction.padEnd(minDecimals, '0')}${suffix}`
}

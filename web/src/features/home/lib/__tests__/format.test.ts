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
import { describe, expect, it } from 'vitest'

import { formatContextLength, padPriceDecimals } from '../format'

describe('formatContextLength', () => {
  it('prints thousands with a K suffix', () => {
    expect(formatContextLength(128_000)).toBe('128K')
  })

  it('prints millions with an M suffix', () => {
    expect(formatContextLength(2_000_000)).toBe('2M')
  })

  it('keeps one decimal for fractional sizes', () => {
    expect(formatContextLength(1_500_000)).toBe('1.5M')
  })

  it('shows a dash when the size is unknown', () => {
    expect(formatContextLength(undefined)).toBe('-')
    expect(formatContextLength(0)).toBe('-')
  })

  it('names power-of-two windows the way the models are quoted', () => {
    expect(formatContextLength(8_192)).toBe('8K')
    expect(formatContextLength(32_768)).toBe('32K')
    expect(formatContextLength(65_536)).toBe('64K')
    expect(formatContextLength(131_072)).toBe('128K')
    expect(formatContextLength(1_048_576)).toBe('1M')
  })

  it('keeps decimal sizes decimal even when they divide by 1024', () => {
    // 128000 = 125 x 1024, but nobody calls it 125K.
    expect(formatContextLength(128_000)).toBe('128K')
    expect(formatContextLength(200_000)).toBe('200K')
    expect(formatContextLength(64_000)).toBe('64K')
    expect(formatContextLength(1_000_000)).toBe('1M')
  })

  it('prints sizes under a thousand as plain numbers', () => {
    expect(formatContextLength(512)).toBe('512')
  })
})

describe('padPriceDecimals', () => {
  it('pads whole and one-decimal prices to two decimals', () => {
    expect(padPriceDecimals('$10')).toBe('$10.00')
    expect(padPriceDecimals('$0.6')).toBe('$0.60')
  })

  it('keeps the extra precision of prices that need it', () => {
    expect(padPriceDecimals('$16.4384')).toBe('$16.4384')
    expect(padPriceDecimals('$0.0675')).toBe('$0.0675')
  })

  it('leaves thousands separators and other currency symbols in place', () => {
    expect(padPriceDecimals('¥1,234')).toBe('¥1,234.00')
  })

  it('returns text without a number unchanged', () => {
    expect(padPriceDecimals('-')).toBe('-')
  })
})

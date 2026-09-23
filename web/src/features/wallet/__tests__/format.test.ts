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

import { estimateLocalAmount, getDiscountPercentOff } from '../lib/format'

describe('estimateLocalAmount', () => {
  test('converts quota units to dollars, then to yuan at the top-up price', () => {
    // 100 USD of credit at 500,000 quota per USD, bought at 7.3 CNY per USD
    expect(estimateLocalAmount(50_000_000, 500_000, 7.3)).toBeCloseTo(730)
  })

  test.each([
    ['no price configured', 1_000, 500_000, 0],
    ['no quota-per-unit configured', 1_000, 0, 7.3],
    ['a non-finite price', 1_000, 500_000, Number.NaN],
  ])('shows no estimate for %s', (_name, quota, perUnit, price) => {
    expect(estimateLocalAmount(quota, perUnit, price)).toBeNull()
  })
})

describe('getDiscountPercentOff', () => {
  test.each([
    [0.8, 20],
    [0.95, 5],
    [0.333, 67],
  ])('a rate of %s takes %s percent off', (rate, percent) => {
    expect(getDiscountPercentOff(rate)).toBe(percent)
  })

  test.each([1, 1.2, 0, -0.5, Number.NaN])(
    'a rate of %s is not a discount',
    (rate) => {
      expect(getDiscountPercentOff(rate)).toBe(0)
    }
  )
})

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

import { getHealthLevel, getRunwayDays } from '../lib/account-health'

describe('getRunwayDays', () => {
  it('divides the balance by the recent daily spend', () => {
    expect(getRunwayDays(300, 100)).toBe(3)
  })

  it('is unknown without a balance or without recent spend', () => {
    expect(getRunwayDays(0, 100)).toBeNull()
    expect(getRunwayDays(300, 0)).toBeNull()
  })
})

describe('getHealthLevel', () => {
  it('is critical once the balance is gone', () => {
    expect(getHealthLevel(0, 0)).toBe('critical')
    expect(getHealthLevel(-5, 100)).toBe('critical')
  })

  it('cautions when the balance covers less than three days at the recent pace', () => {
    expect(getHealthLevel(299, 100)).toBe('caution')
  })

  it('is healthy at three days or more, or with no recent spend to extrapolate', () => {
    expect(getHealthLevel(300, 100)).toBe('healthy')
    expect(getHealthLevel(50, 0)).toBe('healthy')
  })
})

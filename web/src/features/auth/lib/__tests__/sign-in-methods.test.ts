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

import { resolveSignInMethods } from '../sign-in-methods'

const ALL_ON = { phone: true, wechat: true, email: true }

describe('resolveSignInMethods', () => {
  it('puts phone first for Chinese interfaces', () => {
    expect(resolveSignInMethods('zh', ALL_ON)).toEqual([
      'phone',
      'wechat',
      'email',
    ])
  })

  it('treats Traditional Chinese like Chinese', () => {
    expect(resolveSignInMethods('zh-TW', ALL_ON)[0]).toBe('phone')
  })

  it('puts email first for other languages', () => {
    expect(resolveSignInMethods('en', ALL_ON)).toEqual([
      'email',
      'phone',
      'wechat',
    ])
  })

  it('drops methods the operator has not enabled', () => {
    expect(
      resolveSignInMethods('zh', { phone: false, wechat: true, email: true })
    ).toEqual(['wechat', 'email'])
  })

  it('returns nothing when every method is disabled', () => {
    expect(
      resolveSignInMethods('en', { phone: false, wechat: false, email: false })
    ).toEqual([])
  })
})

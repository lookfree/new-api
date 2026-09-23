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
import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useTopNavLinks } from '../use-top-nav-links'

const statusState: { status: Record<string, unknown> | null } = {
  status: null,
}

vi.mock('@/hooks/use-status', () => ({
  useStatus: () => statusState,
}))

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: () => ({ auth: { user: null } }),
}))

function withModules(modules: Record<string, unknown>) {
  statusState.status = { HeaderNavModules: JSON.stringify(modules) }
}

describe('useTopNavLinks', () => {
  beforeEach(() => {
    statusState.status = null
  })

  it('orders links as the prototype: marketplace, prices, docs, contact, console', () => {
    withModules({
      home: true,
      console: true,
      pricing: { enabled: true, requireAuth: false },
      rankings: { enabled: false, requireAuth: false },
      docs: true,
      about: false,
    })

    const { result } = renderHook(() => useTopNavLinks())

    expect(result.current.map((link) => link.title)).toEqual([
      'Model marketplace',
      'Prices',
      'Docs',
      'Contact',
      'Console',
    ])
  })

  it('points the prices link at the pricing section of the home page', () => {
    withModules({ pricing: { enabled: true, requireAuth: false } })

    const { result } = renderHook(() => useTopNavLinks())
    const prices = result.current.find((link) => link.title === 'Prices')

    expect(prices).toMatchObject({ href: '/', hash: 'pricing' })
  })

  it('never lists a separate home link', () => {
    withModules({ home: true })

    const { result } = renderHook(() => useTopNavLinks())

    expect(result.current.some((link) => link.href === '/' && !link.hash)).toBe(
      false
    )
  })
})

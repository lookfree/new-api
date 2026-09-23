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

import { findActiveNavTitle } from '../lib/nav-title'
import type { NavGroup } from '../types'

const groups: NavGroup[] = [
  {
    id: 'console',
    title: '',
    items: [
      { title: 'Overview', url: '/dashboard/overview' },
      { title: 'API Keys', url: '/keys' },
      {
        title: 'Task Logs',
        url: '/usage-logs/task',
        activeUrls: ['/usage-logs/drawing'],
      },
    ],
  },
  {
    id: 'more',
    title: 'More',
    items: [
      { title: 'Chat', type: 'chat-presets' },
      {
        title: 'Models',
        items: [
          { title: 'Metadata', url: '/models/metadata' },
          { title: 'Deployments', url: '/models/deployments' },
        ],
      },
    ],
  },
]

describe('findActiveNavTitle', () => {
  it('returns the title of the entry that owns the URL', () => {
    expect(findActiveNavTitle(groups, '/keys')).toBe('API Keys')
  })

  it('ignores the query string when matching', () => {
    expect(findActiveNavTitle(groups, '/keys?page=2')).toBe('API Keys')
  })

  it('prefers the active sub-item of a collapsible entry over the entry itself', () => {
    expect(findActiveNavTitle(groups, '/models/deployments')).toBe(
      'Deployments'
    )
  })

  it('matches an entry through its alternate active URLs', () => {
    expect(findActiveNavTitle(groups, '/usage-logs/drawing')).toBe('Task Logs')
  })

  it('returns an empty title for a URL the sidebar does not list', () => {
    expect(findActiveNavTitle(groups, '/somewhere-else')).toBe('')
  })
})

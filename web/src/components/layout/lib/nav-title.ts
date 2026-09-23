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
import type { NavGroup } from '../types'
import { checkIsActive } from './url-utils'

/**
 * Title of the sidebar entry that owns the current URL, shown as the console
 * header's page title. Sub-items of a collapsible entry win over the entry
 * itself, and dynamic chat presets (no URL of their own) are skipped. Returns
 * an empty string for a URL the sidebar does not list.
 */
export function findActiveNavTitle(groups: NavGroup[], href: string): string {
  for (const group of groups) {
    for (const item of group.items) {
      if (item.type === 'chat-presets') continue
      const activeChild = item.items?.find((child) =>
        checkIsActive(href, child)
      )
      if (activeChild) return activeChild.title
      if (checkIsActive(href, item)) return item.title
    }
  }
  return ''
}

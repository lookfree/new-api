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
 * Which sign-in tabs to offer, and in what order.
 *
 * Chinese visitors see phone first, as the Zetone prototype does; everyone
 * else starts with email. A method only appears once the operator has turned
 * it on, so a tab never leads to a form that cannot work.
 */

export type SignInMethod = 'phone' | 'wechat' | 'email'

export type SignInAvailability = {
  phone: boolean
  wechat: boolean
  email: boolean
}

const CHINESE_ORDER: readonly SignInMethod[] = ['phone', 'wechat', 'email']
const DEFAULT_ORDER: readonly SignInMethod[] = ['email', 'phone', 'wechat']

export function resolveSignInMethods(
  language: string,
  availability: SignInAvailability
): SignInMethod[] {
  const order = language.toLowerCase().startsWith('zh')
    ? CHINESE_ORDER
    : DEFAULT_ORDER
  return order.filter((method) => availability[method])
}

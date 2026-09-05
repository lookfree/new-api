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
import { z } from 'zod'

/**
 * Trim the formatting people paste from contact lists and drop the country
 * code, mirroring the server's NormalizePhone so both sides agree on what
 * counts as the same number.
 */
export function normalizePhone(raw: string): string {
  let phone = raw.trim().replaceAll(' ', '').replaceAll('-', '')
  if (phone.startsWith('+86')) phone = phone.slice(3)
  else if (phone.startsWith('86')) phone = phone.slice(2)
  return phone
}

/** Mainland China mobile numbers, the only format the SMS templates target. */
const PHONE_PATTERN = /^1[3-9]\d{9}$/

export const phoneFormSchema = z.object({
  phone: z
    .string()
    .min(1, 'Please enter your phone number')
    .refine((value) => PHONE_PATTERN.test(normalizePhone(value)), {
      message: 'Please enter a valid phone number',
    }),
  code: z.string().trim().min(1, 'Please enter the verification code'),
})

export type PhoneFormValues = z.infer<typeof phoneFormSchema>

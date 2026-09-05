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
 * Client-side bounds mirror the server's own limits in controller/contact.go.
 * The server is the trust boundary; this schema exists so a visitor sees the
 * problem next to the field instead of after a round trip.
 */
export const CONTACT_LIMITS = {
  name: 64,
  contact: 128,
  message: 2000,
} as const

export const contactFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Please enter your name')
    .max(CONTACT_LIMITS.name, 'Please shorten your name'),
  contact: z
    .string()
    .trim()
    .min(1, 'Please enter an email or phone number')
    .max(CONTACT_LIMITS.contact, 'Please shorten your contact details'),
  message: z
    .string()
    .trim()
    .min(1, 'Please enter your message')
    .max(CONTACT_LIMITS.message, 'Please shorten your message'),
})

export type ContactFormValues = z.infer<typeof contactFormSchema>

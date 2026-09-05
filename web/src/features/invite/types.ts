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
/** One row of the referral list, as returned by /api/user/aff/records. */
export type AffRecord = {
  invitee_id: number
  /** Masked identity; the server never sends a usable contact address. */
  display: string
  registered_at: number
  topped_up: boolean
  /** What the invitee actually paid, in the site's currency. */
  topup_money: number
  /** What this invitee has earned the inviter, in quota. */
  reward_quota: number
}

export type AffRecordsResponse = {
  success: boolean
  message?: string
  data?: {
    items: AffRecord[]
    total: number
  }
}

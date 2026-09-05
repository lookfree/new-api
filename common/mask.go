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

package common

import "strings"

// Masking helpers for identities shown to someone other than their owner, such
// as an inviter looking at the people they referred. The goal is a label the
// viewer can recognize that is not a usable contact address.

// MaskPhoneNumber renders a phone number as 138****8000.
func MaskPhoneNumber(phone string) string {
	if len(phone) < 7 {
		return "****"
	}
	return phone[:3] + "****" + phone[len(phone)-4:]
}

// MaskEmailAddress keeps the domain and the first characters of the local
// part, so two invitees at the same company stay distinguishable.
func MaskEmailAddress(email string) string {
	at := strings.LastIndex(email, "@")
	if at <= 0 {
		return MaskDisplayLabel(email)
	}
	local, domain := email[:at], email[at:]
	runes := []rune(local)
	if len(runes) <= 2 {
		return string(runes[:1]) + "***" + domain
	}
	return string(runes[:2]) + "***" + domain
}

// MaskDisplayLabel keeps the first and last rune of an arbitrary label. Runes
// rather than bytes, so a Chinese display name is not cut mid-character.
func MaskDisplayLabel(label string) string {
	runes := []rune(label)
	switch {
	case len(runes) == 0:
		return "****"
	case len(runes) <= 2:
		return string(runes[:1]) + "***"
	default:
		return string(runes[0]) + "***" + string(runes[len(runes)-1])
	}
}

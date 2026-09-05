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

package system_setting

import (
	"sync"

	"github.com/QuantumNous/new-api/setting/config"
)

// AffiliateSettings controls the top-up referral reward.
//
// This is separate from the upstream QuotaForInviter / QuotaForInvitee
// options, which grant a fixed amount once at registration. This one pays the
// inviter a share of what the invitee actually spends.
type AffiliateSettings struct {
	Enabled bool `json:"enabled"`
	// Rate is the inviter's share of a top-up, as a fraction: 0.1 is 10%.
	Rate float64 `json:"rate"`
	// FirstTopupOnly pays only on the invitee's first successful top-up.
	// Defaults on: paying once per referred customer is the agreed rule, and
	// it is the conservative default — turning it off increases payouts, which
	// should be a deliberate act rather than something a fresh install does.
	FirstTopupOnly bool `json:"first_topup_only"`
	// MinTopupQuota skips rewards for top-ups below this credited quota,
	// which is what stops a referral loop being farmed with tiny payments.
	MinTopupQuota int `json:"min_topup_quota"`
}

var affiliateSettings = AffiliateSettings{
	Enabled:        false,
	Rate:           0.1,
	FirstTopupOnly: true,
	MinTopupQuota:  0,
}

var affiliateSettingsMutex sync.RWMutex

func init() {
	config.GlobalConfig.Register("affiliate", &affiliateSettings)
}

// GetAffiliateSettings returns a copy so callers cannot mutate shared state.
func GetAffiliateSettings() AffiliateSettings {
	affiliateSettingsMutex.RLock()
	defer affiliateSettingsMutex.RUnlock()
	return affiliateSettings
}

// NormalizeAffiliateSettings clamps values that would otherwise pay the wrong
// amount. A rate outside [0, 1] falls back to 0, which pays nothing: when the
// configuration is nonsense it is far better to under-pay and be corrected
// than to over-pay real money. A negative minimum is treated as no minimum.
func NormalizeAffiliateSettings() {
	affiliateSettingsMutex.Lock()
	defer affiliateSettingsMutex.Unlock()

	if affiliateSettings.Rate < 0 || affiliateSettings.Rate > 1 ||
		affiliateSettings.Rate != affiliateSettings.Rate {
		affiliateSettings.Rate = 0
	}
	if affiliateSettings.MinTopupQuota < 0 {
		affiliateSettings.MinTopupQuota = 0
	}
}

// AffiliateRewardActive reports whether a reward should be computed at all.
func AffiliateRewardActive() bool {
	s := GetAffiliateSettings()
	return s.Enabled && s.Rate > 0
}

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
	"math"
	"testing"

	"github.com/stretchr/testify/assert"
)

// withAffiliateSettings swaps in a configuration for one test and restores the
// previous one afterwards, so tests cannot leak state into each other.
func withAffiliateSettings(t *testing.T, s AffiliateSettings) {
	t.Helper()
	previous := affiliateSettings
	affiliateSettings = s
	t.Cleanup(func() { affiliateSettings = previous })
}

func TestAffiliateDefaults(t *testing.T) {
	t.Run("rewards are off until an operator turns them on", func(t *testing.T) {
		assert.False(t, GetAffiliateSettings().Enabled)
	})

	t.Run("pays only on the first top-up by default", func(t *testing.T) {
		// The agreed business rule. It is also the conservative default:
		// turning it off increases payouts and should be deliberate.
		assert.True(t, GetAffiliateSettings().FirstTopupOnly)
	})

	t.Run("defaults to a ten percent share", func(t *testing.T) {
		assert.InDelta(t, 0.1, GetAffiliateSettings().Rate, 1e-9)
	})
}

func TestNormalizeAffiliateSettings(t *testing.T) {
	cases := []struct {
		name     string
		rate     float64
		wantRate float64
	}{
		{"a valid rate is left alone", 0.15, 0.15},
		{"zero is valid and pays nothing", 0, 0},
		{"one is valid and pays the whole top-up", 1, 1},
		{"a negative rate falls back to zero", -0.5, 0},
		{"a rate above one falls back to zero", 1.5, 0},
		{"NaN falls back to zero", math.NaN(), 0},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			withAffiliateSettings(t, AffiliateSettings{Enabled: true, Rate: tc.rate})

			NormalizeAffiliateSettings()

			assert.InDelta(t, tc.wantRate, GetAffiliateSettings().Rate, 1e-9)
		})
	}

	t.Run("a negative minimum becomes no minimum", func(t *testing.T) {
		withAffiliateSettings(t, AffiliateSettings{
			Enabled: true, Rate: 0.1, MinTopupQuota: -100,
		})

		NormalizeAffiliateSettings()

		assert.Equal(t, 0, GetAffiliateSettings().MinTopupQuota)
	})
}

func TestAffiliateRewardActive(t *testing.T) {
	cases := []struct {
		name     string
		settings AffiliateSettings
		want     bool
	}{
		{"enabled with a positive rate", AffiliateSettings{Enabled: true, Rate: 0.1}, true},
		{"disabled outright", AffiliateSettings{Enabled: false, Rate: 0.1}, false},
		{"enabled but paying nothing", AffiliateSettings{Enabled: true, Rate: 0}, false},
		{"enabled with a negative rate", AffiliateSettings{Enabled: true, Rate: -1}, false},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			withAffiliateSettings(t, tc.settings)

			assert.Equal(t, tc.want, AffiliateRewardActive())
		})
	}
}

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

package model

import (
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestCalculateAffReward(t *testing.T) {
	t.Run("pays the configured share of the top-up", func(t *testing.T) {
		reward, err := CalculateAffReward(1_000_000, 0.1)

		require.NoError(t, err)
		assert.Equal(t, 100_000, reward)
	})

	t.Run("rounds rather than truncating toward zero", func(t *testing.T) {
		// 7 * 0.5 is 3.5; truncation would silently short the inviter.
		reward, err := CalculateAffReward(7, 0.5)

		require.NoError(t, err)
		assert.Equal(t, 4, reward)
	})

	t.Run("a zero rate pays nothing and is not an error", func(t *testing.T) {
		reward, err := CalculateAffReward(1_000_000, 0)

		require.NoError(t, err)
		assert.Equal(t, 0, reward)
	})

	t.Run("a negative rate can never produce a credit", func(t *testing.T) {
		reward, err := CalculateAffReward(1_000_000, -0.5)

		require.NoError(t, err)
		assert.Equal(t, 0, reward)
	})

	t.Run("a non-positive top-up pays nothing", func(t *testing.T) {
		for _, quota := range []int{0, -1, -1_000_000} {
			reward, err := CalculateAffReward(quota, 0.1)

			require.NoError(t, err)
			assert.Equal(t, 0, reward, "quota=%d", quota)
		}
	})

	t.Run("a share too small to round up pays nothing", func(t *testing.T) {
		reward, err := CalculateAffReward(1, 0.1)

		require.NoError(t, err)
		assert.Equal(t, 0, reward)
	})

	t.Run("a full-rate reward equals the top-up", func(t *testing.T) {
		reward, err := CalculateAffReward(12_345, 1)

		require.NoError(t, err)
		assert.Equal(t, 12_345, reward)
	})

	t.Run("a product past the wallet ceiling errors instead of saturating silently", func(t *testing.T) {
		// Defense in depth: NormalizeAffiliateSettings clamps the rate into
		// [0, 1], but this conversion must still refuse a product it cannot
		// represent rather than quietly crediting a clamped or wrapped value.
		_, err := CalculateAffReward(common.MaxWalletQuota, 2)

		assert.Error(t, err)
	})

	t.Run("never exceeds the wallet ceiling", func(t *testing.T) {
		reward, err := CalculateAffReward(common.MaxWalletQuota, 0.5)

		require.NoError(t, err)
		assert.LessOrEqual(t, reward, common.MaxWalletQuota)
		assert.Greater(t, reward, 0)
	})
}

func TestMaskInviteeIdentity(t *testing.T) {
	cases := []struct {
		name string
		user User
		want string
	}{
		{
			name: "phone wins and is masked",
			user: User{Phone: "13800138000", Email: "someone@example.com"},
			want: "138****8000",
		},
		{
			name: "email is used when there is no phone",
			user: User{Email: "someone@example.com"},
			want: "so***@example.com",
		},
		{
			name: "short email local part keeps only one character",
			user: User{Email: "ab@example.com"},
			want: "a***@example.com",
		},
		{
			name: "display name is used when there is no contact",
			user: User{DisplayName: "张三丰"},
			want: "张***丰",
		},
		{
			name: "username is the last resort",
			user: User{Username: "phone_42"},
			want: "p***2",
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			assert.Equal(t, tc.want, maskInviteeIdentity(tc.user))
		})
	}

	t.Run("never returns a usable address", func(t *testing.T) {
		masked := maskInviteeIdentity(User{Email: "victim@example.com"})

		assert.NotContains(t, masked, "victim")
	})
}

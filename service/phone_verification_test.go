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

package service

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestNormalizePhone(t *testing.T) {
	cases := []struct {
		name  string
		input string
		want  string
	}{
		{"plain number", "13800138000", "13800138000"},
		{"country code with plus", "+8613800138000", "13800138000"},
		{"country code without plus", "8613800138000", "13800138000"},
		{"spaces from a contact list", "138 0013 8000", "13800138000"},
		{"hyphens from a contact list", "138-0013-8000", "13800138000"},
		{"surrounding whitespace", "  13800138000  ", "13800138000"},
		{"empty stays empty", "", ""},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			assert.Equal(t, tc.want, NormalizePhone(tc.input))
		})
	}
}

func TestIsValidPhone(t *testing.T) {
	cases := []struct {
		name  string
		input string
		want  bool
	}{
		{"mainland mobile", "13800138000", true},
		{"prefix 19 is valid", "19900199000", true},
		{"prefix 12 is not a mobile range", "12800138000", false},
		{"landline is rejected", "01012345678", false},
		{"too short", "1380013800", false},
		{"too long", "138001380000", false},
		{"letters rejected", "1380013800a", false},
		{"empty rejected", "", false},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			assert.Equal(t, tc.want, IsValidPhone(tc.input))
		})
	}
}

func TestNormalizeThenValidateAcceptsPastedFormats(t *testing.T) {
	// The two functions are always used as a pair, and the formats people
	// paste only pass validation because normalization ran first.
	for _, raw := range []string{"+86 138-0013-8000", "86 13800138000"} {
		assert.True(t, IsValidPhone(NormalizePhone(raw)), "raw=%s", raw)
	}
}

func TestGenerateNumericCode(t *testing.T) {
	t.Run("returns the requested number of digits", func(t *testing.T) {
		code, err := GenerateNumericCode(6)

		require.NoError(t, err)
		assert.Len(t, code, 6)
		assert.Regexp(t, `^\d{6}$`, code)
	})

	t.Run("clamps a length below the accepted range to six", func(t *testing.T) {
		code, err := GenerateNumericCode(2)

		require.NoError(t, err)
		assert.Len(t, code, 6)
	})

	t.Run("clamps a length above the accepted range to six", func(t *testing.T) {
		code, err := GenerateNumericCode(64)

		require.NoError(t, err)
		assert.Len(t, code, 6)
	})

	t.Run("honors a length inside the accepted range", func(t *testing.T) {
		code, err := GenerateNumericCode(4)

		require.NoError(t, err)
		assert.Len(t, code, 4)
	})

	t.Run("is digits only, never hex", func(t *testing.T) {
		// The shared UUID-derived generator yields hex, which an SMS template
		// cannot carry; this is the reason for a separate generator.
		for i := 0; i < 32; i++ {
			code, err := GenerateNumericCode(8)
			require.NoError(t, err)
			assert.Regexp(t, `^\d{8}$`, code)
		}
	})
}

func TestMaskPhone(t *testing.T) {
	cases := []struct {
		name  string
		input string
		want  string
	}{
		{"mainland mobile shows first three and last four", "13800138000", "138****8000"},
		{"exactly seven digits still masks the middle", "1380013", "138****0013"},
		{"shorter than seven is fully masked", "138001", "****"},
		{"empty is fully masked", "", "****"},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			assert.Equal(t, tc.want, maskPhone(tc.input))
		})
	}
}

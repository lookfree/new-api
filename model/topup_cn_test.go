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

	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/assert"
)

// paidAmountMatches mirrors the comparison RechargeCN performs, so the rule
// that decides whether money moves is testable without a database.
func paidAmountMatches(orderMoney float64, paid decimal.Decimal) bool {
	expected := decimal.NewFromFloat(orderMoney)
	return !paid.Sub(expected).Abs().GreaterThan(paidAmountTolerance)
}

func TestPaidAmountMatching(t *testing.T) {
	cases := []struct {
		name       string
		orderMoney float64
		paid       string
		want       bool
	}{
		{"exact match settles", 730.00, "730.00", true},
		{"one cent under is tolerated", 730.00, "729.99", true},
		{"one cent over is tolerated", 730.00, "730.01", true},
		{"underpaying by a yuan is rejected", 730.00, "729.00", false},
		{"paying one yuan for a 730 order is rejected", 730.00, "1.00", false},
		{"paying zero is rejected", 730.00, "0", false},
		{"a negative amount is rejected", 730.00, "-730.00", false},
		{"overpaying beyond tolerance is rejected", 730.00, "7300.00", false},
		{"a fractional order amount still matches", 0.99, "0.99", true},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			paid, err := decimal.NewFromString(tc.paid)
			assert.NoError(t, err)

			assert.Equal(t, tc.want, paidAmountMatches(tc.orderMoney, paid))
		})
	}
}

func TestPaidAmountToleranceIsOneCent(t *testing.T) {
	// The tolerance exists only to absorb the two gateways reporting money in
	// different units. Widening it would let real underpayment through.
	assert.True(t, paidAmountTolerance.Equal(decimal.NewFromFloat(0.01)))
}

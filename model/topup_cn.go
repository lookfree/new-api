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
	"errors"
	"fmt"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/logger"
	"github.com/shopspring/decimal"
	"gorm.io/gorm"
)

// Settlement for the official Alipay and WeChat Pay integrations.

// ErrTopUpAmountMismatch means the amount the gateway says was paid does not
// match the order. This is the signal for a tampered or mismatched callback.
var ErrTopUpAmountMismatch = errors.New("paid amount does not match the order")

// paidAmountTolerance absorbs the last-cent differences that come from the two
// gateways reporting money in different units (yuan strings and integer cents).
// Anything larger is treated as a mismatch rather than rounded away.
var paidAmountTolerance = decimal.NewFromFloat(0.01)

// RechargeCN completes a top-up paid through Alipay or WeChat Pay.
//
// `paidAmount` is what the gateway reports as actually paid, in yuan. It is
// compared against the order before any quota is credited: a verified
// signature only proves the callback came from the gateway, not that it is for
// the right amount, so without this check a one-cent order could be used to
// claim a hundred-yuan top-up.
//
// Returns alreadyDone when the order was already settled, which is the normal
// outcome of a gateway retrying its callback.
func RechargeCN(
	tradeNo string,
	provider string,
	paidAmount decimal.Decimal,
	callerIp string,
) (alreadyDone bool, err error) {
	if tradeNo == "" {
		return false, errors.New("未提供支付单号")
	}

	refCol := "`trade_no`"
	if common.UsingMainDatabase(common.DatabaseTypePostgreSQL) {
		refCol = `"trade_no"`
	}

	var quotaToAdd int
	topUp := &TopUp{}
	err = DB.Transaction(func(tx *gorm.DB) error {
		if err := lockForUpdate(tx).Where(refCol+" = ?", tradeNo).First(topUp).Error; err != nil {
			return ErrTopUpNotFound
		}
		if topUp.PaymentProvider != provider {
			return ErrPaymentMethodMismatch
		}
		if topUp.Status == common.TopUpStatusSuccess {
			alreadyDone = true
			return nil
		}
		if topUp.Status != common.TopUpStatusPending {
			return ErrTopUpStatusInvalid
		}

		expected := decimal.NewFromFloat(topUp.Money)
		if paidAmount.Sub(expected).Abs().GreaterThan(paidAmountTolerance) {
			return ErrTopUpAmountMismatch
		}

		var quotaErr error
		quotaToAdd, quotaErr = common.WalletQuotaFromDecimalStrict(
			decimal.NewFromInt(topUp.Amount).Mul(decimal.NewFromFloat(common.QuotaPerUnit)),
		)
		if quotaErr != nil || quotaToAdd <= 0 {
			return ErrInvalidTopUpQuota
		}

		topUp.CompleteTime = common.GetTimestamp()
		topUp.Status = common.TopUpStatusSuccess
		if err := tx.Save(topUp).Error; err != nil {
			return err
		}
		return settleTopUpCredit(tx, topUp, quotaToAdd, nil)
	})
	if err != nil {
		if errors.Is(err, ErrTopUpAmountMismatch) {
			// Worth shouting about: either a gateway bug or someone probing
			// the callback endpoint with a forged amount.
			common.SysError(fmt.Sprintf(
				"%s 回调金额与订单不符，已拒绝 trade_no=%s expected=%.2f paid=%s client_ip=%s",
				provider, tradeNo, topUp.Money, paidAmount.String(), callerIp,
			))
		} else if !errors.Is(err, ErrTopUpNotFound) &&
			!errors.Is(err, ErrPaymentMethodMismatch) &&
			!errors.Is(err, ErrTopUpStatusInvalid) {
			common.SysError(fmt.Sprintf("%s topup failed: %s", provider, err.Error()))
		}
		return false, err
	}
	if alreadyDone {
		return true, nil
	}

	syncCreditUserQuotaCache(topUp.UserId, quotaToAdd, provider+" topup")
	common.SysLog(fmt.Sprintf(
		"%s 充值成功 trade_no=%s user_id=%d quota_to_add=%d money=%.2f",
		provider, topUp.TradeNo, topUp.UserId, quotaToAdd, topUp.Money,
	))
	RecordTopupLog(
		topUp.UserId,
		fmt.Sprintf("使用在线充值成功，充值金额: %v，支付金额：%f",
			logger.LogQuota(quotaToAdd), topUp.Money),
		callerIp, topUp.PaymentMethod, provider,
	)
	return false, nil
}

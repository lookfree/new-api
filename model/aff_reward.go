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
	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/setting/system_setting"
	"github.com/shopspring/decimal"
	"gorm.io/gorm"
)

// AffReward is one referral payout: the inviter's share of a single top-up.
//
// The rate is stored alongside the amount rather than recomputed at read time,
// so changing the configured rate later cannot rewrite what people were
// already paid. This table is the record of account for referral earnings.
type AffReward struct {
	Id int `json:"id"`
	// InviterId is the user who receives the reward.
	InviterId int `json:"inviter_id" gorm:"index"`
	// InviteeId is the user whose top-up generated it.
	InviteeId int `json:"invitee_id" gorm:"index"`
	// TopUpId links back to the payment, so a payout can be traced to a payment.
	TopUpId int `json:"top_up_id" gorm:"index"`
	// TopUpQuota is the quota credited to the invitee by that top-up.
	TopUpQuota int `json:"top_up_quota"`
	// Rate is the fraction applied at the time of the payout.
	Rate float64 `json:"rate"`
	// RewardQuota is what the inviter actually received.
	RewardQuota int   `json:"reward_quota"`
	CreatedAt   int64 `json:"created_at" gorm:"bigint;index"`
}

// CalculateAffReward returns the inviter's share of a credited top-up.
//
// Rounding goes through the shared decimal helper rather than a bare cast, so
// an oversized product saturates into an error instead of wrapping into a
// negative credit. A non-positive result means "no payout" and is not an
// error: it is the normal outcome of a tiny top-up or a zero rate.
func CalculateAffReward(topUpQuota int, rate float64) (int, error) {
	if topUpQuota <= 0 || rate <= 0 {
		return 0, nil
	}
	reward, err := common.WalletQuotaFromDecimalStrict(
		decimal.NewFromInt(int64(topUpQuota)).Mul(decimal.NewFromFloat(rate)),
	)
	if err != nil {
		return 0, err
	}
	if reward <= 0 {
		return 0, nil
	}
	return reward, nil
}

// hasEarlierSuccessfulTopUp reports whether the user completed a top-up before
// this one, which is how the first-top-up-only mode decides eligibility.
func hasEarlierSuccessfulTopUp(tx *gorm.DB, userId int, currentTopUpId int) (bool, error) {
	var count int64
	err := tx.Model(&TopUp{}).
		Where("user_id = ? AND status = ? AND id <> ?",
			userId, common.TopUpStatusSuccess, currentTopUpId).
		Count(&count).Error
	if err != nil {
		return false, err
	}
	return count > 0, nil
}

// GrantAffReward credits the inviter's referral balance for a completed
// top-up, inside the caller's transaction so the payout and the top-up commit
// or roll back together.
//
// Returns nil without writing anything whenever no reward is due: rewards
// disabled, no inviter, a self-referral, a top-up below the minimum, or a
// repeat top-up while the first-only mode is on. Callers treat "no reward" and
// "reward granted" the same way, because a payment must never fail over a
// referral bonus.
func GrantAffReward(tx *gorm.DB, topUp *TopUp, creditedQuota int) error {
	if topUp == nil || creditedQuota <= 0 {
		return nil
	}
	if !system_setting.AffiliateRewardActive() {
		return nil
	}
	settings := system_setting.GetAffiliateSettings()
	if creditedQuota < settings.MinTopupQuota {
		return nil
	}

	var invitee User
	if err := tx.Select("id", "inviter_id").
		Where("id = ?", topUp.UserId).First(&invitee).Error; err != nil {
		return err
	}
	// A missing inviter is the common case, and a self-referral would let a
	// user pay themselves a rebate on their own spending.
	if invitee.InviterId <= 0 || invitee.InviterId == invitee.Id {
		return nil
	}

	if settings.FirstTopupOnly {
		repeat, err := hasEarlierSuccessfulTopUp(tx, topUp.UserId, topUp.Id)
		if err != nil {
			return err
		}
		if repeat {
			return nil
		}
	}

	reward, err := CalculateAffReward(creditedQuota, settings.Rate)
	if err != nil {
		return err
	}
	if reward <= 0 {
		return nil
	}

	// The inviter may have been deleted since the invite; crediting a missing
	// row would silently do nothing, so check the update actually applied.
	result := tx.Model(&User{}).
		Where("id = ?", invitee.InviterId).
		Updates(map[string]interface{}{
			"aff_quota":   gorm.Expr("aff_quota + ?", reward),
			"aff_history": gorm.Expr("aff_history + ?", reward),
		})
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return nil
	}

	return tx.Create(&AffReward{
		InviterId:   invitee.InviterId,
		InviteeId:   topUp.UserId,
		TopUpId:     topUp.Id,
		TopUpQuota:  creditedQuota,
		Rate:        settings.Rate,
		RewardQuota: reward,
		CreatedAt:   common.GetTimestamp(),
	}).Error
}

// AffRecord is one row of the inviter-facing referral list.
type AffRecord struct {
	InviteeId    int    `json:"invitee_id"`
	Display      string `json:"display"`
	RegisteredAt int64  `json:"registered_at"`
	ToppedUp     bool   `json:"topped_up"`
	// TopUpMoney is what the invitee actually paid, which is the figure the
	// invite page shows as their top-up. Reward is in quota, the unit the
	// inviter's balance is denominated in.
	TopUpMoney  float64 `json:"topup_money"`
	RewardQuota int     `json:"reward_quota"`
}

// GetAffRecords lists everyone a user invited, with what each of them has
// generated so far.
//
// Contact details are masked here rather than in the handler, so no caller can
// accidentally hand an inviter their invitees' full email or phone number.
func GetAffRecords(inviterId int, limit int, offset int) ([]AffRecord, int64, error) {
	if limit <= 0 || limit > 100 {
		limit = 20
	}
	if offset < 0 {
		offset = 0
	}

	var total int64
	if err := DB.Model(&User{}).
		Where("inviter_id = ?", inviterId).Count(&total).Error; err != nil {
		return nil, 0, err
	}

	var invitees []User
	err := DB.Select("id", "username", "display_name", "email", "phone", "created_at").
		Where("inviter_id = ?", inviterId).
		Order("id DESC").Limit(limit).Offset(offset).Find(&invitees).Error
	if err != nil {
		return nil, 0, err
	}
	if len(invitees) == 0 {
		return []AffRecord{}, total, nil
	}

	ids := make([]int, 0, len(invitees))
	for _, invitee := range invitees {
		ids = append(ids, invitee.Id)
	}

	// One aggregate per metric instead of a query per invitee, so the list
	// costs three queries regardless of page size.
	type moneyRow struct {
		UserId int
		Total  float64
	}
	type quotaRow struct {
		UserId int
		Total  int64
	}

	topUpByUser := make(map[int]float64, len(ids))
	var topUpRows []moneyRow
	if err := DB.Model(&TopUp{}).
		Select("user_id as user_id, SUM(money) as total").
		Where("user_id IN ? AND status = ?", ids, common.TopUpStatusSuccess).
		Group("user_id").Scan(&topUpRows).Error; err != nil {
		return nil, 0, err
	}
	for _, row := range topUpRows {
		topUpByUser[row.UserId] = row.Total
	}

	rewardByUser := make(map[int]int64, len(ids))
	var rewardRows []quotaRow
	if err := DB.Model(&AffReward{}).
		Select("invitee_id as user_id, SUM(reward_quota) as total").
		Where("inviter_id = ? AND invitee_id IN ?", inviterId, ids).
		Group("invitee_id").Scan(&rewardRows).Error; err != nil {
		return nil, 0, err
	}
	for _, row := range rewardRows {
		rewardByUser[row.UserId] = row.Total
	}

	records := make([]AffRecord, 0, len(invitees))
	for _, invitee := range invitees {
		toppedUpMoney := topUpByUser[invitee.Id]
		records = append(records, AffRecord{
			InviteeId:    invitee.Id,
			Display:      maskInviteeIdentity(invitee),
			RegisteredAt: invitee.CreatedAt,
			ToppedUp:     toppedUpMoney > 0,
			TopUpMoney:   toppedUpMoney,
			RewardQuota:  int(rewardByUser[invitee.Id]),
		})
	}
	return records, total, nil
}

// maskInviteeIdentity produces a label an inviter can recognize without
// exposing a usable contact address.
func maskInviteeIdentity(user User) string {
	if user.Phone != "" {
		return common.MaskPhoneNumber(user.Phone)
	}
	if user.Email != "" {
		return common.MaskEmailAddress(user.Email)
	}
	if user.DisplayName != "" {
		return common.MaskDisplayLabel(user.DisplayName)
	}
	return common.MaskDisplayLabel(user.Username)
}

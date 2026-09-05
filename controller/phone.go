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

package controller

import (
	"errors"
	"strconv"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/service"
	"github.com/QuantumNous/new-api/setting/system_setting"
	"github.com/gin-gonic/gin"
)

type PhoneCodeRequest struct {
	Phone string `json:"phone"`
}

type PhoneLoginRequest struct {
	Phone string `json:"phone"`
	Code  string `json:"code"`
	// AffCode is the inviter's referral code, carried from the ?aff= / ?invite=
	// link the visitor arrived on. Only meaningful when this call registers a
	// new account.
	AffCode string `json:"aff_code"`
}

// SendPhoneVerificationCode issues an SMS verification code.
//
// The response never reveals whether the number already has an account: the
// same success shape is returned either way, so this endpoint cannot be used
// to enumerate customers.
func SendPhoneVerificationCode(c *gin.Context) {
	if !system_setting.SMSReady() {
		common.ApiErrorMsg(c, "管理员未开启手机号登录")
		return
	}

	var req PhoneCodeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.ApiError(c, err)
		return
	}

	phone := service.NormalizePhone(req.Phone)
	if !service.IsValidPhone(phone) {
		common.ApiErrorMsg(c, "请输入正确的手机号")
		return
	}

	code, err := service.IssuePhoneVerificationCode(phone)
	if err != nil {
		if errors.Is(err, service.ErrPhoneCodeCooldown) {
			common.ApiErrorMsg(c, "验证码已发送，请稍后再试")
			return
		}
		common.SysError("failed to issue phone verification code: " + err.Error())
		common.ApiErrorMsg(c, "验证码发送失败，请稍后重试")
		return
	}

	if err := service.SendSMSVerificationCode(phone, code); err != nil {
		// The provider's reason goes to the log; the caller gets a generic
		// message so template and balance details are not leaked.
		common.SysError("failed to send phone verification code: " + err.Error())
		common.ApiErrorMsg(c, "验证码发送失败，请稍后重试")
		return
	}

	common.ApiSuccess(c, nil)
}

// PhoneLogin verifies a code and signs the visitor in, registering the account
// on first use the way WeChat sign-in does.
func PhoneLogin(c *gin.Context) {
	if !system_setting.SMSReady() {
		common.ApiErrorMsg(c, "管理员未开启手机号登录")
		return
	}

	var req PhoneLoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.ApiError(c, err)
		return
	}

	phone := service.NormalizePhone(req.Phone)
	if !service.IsValidPhone(phone) {
		common.ApiErrorMsg(c, "请输入正确的手机号")
		return
	}
	if !service.VerifyPhoneCode(phone, req.Code) {
		common.ApiErrorMsg(c, "验证码错误或已过期")
		return
	}

	user := model.User{Phone: phone}
	if model.IsPhoneAlreadyTaken(phone) {
		if err := user.FillUserByPhone(); err != nil {
			common.ApiError(c, err)
			return
		}
		if user.Id == 0 {
			common.ApiErrorMsg(c, "该账户已注销")
			return
		}
		setupLogin(&user, c)
		return
	}

	if !common.RegisterEnabled {
		common.ApiErrorMsg(c, "管理员关闭了新用户注册")
		return
	}

	inviterId, _ := model.GetUserIdByAffCode(req.AffCode)
	user.Username = "phone_" + strconv.Itoa(model.GetMaxUserId()+1)
	user.DisplayName = phone[:3] + "****" + phone[7:]
	user.Role = common.RoleCommonUser
	user.Status = common.UserStatusEnabled
	user.InviterId = inviterId

	if err := user.Insert(inviterId); err != nil {
		common.ApiError(c, err)
		return
	}

	setupLogin(&user, c)
}

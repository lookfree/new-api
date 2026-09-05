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
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/logger"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/service"
	"github.com/QuantumNous/new-api/setting/system_setting"
	"github.com/gin-gonic/gin"
	"github.com/shopspring/decimal"
)

type CNPayRequest struct {
	Amount int64 `json:"amount"`
}

// createCNTopUpOrder performs the checks every paid top-up shares and inserts
// the pending order. Returns nil when it has already answered the request.
func createCNTopUpOrder(c *gin.Context, provider string, amount int64) *model.TopUp {
	if amount < getMinTopup() {
		common.ApiErrorMsg(c, fmt.Sprintf("充值数量不能小于 %d", getMinTopup()))
		return nil
	}
	userId := c.GetInt("id")
	if rejectInvalidTopUpQuota(c, userId, amount) {
		return nil
	}

	group, err := model.GetUserGroup(userId, true)
	if err != nil {
		common.ApiErrorMsg(c, "获取用户分组失败")
		return nil
	}
	payMoney := getPayMoney(amount, group)
	if payMoney < 0.01 {
		common.ApiErrorMsg(c, "充值金额过低")
		return nil
	}

	tradeNo := fmt.Sprintf("USR%dNO%s%d",
		userId, common.GetRandomString(6), time.Now().Unix())
	topUp := &model.TopUp{
		UserId:          userId,
		Amount:          amount,
		Money:           payMoney,
		TradeNo:         tradeNo,
		PaymentMethod:   provider,
		PaymentProvider: provider,
		CreateTime:      time.Now().Unix(),
		Status:          common.TopUpStatusPending,
	}
	if err := topUp.Insert(); err != nil {
		logger.LogError(c.Request.Context(), fmt.Sprintf(
			"%s 创建充值订单失败 user_id=%d trade_no=%s error=%q",
			provider, userId, tradeNo, err.Error()))
		common.ApiErrorMsg(c, "创建订单失败")
		return nil
	}
	return topUp
}

// RequestAlipayPay creates an order and returns the checkout URL to redirect to.
func RequestAlipayPay(c *gin.Context) {
	if !system_setting.AlipayReady() {
		common.ApiErrorMsg(c, "管理员未配置支付宝支付")
		return
	}
	var req CNPayRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.ApiError(c, err)
		return
	}

	topUp := createCNTopUpOrder(c, model.PaymentProviderAlipay, req.Amount)
	if topUp == nil {
		return
	}

	callback := service.GetCallbackAddress()
	payUrl, err := service.BuildAlipayPagePayURL(service.AlipayPageOrder{
		OutTradeNo:  topUp.TradeNo,
		TotalAmount: decimal.NewFromFloat(topUp.Money).StringFixed(2),
		Subject:     fmt.Sprintf("账户充值 %d", topUp.Amount),
		NotifyURL:   callback + "/api/user/alipay/notify",
		ReturnURL:   paymentReturnPath("/wallet"),
	})
	if err != nil {
		logger.LogError(c.Request.Context(),
			"支付宝 构建支付链接失败 error="+err.Error())
		common.ApiErrorMsg(c, "发起支付失败，请稍后重试")
		return
	}

	common.ApiSuccess(c, gin.H{"url": payUrl, "trade_no": topUp.TradeNo})
}

// AlipayNotify settles an order from Alipay's asynchronous notification.
//
// Alipay retries until it receives the literal body "success", so every
// terminal outcome, including a rejection, must answer deliberately: replying
// "success" to a bad callback stops the retries, while replying "fail" to an
// already-settled one invites them forever.
func AlipayNotify(c *gin.Context) {
	if !system_setting.AlipayReady() {
		_, _ = c.Writer.WriteString("fail")
		return
	}
	if err := c.Request.ParseForm(); err != nil {
		_, _ = c.Writer.WriteString("fail")
		return
	}

	params := make(map[string]string, len(c.Request.PostForm))
	for key := range c.Request.PostForm {
		params[key] = c.Request.PostForm.Get(key)
	}

	settings := system_setting.GetAlipaySettings()
	if err := service.VerifyAlipayCallback(params, settings.PublicKey); err != nil {
		logger.LogWarn(c.Request.Context(), fmt.Sprintf(
			"支付宝 回调验签失败，已拒绝 client_ip=%s error=%q", c.ClientIP(), err.Error()))
		_, _ = c.Writer.WriteString("fail")
		return
	}

	// Signature verified: the payload is genuinely Alipay's. Everything below
	// still has to be checked, because a valid signature says nothing about
	// whether this callback belongs to us or matches the order.
	if params["app_id"] != settings.AppId {
		logger.LogWarn(c.Request.Context(), fmt.Sprintf(
			"支付宝 回调 app_id 不匹配，已拒绝 got=%q client_ip=%s",
			params["app_id"], c.ClientIP()))
		_, _ = c.Writer.WriteString("fail")
		return
	}
	status := params["trade_status"]
	if status != "TRADE_SUCCESS" && status != "TRADE_FINISHED" {
		// Not an error: Alipay notifies on intermediate states too. Ack so it
		// stops retrying this particular event.
		_, _ = c.Writer.WriteString("success")
		return
	}

	paid, err := decimal.NewFromString(params["total_amount"])
	if err != nil {
		logger.LogWarn(c.Request.Context(),
			"支付宝 回调金额无法解析，已拒绝 value="+params["total_amount"])
		_, _ = c.Writer.WriteString("fail")
		return
	}

	_, err = model.RechargeCN(
		params["out_trade_no"], model.PaymentProviderAlipay, paid, c.ClientIP())
	if err != nil && !errors.Is(err, model.ErrTopUpNotFound) {
		if errors.Is(err, model.ErrTopUpAmountMismatch) {
			// Already logged with full detail by the settlement layer.
			_, _ = c.Writer.WriteString("fail")
			return
		}
		logger.LogError(c.Request.Context(), "支付宝 结算失败 error="+err.Error())
		_, _ = c.Writer.WriteString("fail")
		return
	}
	if errors.Is(err, model.ErrTopUpNotFound) {
		logger.LogWarn(c.Request.Context(),
			"支付宝 回调对应的订单不存在 trade_no="+params["out_trade_no"])
		_, _ = c.Writer.WriteString("fail")
		return
	}

	_, _ = c.Writer.WriteString("success")
}

// RequestWechatPay creates an order and returns the code_url to render as a QR.
func RequestWechatPay(c *gin.Context) {
	if !system_setting.WechatPayReady() {
		common.ApiErrorMsg(c, "管理员未配置微信支付")
		return
	}
	var req CNPayRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.ApiError(c, err)
		return
	}

	topUp := createCNTopUpOrder(c, model.PaymentProviderWechat, req.Amount)
	if topUp == nil {
		return
	}

	// WeChat works in cents and rejects fractional ones, so the payable amount
	// is converted through decimal rather than a float multiplication.
	totalFen := decimal.NewFromFloat(topUp.Money).
		Mul(decimal.NewFromInt(100)).Round(0).IntPart()

	callback := service.GetCallbackAddress()
	codeUrl, err := service.CreateWechatNativeOrder(service.WechatNativeOrder{
		OutTradeNo: topUp.TradeNo,
		TotalFen:   totalFen,
		Subject:    fmt.Sprintf("账户充值 %d", topUp.Amount),
		NotifyURL:  callback + "/api/user/wechat/notify",
	})
	if err != nil {
		logger.LogError(c.Request.Context(), "微信支付 下单失败 error="+err.Error())
		common.ApiErrorMsg(c, "发起支付失败，请稍后重试")
		return
	}

	common.ApiSuccess(c, gin.H{"code_url": codeUrl, "trade_no": topUp.TradeNo})
}

// WechatNotify settles an order from WeChat's asynchronous notification.
//
// WeChat treats any non-200 response as a failure and retries, so rejections
// answer with 401 and successes with 200.
func WechatNotify(c *gin.Context) {
	if !system_setting.WechatPayReady() {
		c.JSON(http.StatusUnauthorized, gin.H{"code": "FAIL", "message": "未配置"})
		return
	}

	body, err := io.ReadAll(io.LimitReader(c.Request.Body, 128*1024))
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"code": "FAIL", "message": "读取失败"})
		return
	}

	settings := system_setting.GetWechatPaySettings()
	err = service.VerifyWechatCallback(
		c.GetHeader("Wechatpay-Timestamp"),
		c.GetHeader("Wechatpay-Nonce"),
		string(body),
		c.GetHeader("Wechatpay-Signature"),
		settings.PublicKey,
		time.Now(),
	)
	if err != nil {
		logger.LogWarn(c.Request.Context(), fmt.Sprintf(
			"微信支付 回调验签失败，已拒绝 client_ip=%s error=%q", c.ClientIP(), err.Error()))
		c.JSON(http.StatusUnauthorized, gin.H{"code": "FAIL", "message": "验签失败"})
		return
	}

	var envelope struct {
		EventType string `json:"event_type"`
		Resource  struct {
			Ciphertext     string `json:"ciphertext"`
			Nonce          string `json:"nonce"`
			AssociatedData string `json:"associated_data"`
		} `json:"resource"`
	}
	if err := common.Unmarshal(body, &envelope); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"code": "FAIL", "message": "解析失败"})
		return
	}
	if envelope.EventType != "TRANSACTION.SUCCESS" {
		// Other events are acknowledged so WeChat stops resending them.
		c.JSON(http.StatusOK, gin.H{"code": "SUCCESS"})
		return
	}

	plaintext, err := service.DecryptWechatResource(
		envelope.Resource.Ciphertext,
		envelope.Resource.Nonce,
		envelope.Resource.AssociatedData,
		settings.ApiV3Key,
	)
	if err != nil {
		logger.LogWarn(c.Request.Context(), "微信支付 回调解密失败 error="+err.Error())
		c.JSON(http.StatusUnauthorized, gin.H{"code": "FAIL", "message": "解密失败"})
		return
	}

	var transaction service.WechatTransaction
	if err := common.Unmarshal(plaintext, &transaction); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"code": "FAIL", "message": "解析失败"})
		return
	}

	if transaction.MchId != settings.MchId || transaction.AppId != settings.AppId {
		logger.LogWarn(c.Request.Context(), fmt.Sprintf(
			"微信支付 回调商户号或应用号不匹配，已拒绝 mch=%q app=%q",
			transaction.MchId, transaction.AppId))
		c.JSON(http.StatusUnauthorized, gin.H{"code": "FAIL", "message": "商户不匹配"})
		return
	}
	if transaction.TradeState != "SUCCESS" {
		c.JSON(http.StatusOK, gin.H{"code": "SUCCESS"})
		return
	}

	paid := decimal.NewFromInt(transaction.Amount.Total).Div(decimal.NewFromInt(100))
	_, err = model.RechargeCN(
		transaction.OutTradeNo, model.PaymentProviderWechat, paid, c.ClientIP())
	if err != nil {
		logger.LogError(c.Request.Context(), fmt.Sprintf(
			"微信支付 结算失败 trade_no=%s error=%q", transaction.OutTradeNo, err.Error()))
		c.JSON(http.StatusUnauthorized, gin.H{"code": "FAIL", "message": "结算失败"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"code": "SUCCESS"})
}

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
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"io"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/logger"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/setting"
	"github.com/QuantumNous/new-api/setting/operation_setting"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/shopspring/decimal"
)

const (
	airwallexSignatureHd = "x-signature"
	airwallexTimestampHd = "x-timestamp"
	// Airwallex access tokens are valid for 30 minutes; refresh a little
	// early so an in-flight request never races an expiring token.
	airwallexTokenLifetime = 30 * time.Minute
	airwallexTokenSkew     = 2 * time.Minute
)

var (
	// A variable rather than a constant so tests can point it at a stub.
	airwallexApiBase = "https://api.airwallex.com"

	airwallexTokenMutex sync.Mutex
	airwallexToken      string
	airwallexTokenUntil time.Time
	// airwallexTokenCredentials records which client id / API key the cached
	// token was issued for.
	airwallexTokenCredentials string
)

// getAirwallexAccessToken returns a cached access token, requesting a new one
// from https://api.airwallex.com/api/v1/authentication/login once the cached
// token is within airwallexTokenSkew of expiring. Airwallex asks callers to
// reuse the token for its full lifetime rather than logging in per request.
func getAirwallexAccessToken(ctx context.Context) (string, error) {
	airwallexTokenMutex.Lock()
	defer airwallexTokenMutex.Unlock()

	clientId, apiKey := setting.AirwallexClientId, setting.AirwallexApiKey
	if clientId == "" || apiKey == "" {
		return "", fmt.Errorf("空中云汇未配置")
	}

	// A token only works for the account it was issued to, so a cached one must
	// not outlive a change of credentials (for example demo account to live).
	credentials := clientId + "\x00" + apiKey
	if airwallexToken != "" && credentials == airwallexTokenCredentials && time.Now().Before(airwallexTokenUntil) {
		return airwallexToken, nil
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, airwallexApiBase+"/api/v1/authentication/login", nil)
	if err != nil {
		return "", err
	}
	req.Header.Set("x-client-id", clientId)
	req.Header.Set("x-api-key", apiKey)

	client := &http.Client{Timeout: 15 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("连接空中云汇失败: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}
	if resp.StatusCode/100 != 2 {
		return "", fmt.Errorf("空中云汇鉴权失败 status=%d body=%q", resp.StatusCode, string(body))
	}

	var loginResp struct {
		Token string `json:"token"`
	}
	if err := common.Unmarshal(body, &loginResp); err != nil || loginResp.Token == "" {
		return "", fmt.Errorf("解析空中云汇鉴权响应失败: %v", err)
	}

	airwallexToken = loginResp.Token
	airwallexTokenCredentials = credentials
	airwallexTokenUntil = time.Now().Add(airwallexTokenLifetime - airwallexTokenSkew)
	return airwallexToken, nil
}

type AirwallexPayRequest struct {
	Amount int64 `json:"amount"`
}

type airwallexCreateIntentResponse struct {
	Id           string `json:"id"`
	ClientSecret string `json:"client_secret"`
}

// RequestAirwallexPay creates a pending TopUp and an Airwallex PaymentIntent
// for it, returning the intent id and client_secret the frontend needs to
// call Airwallex.js's redirectToCheckout(). No quota is credited here: that
// only happens once AirwallexWebhook sees payment_intent.succeeded.
func RequestAirwallexPay(c *gin.Context) {
	if !isAirwallexTopUpEnabled() {
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "空中云汇支付未启用"})
		return
	}

	var req AirwallexPayRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "参数错误"})
		return
	}
	if req.Amount < getMinTopup() {
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": fmt.Sprintf("充值数量不能小于 %d", getMinTopup())})
		return
	}

	id := c.GetInt("id")
	if rejectInvalidTopUpQuota(c, id, req.Amount) {
		return
	}

	group, err := model.GetUserGroup(id, true)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "获取用户分组失败"})
		return
	}
	// CNY has two decimals and Airwallex rejects a finer amount, while the
	// price maths (exchange rate x group ratio x discount) can produce more.
	payMoney := decimal.NewFromFloat(getPayMoney(req.Amount, group)).Round(2).InexactFloat64()
	if payMoney < 0.01 {
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "充值金额过低"})
		return
	}

	tradeNo := fmt.Sprintf("AWX%dNO%s%d", id, common.GetRandomString(6), time.Now().Unix())

	token, err := getAirwallexAccessToken(c.Request.Context())
	if err != nil {
		logger.LogError(c.Request.Context(), fmt.Sprintf("空中云汇鉴权失败 user_id=%d trade_no=%s error=%q", id, tradeNo, err.Error()))
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "拉起支付失败"})
		return
	}

	intentId, clientSecret, err := createAirwallexPaymentIntent(c.Request.Context(), token, tradeNo, payMoney)
	if err != nil {
		logger.LogError(c.Request.Context(), fmt.Sprintf("空中云汇创建支付意图失败 user_id=%d trade_no=%s amount=%.2f error=%q", id, tradeNo, payMoney, err.Error()))
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "拉起支付失败"})
		return
	}

	amount := req.Amount
	if operation_setting.GetQuotaDisplayType() == operation_setting.QuotaDisplayTypeTokens {
		amount = int64(float64(req.Amount) / common.QuotaPerUnit)
		if amount < 1 {
			amount = 1
		}
	}

	topUp := &model.TopUp{
		UserId:          id,
		Amount:          amount,
		Money:           payMoney,
		TradeNo:         tradeNo,
		PaymentMethod:   model.PaymentMethodAirwallex,
		PaymentProvider: model.PaymentProviderAirwallex,
		CreateTime:      time.Now().Unix(),
		Status:          common.TopUpStatusPending,
	}
	if err := topUp.Insert(); err != nil {
		logger.LogError(c.Request.Context(), fmt.Sprintf("空中云汇创建充值订单失败 user_id=%d trade_no=%s error=%q", id, tradeNo, err.Error()))
		c.JSON(http.StatusOK, gin.H{"message": "error", "data": "创建订单失败"})
		return
	}

	logger.LogInfo(c.Request.Context(), fmt.Sprintf("空中云汇充值订单创建成功 user_id=%d trade_no=%s amount=%d money=%.2f intent_id=%s", id, tradeNo, req.Amount, payMoney, intentId))

	c.JSON(http.StatusOK, gin.H{
		"message": "success",
		"data": gin.H{
			"intent_id":     intentId,
			"client_secret": clientSecret,
			"currency":      "CNY",
		},
	})
}

func createAirwallexPaymentIntent(ctx context.Context, token, tradeNo string, payMoney float64) (intentId string, clientSecret string, err error) {
	body := map[string]interface{}{
		"request_id":        uuid.New().String(),
		"amount":            payMoney,
		"currency":          "CNY",
		"merchant_order_id": tradeNo,
	}
	// Airwallex only redirects back to HTTPS addresses. Until the site has a
	// public HTTPS URL the field is left out, so payment creation still works
	// and the customer stays on Airwallex's confirmation page.
	if returnURL := paymentReturnPath("/wallet?airwallex=success"); strings.HasPrefix(returnURL, "https://") {
		body["return_url"] = returnURL
	}
	payload, err := common.Marshal(body)
	if err != nil {
		return "", "", err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, airwallexApiBase+"/api/v1/pa/payment_intents/create", bytes.NewReader(payload))
	if err != nil {
		return "", "", err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", "", fmt.Errorf("连接空中云汇失败: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", "", err
	}
	if resp.StatusCode/100 != 2 {
		return "", "", fmt.Errorf("空中云汇 http status %d body=%q", resp.StatusCode, string(respBody))
	}

	var parsed airwallexCreateIntentResponse
	if err := common.Unmarshal(respBody, &parsed); err != nil {
		return "", "", err
	}
	if parsed.Id == "" || parsed.ClientSecret == "" {
		return "", "", fmt.Errorf("空中云汇响应缺少 id/client_secret body=%q", string(respBody))
	}
	return parsed.Id, parsed.ClientSecret, nil
}

// verifyAirwallexSignature checks x-signature against
// hex(HMAC-SHA256(x-timestamp + raw body, webhook secret)), exactly as
// Airwallex specifies. It must run against the untouched raw body: re-encoding
// the parsed JSON would produce a different byte sequence and always fail.
func verifyAirwallexSignature(timestamp, rawBody, signature, secret string) bool {
	if secret == "" || timestamp == "" || signature == "" {
		return false
	}
	h := hmac.New(sha256.New, []byte(secret))
	h.Write([]byte(timestamp))
	h.Write([]byte(rawBody))
	expected := hex.EncodeToString(h.Sum(nil))
	return hmac.Equal([]byte(signature), []byte(expected))
}

type airwallexWebhookEvent struct {
	Name string `json:"name"`
	Data struct {
		Object struct {
			MerchantOrderId string `json:"merchant_order_id"`
			Id              string `json:"id"`
			Status          string `json:"status"`
		} `json:"object"`
	} `json:"data"`
}

// AirwallexWebhook credits a top-up once Airwallex reports
// payment_intent.succeeded. Every other event is acknowledged and ignored:
// acking prevents Airwallex from retrying a notification we deliberately
// don't act on.
func AirwallexWebhook(c *gin.Context) {
	if !isAirwallexWebhookEnabled() {
		logger.LogWarn(c.Request.Context(), fmt.Sprintf("空中云汇 webhook 被拒绝 reason=disabled client_ip=%s", c.ClientIP()))
		c.AbortWithStatus(http.StatusForbidden)
		return
	}

	bodyBytes, err := io.ReadAll(c.Request.Body)
	if err != nil {
		logger.LogError(c.Request.Context(), fmt.Sprintf("空中云汇 webhook 读取请求体失败 client_ip=%s error=%q", c.ClientIP(), err.Error()))
		c.AbortWithStatus(http.StatusBadRequest)
		return
	}

	timestamp := c.GetHeader(airwallexTimestampHd)
	signature := c.GetHeader(airwallexSignatureHd)
	if !verifyAirwallexSignature(timestamp, string(bodyBytes), signature, setting.AirwallexWebhookSecret) {
		logger.LogWarn(c.Request.Context(), fmt.Sprintf("空中云汇 webhook 验签失败 client_ip=%s", c.ClientIP()))
		c.AbortWithStatus(http.StatusUnauthorized)
		return
	}

	var event airwallexWebhookEvent
	if err := common.Unmarshal(bodyBytes, &event); err != nil {
		logger.LogError(c.Request.Context(), fmt.Sprintf("空中云汇 webhook 解析失败 client_ip=%s error=%q body=%q", c.ClientIP(), err.Error(), string(bodyBytes)))
		c.AbortWithStatus(http.StatusBadRequest)
		return
	}

	logger.LogInfo(c.Request.Context(), fmt.Sprintf("空中云汇 webhook 收到事件 name=%s intent_id=%s merchant_order_id=%s status=%s", event.Name, event.Data.Object.Id, event.Data.Object.MerchantOrderId, event.Data.Object.Status))

	if event.Name != "payment_intent.succeeded" {
		c.Status(http.StatusOK)
		return
	}

	referenceId := event.Data.Object.MerchantOrderId
	if referenceId == "" {
		logger.LogWarn(c.Request.Context(), fmt.Sprintf("空中云汇 webhook 缺少 merchant_order_id intent_id=%s", event.Data.Object.Id))
		c.AbortWithStatus(http.StatusBadRequest)
		return
	}

	LockOrder(referenceId)
	defer UnlockOrder(referenceId)

	if err := model.RechargeAirwallex(referenceId, c.ClientIP()); err != nil {
		logger.LogError(c.Request.Context(), fmt.Sprintf("空中云汇充值处理失败 trade_no=%s intent_id=%s client_ip=%s error=%q", referenceId, event.Data.Object.Id, c.ClientIP(), err.Error()))
		c.AbortWithStatus(http.StatusInternalServerError)
		return
	}

	logger.LogInfo(c.Request.Context(), fmt.Sprintf("空中云汇充值成功 trade_no=%s intent_id=%s client_ip=%s", referenceId, event.Data.Object.Id, c.ClientIP()))
	c.Status(http.StatusOK)
}

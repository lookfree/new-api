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
	"net/http"
	"net/http/httptest"
	"strconv"
	"sync"
	"testing"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/setting"
	"github.com/QuantumNous/new-api/setting/config"
	"github.com/QuantumNous/new-api/setting/operation_setting"
	"github.com/QuantumNous/new-api/setting/system_setting"
	"github.com/gin-gonic/gin"
	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

const (
	airwallexTestSecret  = "whsec_test"
	airwallexTestTradeNo = "AWX2NOabc123"
	airwallexTestAmount  = 10
)

type airwallexWebhookFixture struct {
	inviterID int
	userID    int
}

// setupAirwallexWebhookFixture builds an isolated database with an inviter, an
// invitee with a pending Airwallex top-up, and a fully configured, compliant
// Airwallex channel with the referral reward switched on. Every global it
// touches is restored on cleanup.
func setupAirwallexWebhookFixture(t *testing.T) airwallexWebhookFixture {
	t.Helper()

	previousDB := model.DB
	previousLogDB := model.LOG_DB
	previousType := common.MainDatabaseType()
	previousMemoryCache := common.MemoryCacheEnabled
	previousRedis := common.RedisEnabled
	previousAffiliate := config.GlobalConfig.ExportAllConfigs()
	previousEnabled := setting.AirwallexEnabled
	previousClientID := setting.AirwallexClientId
	previousAPIKey := setting.AirwallexApiKey
	previousSecret := setting.AirwallexWebhookSecret

	// The model package builds its per-dialect column names during InitDB;
	// queries such as the user-group lookup select them by name.
	initModelListColumnNames(t)

	database, err := gorm.Open(sqlite.Open("file:airwallex_webhook?mode=memory&cache=shared"), &gorm.Config{})
	require.NoError(t, err)
	require.NoError(t, database.AutoMigrate(&model.User{}, &model.TopUp{}, &model.AffReward{}, &model.Log{}))
	model.DB = database
	model.LOG_DB = database
	common.SetMainDatabaseType(common.DatabaseTypeSQLite)
	common.MemoryCacheEnabled = false
	common.RedisEnabled = false

	confirmPaymentComplianceForTest(t)
	setting.AirwallexEnabled = true
	setting.AirwallexClientId = "client_test"
	setting.AirwallexApiKey = "api_key_test"
	setting.AirwallexWebhookSecret = airwallexTestSecret
	require.NoError(t, config.GlobalConfig.LoadFromDB(map[string]string{
		"affiliate.enabled":          "true",
		"affiliate.rate":             "0.1",
		"affiliate.first_topup_only": "true",
		"affiliate.min_topup_quota":  "0",
	}))

	t.Cleanup(func() {
		require.NoError(t, config.GlobalConfig.LoadFromDB(previousAffiliate))
		setting.AirwallexEnabled = previousEnabled
		setting.AirwallexClientId = previousClientID
		setting.AirwallexApiKey = previousAPIKey
		setting.AirwallexWebhookSecret = previousSecret
		model.DB = previousDB
		model.LOG_DB = previousLogDB
		common.SetMainDatabaseType(previousType)
		common.MemoryCacheEnabled = previousMemoryCache
		common.RedisEnabled = previousRedis
		sqlDB, err := database.DB()
		if err == nil {
			_ = sqlDB.Close()
		}
	})

	inviter := &model.User{Username: "inviter", Password: "password123", AffCode: "INV1", Status: common.UserStatusEnabled}
	require.NoError(t, database.Create(inviter).Error)
	invitee := &model.User{Username: "invitee", Password: "password123", AffCode: "INV2", Status: common.UserStatusEnabled, InviterId: inviter.Id}
	require.NoError(t, database.Create(invitee).Error)

	return airwallexWebhookFixture{inviterID: inviter.Id, userID: invitee.Id}
}

func (f airwallexWebhookFixture) createPendingTopUp(t *testing.T, provider string) {
	t.Helper()
	require.NoError(t, model.DB.Create(&model.TopUp{
		UserId:          f.userID,
		Amount:          airwallexTestAmount,
		Money:           72.5,
		TradeNo:         airwallexTestTradeNo,
		PaymentMethod:   model.PaymentMethodAirwallex,
		PaymentProvider: provider,
		CreateTime:      common.GetTimestamp(),
		Status:          common.TopUpStatusPending,
	}).Error)
}

func (f airwallexWebhookFixture) user(t *testing.T, id int) *model.User {
	t.Helper()
	user := &model.User{}
	require.NoError(t, model.DB.First(user, id).Error)
	return user
}

func (f airwallexWebhookFixture) topUp(t *testing.T) *model.TopUp {
	t.Helper()
	topUp := &model.TopUp{}
	require.NoError(t, model.DB.Where("trade_no = ?", airwallexTestTradeNo).First(topUp).Error)
	return topUp
}

func (f airwallexWebhookFixture) rewardCount(t *testing.T) int64 {
	t.Helper()
	var count int64
	require.NoError(t, model.DB.Model(&model.AffReward{}).Count(&count).Error)
	return count
}

func airwallexEventBody(eventName string) string {
	return `{"name":"` + eventName + `","data":{"object":{"id":"int_123","status":"SUCCEEDED","merchant_order_id":"` + airwallexTestTradeNo + `"}}}`
}

func postAirwallexWebhook(body, timestamp, signature string) *httptest.ResponseRecorder {
	gin.SetMode(gin.TestMode)
	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Request = httptest.NewRequest(http.MethodPost, "/api/airwallex/webhook", bytes.NewBufferString(body))
	c.Request.Header.Set(airwallexTimestampHd, timestamp)
	c.Request.Header.Set(airwallexSignatureHd, signature)
	AirwallexWebhook(c)
	return recorder
}

func postSignedAirwallexWebhook(body string) *httptest.ResponseRecorder {
	const timestamp = "1357872222592"
	return postAirwallexWebhook(body, timestamp, signAirwallexForTest(timestamp, body, airwallexTestSecret))
}

func TestAirwallexWebhookCreditsTopUpOnceAndPaysInviterOnce(t *testing.T) {
	fixture := setupAirwallexWebhookFixture(t)
	fixture.createPendingTopUp(t, model.PaymentProviderAirwallex)
	body := airwallexEventBody("payment_intent.succeeded")
	expectedQuota := int(airwallexTestAmount * common.QuotaPerUnit)

	first := postSignedAirwallexWebhook(body)

	assert.Equal(t, http.StatusOK, first.Code)
	assert.Equal(t, expectedQuota, fixture.user(t, fixture.userID).Quota)
	assert.Equal(t, common.TopUpStatusSuccess, fixture.topUp(t).Status)
	assert.Equal(t, expectedQuota/10, fixture.user(t, fixture.inviterID).AffQuota)
	assert.EqualValues(t, 1, fixture.rewardCount(t))

	// Airwallex retries deliveries; a replay must be acknowledged without
	// crediting the customer or paying the inviter a second time.
	replay := postSignedAirwallexWebhook(body)

	assert.Equal(t, http.StatusOK, replay.Code)
	assert.Equal(t, expectedQuota, fixture.user(t, fixture.userID).Quota)
	assert.Equal(t, expectedQuota/10, fixture.user(t, fixture.inviterID).AffQuota)
	assert.EqualValues(t, 1, fixture.rewardCount(t))
}

func TestAirwallexWebhookRejectsUnsignedOrForgedEventsWithoutCrediting(t *testing.T) {
	cases := []struct {
		name      string
		signature func(timestamp, body string) string
	}{
		{"missing signature", func(_, _ string) string { return "" }},
		{"signature made with another secret", func(timestamp, body string) string {
			return signAirwallexForTest(timestamp, body, "whsec_attacker")
		}},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			fixture := setupAirwallexWebhookFixture(t)
			fixture.createPendingTopUp(t, model.PaymentProviderAirwallex)
			body := airwallexEventBody("payment_intent.succeeded")
			const timestamp = "1357872222592"

			recorder := postAirwallexWebhook(body, timestamp, tc.signature(timestamp, body))

			assert.Equal(t, http.StatusUnauthorized, recorder.Code)
			assert.Equal(t, 0, fixture.user(t, fixture.userID).Quota)
			assert.Equal(t, common.TopUpStatusPending, fixture.topUp(t).Status)
			assert.EqualValues(t, 0, fixture.rewardCount(t))
		})
	}
}

func TestAirwallexWebhookAcknowledgesButIgnoresOtherEvents(t *testing.T) {
	fixture := setupAirwallexWebhookFixture(t)
	fixture.createPendingTopUp(t, model.PaymentProviderAirwallex)

	recorder := postSignedAirwallexWebhook(airwallexEventBody("payment_intent.created"))

	assert.Equal(t, http.StatusOK, recorder.Code)
	assert.Equal(t, 0, fixture.user(t, fixture.userID).Quota)
	assert.Equal(t, common.TopUpStatusPending, fixture.topUp(t).Status)
}

func TestAirwallexWebhookDoesNotCreditAnotherProvidersOrder(t *testing.T) {
	fixture := setupAirwallexWebhookFixture(t)
	fixture.createPendingTopUp(t, model.PaymentProviderStripe)

	recorder := postSignedAirwallexWebhook(airwallexEventBody("payment_intent.succeeded"))

	assert.Equal(t, http.StatusInternalServerError, recorder.Code)
	assert.Equal(t, 0, fixture.user(t, fixture.userID).Quota)
	assert.Equal(t, common.TopUpStatusPending, fixture.topUp(t).Status)
}

func TestAirwallexChannelStaysClosedUntilComplianceIsConfirmedAndConfigured(t *testing.T) {
	fixture := setupAirwallexWebhookFixture(t)
	fixture.createPendingTopUp(t, model.PaymentProviderAirwallex)
	body := airwallexEventBody("payment_intent.succeeded")

	t.Run("compliance not confirmed", func(t *testing.T) {
		paymentSetting := operation_setting.GetPaymentSetting()
		paymentSetting.ComplianceConfirmed = false

		assert.False(t, isAirwallexTopUpEnabled())
		assert.Equal(t, http.StatusForbidden, postSignedAirwallexWebhook(body).Code)
	})

	t.Run("webhook secret missing", func(t *testing.T) {
		operation_setting.GetPaymentSetting().ComplianceConfirmed = true
		setting.AirwallexWebhookSecret = ""

		assert.False(t, isAirwallexTopUpEnabled())
		assert.Equal(t, http.StatusForbidden, postSignedAirwallexWebhook(body).Code)
	})

	assert.Equal(t, 0, fixture.user(t, fixture.userID).Quota)
	assert.Equal(t, common.TopUpStatusPending, fixture.topUp(t).Status)
}

// airwallexStub plays the Airwallex API: it issues a token, records the last
// PaymentIntent request it was sent and answers with a fixed intent.
type airwallexStub struct {
	mu            sync.Mutex
	intentCalls   int
	intentPayload map[string]any
	intentAuth    string
}

func startAirwallexStub(t *testing.T) *airwallexStub {
	t.Helper()
	stub := &airwallexStub{}
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		stub.mu.Lock()
		defer stub.mu.Unlock()
		switch r.URL.Path {
		case "/api/v1/authentication/login":
			_, _ = w.Write([]byte(`{"token":"tok-stub"}`))
		case "/api/v1/pa/payment_intents/create":
			stub.intentCalls++
			stub.intentAuth = r.Header.Get("Authorization")
			payload := map[string]any{}
			require.NoError(t, common.DecodeJson(r.Body, &payload))
			stub.intentPayload = payload
			w.WriteHeader(http.StatusCreated)
			_, _ = w.Write([]byte(`{"id":"int_stub","client_secret":"cs_stub"}`))
		default:
			http.NotFound(w, r)
		}
	}))
	previousBase := airwallexApiBase
	airwallexApiBase = server.URL
	t.Cleanup(func() {
		server.Close()
		airwallexApiBase = previousBase
		airwallexTokenMutex.Lock()
		defer airwallexTokenMutex.Unlock()
		airwallexToken = ""
		airwallexTokenUntil = time.Time{}
		airwallexTokenCredentials = ""
	})
	return stub
}

func requestAirwallexPay(t *testing.T, userID int, amount int64) map[string]any {
	t.Helper()
	gin.SetMode(gin.TestMode)
	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Request = httptest.NewRequest(http.MethodPost, "/api/user/airwallex/pay", bytes.NewBufferString(`{"amount":`+strconv.FormatInt(amount, 10)+`}`))
	c.Request.Header.Set("Content-Type", "application/json")
	c.Set("id", userID)

	RequestAirwallexPay(c)

	require.Equal(t, http.StatusOK, recorder.Code)
	response := map[string]any{}
	require.NoError(t, common.Unmarshal(recorder.Body.Bytes(), &response))
	return response
}

func setPriceForTest(t *testing.T, price float64) {
	t.Helper()
	previous := operation_setting.Price
	t.Cleanup(func() { operation_setting.Price = previous })
	operation_setting.Price = price
}

func TestRequestAirwallexPayCreatesPendingOrderAndIntentInCNY(t *testing.T) {
	fixture := setupAirwallexWebhookFixture(t)
	stub := startAirwallexStub(t)
	setPriceForTest(t, 7.3)
	previousAddress := system_setting.ServerAddress
	t.Cleanup(func() { system_setting.ServerAddress = previousAddress })
	system_setting.ServerAddress = "https://zetone.example/"

	response := requestAirwallexPay(t, fixture.userID, 10)

	assert.Equal(t, "success", response["message"])
	data, ok := response["data"].(map[string]any)
	require.True(t, ok, "data must be an object, got %v", response["data"])
	assert.Equal(t, "int_stub", data["intent_id"])
	assert.Equal(t, "cs_stub", data["client_secret"])
	assert.Equal(t, "CNY", data["currency"])

	topUp := &model.TopUp{}
	require.NoError(t, model.DB.Where("user_id = ?", fixture.userID).First(topUp).Error)
	assert.EqualValues(t, 10, topUp.Amount)
	assert.InDelta(t, 73.0, topUp.Money, 1e-9)
	assert.Equal(t, model.PaymentProviderAirwallex, topUp.PaymentProvider)
	assert.Equal(t, common.TopUpStatusPending, topUp.Status, "no quota may be granted before the webhook")
	assert.Equal(t, 0, fixture.user(t, fixture.userID).Quota)

	stub.mu.Lock()
	defer stub.mu.Unlock()
	require.Equal(t, 1, stub.intentCalls)
	assert.Equal(t, "Bearer tok-stub", stub.intentAuth)
	assert.Equal(t, "CNY", stub.intentPayload["currency"])
	assert.InDelta(t, 73.0, stub.intentPayload["amount"], 1e-9)
	assert.Equal(t, topUp.TradeNo, stub.intentPayload["merchant_order_id"], "the webhook finds the order by this id")
	assert.Equal(t, "https://zetone.example/wallet?airwallex=success", stub.intentPayload["return_url"])
	assert.NotEmpty(t, stub.intentPayload["request_id"])
}

func TestRequestAirwallexPayOmitsReturnURLUntilTheSiteIsServedOverHTTPS(t *testing.T) {
	fixture := setupAirwallexWebhookFixture(t)
	stub := startAirwallexStub(t)
	setPriceForTest(t, 7.3)
	previousAddress := system_setting.ServerAddress
	t.Cleanup(func() { system_setting.ServerAddress = previousAddress })
	system_setting.ServerAddress = "http://47.239.15.54:3300"

	response := requestAirwallexPay(t, fixture.userID, 10)

	assert.Equal(t, "success", response["message"])
	stub.mu.Lock()
	defer stub.mu.Unlock()
	require.Equal(t, 1, stub.intentCalls)
	assert.NotContains(t, stub.intentPayload, "return_url")
}

func TestRequestAirwallexPayRoundsTheChargeToWholeCents(t *testing.T) {
	fixture := setupAirwallexWebhookFixture(t)
	stub := startAirwallexStub(t)
	// 3 x 7.333 = 21.999, which Airwallex would reject as a CNY amount.
	setPriceForTest(t, 7.333)

	response := requestAirwallexPay(t, fixture.userID, 3)

	assert.Equal(t, "success", response["message"])
	topUp := &model.TopUp{}
	require.NoError(t, model.DB.Where("user_id = ?", fixture.userID).First(topUp).Error)
	assert.InDelta(t, 22.0, topUp.Money, 1e-9)
	stub.mu.Lock()
	defer stub.mu.Unlock()
	assert.InDelta(t, 22.0, stub.intentPayload["amount"], 1e-9)
}

func TestRequestAirwallexPayRefusesBelowMinimumAndWhileClosed(t *testing.T) {
	fixture := setupAirwallexWebhookFixture(t)
	stub := startAirwallexStub(t)
	setPriceForTest(t, 7.3)

	t.Run("amount below the minimum top-up", func(t *testing.T) {
		response := requestAirwallexPay(t, fixture.userID, 0)

		assert.Equal(t, "error", response["message"])
	})

	t.Run("channel closed until compliance is confirmed", func(t *testing.T) {
		operation_setting.GetPaymentSetting().ComplianceConfirmed = false

		response := requestAirwallexPay(t, fixture.userID, 10)

		assert.Equal(t, "error", response["message"])
	})

	var orders int64
	require.NoError(t, model.DB.Model(&model.TopUp{}).Count(&orders).Error)
	assert.EqualValues(t, 0, orders, "a refused request must not leave an order behind")
	stub.mu.Lock()
	defer stub.mu.Unlock()
	assert.Equal(t, 0, stub.intentCalls, "a refused request must not reach Airwallex")
}

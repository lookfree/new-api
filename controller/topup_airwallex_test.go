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
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"net/http"
	"net/http/httptest"
	"strconv"
	"sync"
	"testing"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/setting"
	"github.com/QuantumNous/new-api/setting/operation_setting"
	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// signAirwallexForTest mirrors Airwallex's documented construction
// (hex(HMAC-SHA256(timestamp + body, secret))) so the test checks the
// verifier against the published algorithm, not against itself.
func signAirwallexForTest(timestamp, body, secret string) string {
	h := hmac.New(sha256.New, []byte(secret))
	h.Write([]byte(timestamp + body))
	return hex.EncodeToString(h.Sum(nil))
}

func TestVerifyAirwallexSignature(t *testing.T) {
	const secret = "whsec_test"
	const timestamp = "1357872222592"
	const body = `{"name":"payment_intent.succeeded","data":{"object":{"merchant_order_id":"AWX1NOabc123"}}}`
	valid := signAirwallexForTest(timestamp, body, secret)

	cases := []struct {
		name      string
		timestamp string
		body      string
		signature string
		secret    string
		want      bool
	}{
		{"valid signature is accepted", timestamp, body, valid, secret, true},
		{"tampered body is rejected", timestamp, body + " ", valid, secret, false},
		{"tampered timestamp is rejected", "1357872222593", body, valid, secret, false},
		{"wrong secret is rejected", timestamp, body, valid, "whsec_other", false},
		{"empty secret is rejected even with a matching empty-key signature", timestamp, body, signAirwallexForTest(timestamp, body, ""), "", false},
		{"missing signature header is rejected", timestamp, body, "", secret, false},
		{"missing timestamp header is rejected", "", body, valid, secret, false},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got := verifyAirwallexSignature(tc.timestamp, tc.body, tc.signature, tc.secret)
			assert.Equal(t, tc.want, got)
		})
	}
}

type topUpInfoResponse struct {
	Success bool `json:"success"`
	Data    struct {
		EnableAirwallexTopUp bool                `json:"enable_airwallex_topup"`
		PayMethods           []map[string]string `json:"pay_methods"`
	} `json:"data"`
}

func fetchTopUpInfo(t *testing.T) topUpInfoResponse {
	t.Helper()
	gin.SetMode(gin.TestMode)
	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Request = httptest.NewRequest(http.MethodGet, "/api/user/topup/info", nil)

	GetTopUpInfo(c)

	require.Equal(t, http.StatusOK, recorder.Code)
	var response topUpInfoResponse
	require.NoError(t, common.Unmarshal(recorder.Body.Bytes(), &response))
	return response
}

func configureAirwallexForTest(t *testing.T, enabled bool) {
	t.Helper()
	previousEnabled := setting.AirwallexEnabled
	previousClientID := setting.AirwallexClientId
	previousAPIKey := setting.AirwallexApiKey
	previousSecret := setting.AirwallexWebhookSecret
	t.Cleanup(func() {
		setting.AirwallexEnabled = previousEnabled
		setting.AirwallexClientId = previousClientID
		setting.AirwallexApiKey = previousAPIKey
		setting.AirwallexWebhookSecret = previousSecret
	})
	setting.AirwallexEnabled = enabled
	setting.AirwallexClientId = "client_test"
	setting.AirwallexApiKey = "api_key_test"
	setting.AirwallexWebhookSecret = "whsec_test"
}

// The wallet page decides what to render from this response, so it is the
// contract between the gateway settings and the customer-facing top-up form.
func TestTopUpInfoOffersAirwallexAsOneMethodOnlyWhenTheChannelIsOpen(t *testing.T) {
	t.Run("open channel is advertised with the general minimum", func(t *testing.T) {
		confirmPaymentComplianceForTest(t)
		configureAirwallexForTest(t, true)

		info := fetchTopUpInfo(t)

		assert.True(t, info.Data.EnableAirwallexTopUp)
		var airwallexMethods []map[string]string
		for _, method := range info.Data.PayMethods {
			if method["type"] == model.PaymentMethodAirwallex {
				airwallexMethods = append(airwallexMethods, method)
			}
		}
		require.Len(t, airwallexMethods, 1)
		assert.Equal(t, "Airwallex", airwallexMethods[0]["name"])
		assert.Equal(t, strconv.Itoa(operation_setting.MinTopUp), airwallexMethods[0]["min_topup"])
	})

	t.Run("switched off in settings", func(t *testing.T) {
		confirmPaymentComplianceForTest(t)
		configureAirwallexForTest(t, false)

		info := fetchTopUpInfo(t)

		assert.False(t, info.Data.EnableAirwallexTopUp)
		for _, method := range info.Data.PayMethods {
			assert.NotEqual(t, model.PaymentMethodAirwallex, method["type"])
		}
	})

	t.Run("compliance declaration not yet confirmed", func(t *testing.T) {
		configureAirwallexForTest(t, true)

		info := fetchTopUpInfo(t)

		assert.False(t, info.Data.EnableAirwallexTopUp)
		assert.Empty(t, info.Data.PayMethods)
	})
}

// stubAirwallexLogin points the client at a local server that issues a new
// numbered token per login and records the credentials it was given.
func stubAirwallexLogin(t *testing.T) (logins *[]string) {
	t.Helper()
	var mu sync.Mutex
	var received []string
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		mu.Lock()
		defer mu.Unlock()
		received = append(received, r.Header.Get("x-client-id")+"/"+r.Header.Get("x-api-key"))
		_, _ = w.Write([]byte(`{"token":"tok-` + strconv.Itoa(len(received)) + `"}`))
	}))
	previousBase := airwallexApiBase
	airwallexApiBase = server.URL
	resetAirwallexTokenCache := func() {
		airwallexTokenMutex.Lock()
		defer airwallexTokenMutex.Unlock()
		airwallexToken = ""
		airwallexTokenUntil = time.Time{}
		airwallexTokenCredentials = ""
	}
	resetAirwallexTokenCache()
	t.Cleanup(func() {
		server.Close()
		airwallexApiBase = previousBase
		resetAirwallexTokenCache()
	})
	return &received
}

func TestAirwallexAccessTokenIsReusedUntilItExpiresOrCredentialsChange(t *testing.T) {
	logins := stubAirwallexLogin(t)
	configureAirwallexForTest(t, true)
	ctx := context.Background()

	first, err := getAirwallexAccessToken(ctx)
	require.NoError(t, err)
	again, err := getAirwallexAccessToken(ctx)
	require.NoError(t, err)

	assert.Equal(t, "tok-1", first)
	assert.Equal(t, first, again, "a fresh token is reused instead of logging in per request")
	assert.Equal(t, []string{"client_test/api_key_test"}, *logins)

	// Moving from a demo account to the live one must not keep issuing
	// PaymentIntents under the previous account's token.
	setting.AirwallexApiKey = "api_key_live"
	switched, err := getAirwallexAccessToken(ctx)
	require.NoError(t, err)

	assert.Equal(t, "tok-2", switched)
	assert.Equal(t, "client_test/api_key_live", (*logins)[1])

	airwallexTokenMutex.Lock()
	airwallexTokenUntil = time.Now().Add(-time.Second)
	airwallexTokenMutex.Unlock()
	renewed, err := getAirwallexAccessToken(ctx)
	require.NoError(t, err)

	assert.Equal(t, "tok-3", renewed, "an expired token is replaced")
}

func TestAirwallexAccessTokenRefusesToRunWithoutCredentials(t *testing.T) {
	logins := stubAirwallexLogin(t)
	configureAirwallexForTest(t, true)
	setting.AirwallexApiKey = ""

	_, err := getAirwallexAccessToken(context.Background())

	require.Error(t, err)
	assert.Empty(t, *logins, "no request may leave the server without credentials")
}

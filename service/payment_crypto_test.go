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
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/rsa"
	"crypto/x509"
	"encoding/base64"
	"encoding/pem"
	"strconv"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// testKeyPair generates a throwaway RSA pair and returns it as PEM, standing in
// for the merchant key and the platform public key.
func testKeyPair(t *testing.T) (privatePEM string, publicPEM string) {
	t.Helper()
	key, err := rsa.GenerateKey(rand.Reader, 2048)
	require.NoError(t, err)

	privatePEM = string(pem.EncodeToMemory(&pem.Block{
		Type:  "RSA PRIVATE KEY",
		Bytes: x509.MarshalPKCS1PrivateKey(key),
	}))
	publicDER, err := x509.MarshalPKIXPublicKey(&key.PublicKey)
	require.NoError(t, err)
	publicPEM = string(pem.EncodeToMemory(&pem.Block{
		Type:  "PUBLIC KEY",
		Bytes: publicDER,
	}))
	return privatePEM, publicPEM
}

func TestAlipaySignSource(t *testing.T) {
	t.Run("sorts keys and joins them as k=v", func(t *testing.T) {
		source := AlipaySignSource(map[string]string{
			"charset": "utf-8", "app_id": "2021", "method": "alipay.trade.page.pay",
		})

		assert.Equal(t, "app_id=2021&charset=utf-8&method=alipay.trade.page.pay", source)
	})

	t.Run("excludes the signature fields", func(t *testing.T) {
		source := AlipaySignSource(map[string]string{
			"app_id": "2021", "sign": "abc", "sign_type": "RSA2",
		})

		assert.Equal(t, "app_id=2021", source)
	})

	t.Run("excludes empty values", func(t *testing.T) {
		source := AlipaySignSource(map[string]string{
			"app_id": "2021", "return_url": "",
		})

		assert.Equal(t, "app_id=2021", source)
	})

	t.Run("does not escape values", func(t *testing.T) {
		// Alipay signs the raw values; escaping here would make every
		// callback with a URL or JSON body fail to verify.
		source := AlipaySignSource(map[string]string{
			"notify_url": "https://a.example/api/x?y=1",
		})

		assert.Equal(t, "notify_url=https://a.example/api/x?y=1", source)
	})

	t.Run("is empty when nothing is signable", func(t *testing.T) {
		assert.Equal(t, "", AlipaySignSource(map[string]string{"sign": "abc"}))
	})
}

func TestAlipaySignAndVerify(t *testing.T) {
	privatePEM, publicPEM := testKeyPair(t)
	params := map[string]string{
		"app_id":       "2021000000000000",
		"out_trade_no": "USR1NO abc",
		"total_amount": "100.00",
		"trade_status": "TRADE_SUCCESS",
	}

	t.Run("a signature made with the merchant key verifies", func(t *testing.T) {
		signature, err := SignAlipayParams(params, privatePEM)
		require.NoError(t, err)

		signed := map[string]string{"sign": signature, "sign_type": "RSA2"}
		for k, v := range params {
			signed[k] = v
		}

		assert.NoError(t, VerifyAlipayCallback(signed, publicPEM))
	})

	t.Run("a tampered amount fails verification", func(t *testing.T) {
		// The attack this blocks: pay one yuan, rewrite the callback to say
		// one hundred, and keep the original signature.
		signature, err := SignAlipayParams(params, privatePEM)
		require.NoError(t, err)

		tampered := map[string]string{"sign": signature, "sign_type": "RSA2"}
		for k, v := range params {
			tampered[k] = v
		}
		tampered["total_amount"] = "10000.00"

		assert.Error(t, VerifyAlipayCallback(tampered, publicPEM))
	})

	t.Run("a signature from another key fails verification", func(t *testing.T) {
		otherPrivate, _ := testKeyPair(t)
		signature, err := SignAlipayParams(params, otherPrivate)
		require.NoError(t, err)

		forged := map[string]string{"sign": signature, "sign_type": "RSA2"}
		for k, v := range params {
			forged[k] = v
		}

		assert.Error(t, VerifyAlipayCallback(forged, publicPEM))
	})

	t.Run("a missing signature is rejected", func(t *testing.T) {
		assert.Error(t, VerifyAlipayCallback(params, publicPEM))
	})

	t.Run("a non-base64 signature is rejected", func(t *testing.T) {
		assert.Error(t, VerifyAlipayCallback(
			map[string]string{"app_id": "2021", "sign": "!!!not base64!!!"}, publicPEM))
	})

	t.Run("an unparseable public key is rejected", func(t *testing.T) {
		signature, err := SignAlipayParams(params, privatePEM)
		require.NoError(t, err)

		signed := map[string]string{"sign": signature}
		for k, v := range params {
			signed[k] = v
		}

		assert.Error(t, VerifyAlipayCallback(signed, "not a key"))
	})
}

func TestNormalizePEMAcceptsBareKeys(t *testing.T) {
	privatePEM, _ := testKeyPair(t)

	t.Run("an already-armoured key is unchanged in meaning", func(t *testing.T) {
		_, err := parseRSAPrivateKey(privatePEM)

		assert.NoError(t, err)
	})

	t.Run("a key pasted without PEM headers still parses", func(t *testing.T) {
		// Alipay's console shows the key as a bare base64 blob, and operators
		// paste exactly that. Failing here would look like a wrong credential.
		block, _ := pem.Decode([]byte(privatePEM))
		require.NotNil(t, block)
		bare := base64.StdEncoding.EncodeToString(block.Bytes)

		_, err := parseRSAPrivateKey(bare)

		assert.NoError(t, err)
	})

	t.Run("garbage is rejected rather than silently accepted", func(t *testing.T) {
		_, err := parseRSAPrivateKey("obviously not a key")

		assert.Error(t, err)
	})
}

func TestWechatSignSources(t *testing.T) {
	t.Run("request source is five newline-terminated lines", func(t *testing.T) {
		source := WechatRequestSignSource("POST", "/v3/pay", "1700000000", "abc", `{"a":1}`)

		assert.Equal(t, "POST\n/v3/pay\n1700000000\nabc\n{\"a\":1}\n", source)
	})

	t.Run("callback source is three newline-terminated lines", func(t *testing.T) {
		source := WechatCallbackSignSource("1700000000", "abc", `{"a":1}`)

		assert.Equal(t, "1700000000\nabc\n{\"a\":1}\n", source)
	})

	t.Run("an empty body still ends with a newline", func(t *testing.T) {
		// The trailing newline is required even for GET requests with no body;
		// omitting it makes every signature wrong.
		source := WechatRequestSignSource("GET", "/v3/x", "1700000000", "abc", "")

		assert.Equal(t, "GET\n/v3/x\n1700000000\nabc\n\n", source)
	})
}

func TestVerifyWechatCallback(t *testing.T) {
	privatePEM, publicPEM := testKeyPair(t)
	now := time.Unix(1_700_000_000, 0)
	timestamp := strconv.FormatInt(now.Unix(), 10)
	nonce := "nonce123"
	body := `{"id":"evt_1","event_type":"TRANSACTION.SUCCESS"}`

	sign := func(ts string) string {
		signature, err := signWechatMessage(
			WechatCallbackSignSource(ts, nonce, body), privatePEM,
		)
		require.NoError(t, err)
		return signature
	}

	t.Run("a valid callback passes", func(t *testing.T) {
		err := VerifyWechatCallback(timestamp, nonce, body, sign(timestamp), publicKeyOf(publicPEM), now)

		assert.NoError(t, err)
	})

	t.Run("a tampered body fails", func(t *testing.T) {
		err := VerifyWechatCallback(
			timestamp, nonce, `{"id":"evt_2"}`, sign(timestamp), publicKeyOf(publicPEM), now)

		assert.Error(t, err)
	})

	t.Run("a stale callback is rejected as a replay", func(t *testing.T) {
		old := strconv.FormatInt(now.Add(-10*time.Minute).Unix(), 10)

		err := VerifyWechatCallback(old, nonce, body, sign(old), publicKeyOf(publicPEM), now)

		assert.Error(t, err)
	})

	t.Run("a timestamp far in the future is rejected", func(t *testing.T) {
		future := strconv.FormatInt(now.Add(10*time.Minute).Unix(), 10)

		err := VerifyWechatCallback(future, nonce, body, sign(future), publicKeyOf(publicPEM), now)

		assert.Error(t, err)
	})

	t.Run("a callback just inside the window is accepted", func(t *testing.T) {
		recent := strconv.FormatInt(now.Add(-4*time.Minute).Unix(), 10)

		err := VerifyWechatCallback(recent, nonce, body, sign(recent), publicKeyOf(publicPEM), now)

		assert.NoError(t, err)
	})

	t.Run("missing headers are rejected", func(t *testing.T) {
		assert.Error(t, VerifyWechatCallback("", nonce, body, "sig", publicKeyOf(publicPEM), now))
		assert.Error(t, VerifyWechatCallback(timestamp, "", body, "sig", publicKeyOf(publicPEM), now))
		assert.Error(t, VerifyWechatCallback(timestamp, nonce, body, "", publicKeyOf(publicPEM), now))
	})

	t.Run("a non-numeric timestamp is rejected", func(t *testing.T) {
		err := VerifyWechatCallback("not-a-time", nonce, body, sign(timestamp), publicKeyOf(publicPEM), now)

		assert.Error(t, err)
	})
}

// publicKeyOf exists so the tests read as "verify against WeChat's public key"
// rather than threading a PEM string through every call.
func publicKeyOf(pemText string) string { return pemText }

func TestDecryptWechatResource(t *testing.T) {
	const key = "12345678901234567890123456789012" // 32 chars, as WeChat requires
	nonce := "abcdefghijkl"                        // GCM standard nonce size
	associated := "transaction"
	plaintext := `{"out_trade_no":"USR1NO1","trade_state":"SUCCESS"}`

	encrypt := func(k, n, ad, text string) string {
		block, err := aes.NewCipher([]byte(k))
		require.NoError(t, err)
		gcm, err := cipher.NewGCM(block)
		require.NoError(t, err)
		return base64.StdEncoding.EncodeToString(
			gcm.Seal(nil, []byte(n), []byte(text), []byte(ad)))
	}

	t.Run("round-trips the payload", func(t *testing.T) {
		decrypted, err := DecryptWechatResource(
			encrypt(key, nonce, associated, plaintext), nonce, associated, key)

		require.NoError(t, err)
		assert.JSONEq(t, plaintext, string(decrypted))
	})

	t.Run("a wrong APIv3 key fails rather than returning garbage", func(t *testing.T) {
		_, err := DecryptWechatResource(
			encrypt(key, nonce, associated, plaintext), nonce, associated,
			"99999999999999999999999999999999")

		assert.Error(t, err)
	})

	t.Run("tampered associated data fails authentication", func(t *testing.T) {
		_, err := DecryptWechatResource(
			encrypt(key, nonce, associated, plaintext), nonce, "refund", key)

		assert.Error(t, err)
	})

	t.Run("a key of the wrong length is rejected up front", func(t *testing.T) {
		_, err := DecryptWechatResource("", nonce, associated, "too-short")

		assert.Error(t, err)
	})

	t.Run("a nonce of the wrong length is rejected", func(t *testing.T) {
		_, err := DecryptWechatResource(
			encrypt(key, nonce, associated, plaintext), "short", associated, key)

		assert.Error(t, err)
	})

	t.Run("non-base64 ciphertext is rejected", func(t *testing.T) {
		_, err := DecryptWechatResource("!!!", nonce, associated, key)

		assert.Error(t, err)
	})
}

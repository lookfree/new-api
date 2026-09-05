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
	"bytes"
	"crypto"
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/rsa"
	"crypto/sha256"
	"encoding/base64"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/setting/system_setting"
	"github.com/google/uuid"
)

// WeChat Pay APIv3, Native (QR code) product, in public-key mode.
//
// Requests are signed with the merchant private key; callbacks are verified
// against WeChat's public key and their business payload is encrypted with the
// APIv3 key. All three steps are mandatory before any money moves.

// wechatCallbackMaxSkew bounds how old a callback may be. WeChat signs a
// timestamp, so rejecting stale ones is what stops a captured callback from
// being replayed later.
const wechatCallbackMaxSkew = 5 * time.Minute

// WechatNativeOrder describes one QR payment to create.
type WechatNativeOrder struct {
	OutTradeNo string
	// TotalFen is the payable amount in cents, WeChat's only unit.
	TotalFen  int64
	Subject   string
	NotifyURL string
}

// CreateWechatNativeOrder places the order and returns the code_url that the
// frontend renders as a QR code.
func CreateWechatNativeOrder(order WechatNativeOrder) (string, error) {
	settings := system_setting.GetWechatPaySettings()
	if settings.MchId == "" || settings.PrivateKey == "" {
		return "", errors.New("wechat pay is not configured")
	}
	if order.TotalFen <= 0 {
		return "", errors.New("wechat pay amount must be positive")
	}

	body, err := common.Marshal(map[string]any{
		"appid":        settings.AppId,
		"mchid":        settings.MchId,
		"description":  order.Subject,
		"out_trade_no": order.OutTradeNo,
		"notify_url":   order.NotifyURL,
		"amount": map[string]any{
			"total":    order.TotalFen,
			"currency": "CNY",
		},
	})
	if err != nil {
		return "", err
	}

	const path = "/v3/pay/transactions/native"
	authorization, err := buildWechatAuthorization(
		http.MethodPost, path, string(body), settings,
	)
	if err != nil {
		return "", err
	}

	req, err := http.NewRequest(
		http.MethodPost, system_setting.WechatPayNativeEndpoint, bytes.NewReader(body),
	)
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Authorization", authorization)

	client := &http.Client{Timeout: 15 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("wechat pay request failed: %w", err)
	}
	defer resp.Body.Close()

	raw, err := io.ReadAll(io.LimitReader(resp.Body, 64*1024))
	if err != nil {
		return "", fmt.Errorf("wechat pay response unreadable: %w", err)
	}
	if resp.StatusCode != http.StatusOK {
		var apiErr struct {
			Code    string `json:"code"`
			Message string `json:"message"`
		}
		_ = common.Unmarshal(raw, &apiErr)
		return "", fmt.Errorf("wechat pay rejected the order: %s (%s)",
			apiErr.Message, apiErr.Code)
	}

	var result struct {
		CodeURL string `json:"code_url"`
	}
	if err := common.Unmarshal(raw, &result); err != nil {
		return "", fmt.Errorf("wechat pay response malformed: %w", err)
	}
	if result.CodeURL == "" {
		return "", errors.New("wechat pay returned no code_url")
	}
	return result.CodeURL, nil
}

// buildWechatAuthorization produces the WECHATPAY2-SHA256-RSA2048 header.
//
// The signed material is method, path, timestamp, nonce and body, each on its
// own line and each terminated by a newline, including the last.
func buildWechatAuthorization(
	method string,
	path string,
	body string,
	settings system_setting.WechatPaySettings,
) (string, error) {
	timestamp := strconv.FormatInt(time.Now().Unix(), 10)
	nonce := strings.ReplaceAll(uuid.New().String(), "-", "")

	signature, err := signWechatMessage(
		WechatRequestSignSource(method, path, timestamp, nonce, body),
		settings.PrivateKey,
	)
	if err != nil {
		return "", err
	}

	return fmt.Sprintf(
		`WECHATPAY2-SHA256-RSA2048 mchid="%s",nonce_str="%s",timestamp="%s",serial_no="%s",signature="%s"`,
		settings.MchId, nonce, timestamp, settings.SerialNo, signature,
	), nil
}

// WechatRequestSignSource builds the string signed for an outgoing request.
// Exported so tests can pin the exact layout, which is easy to get subtly
// wrong and fails only at runtime against the real gateway.
func WechatRequestSignSource(method, path, timestamp, nonce, body string) string {
	return method + "\n" + path + "\n" + timestamp + "\n" + nonce + "\n" + body + "\n"
}

// WechatCallbackSignSource builds the string WeChat signs for a callback.
func WechatCallbackSignSource(timestamp, nonce, body string) string {
	return timestamp + "\n" + nonce + "\n" + body + "\n"
}

func signWechatMessage(message string, privateKeyPEM string) (string, error) {
	key, err := parseRSAPrivateKey(privateKeyPEM)
	if err != nil {
		return "", err
	}
	digest := sha256.Sum256([]byte(message))
	signature, err := rsa.SignPKCS1v15(rand.Reader, key, crypto.SHA256, digest[:])
	if err != nil {
		return "", err
	}
	return base64.StdEncoding.EncodeToString(signature), nil
}

// VerifyWechatCallback authenticates a callback before any of its content is
// read.
//
// Returns an error for a bad signature and, just as importantly, for a stale
// timestamp: without that check a callback captured once could be replayed to
// credit an account repeatedly.
func VerifyWechatCallback(
	timestamp string,
	nonce string,
	body string,
	signature string,
	publicKeyPEM string,
	now time.Time,
) error {
	if timestamp == "" || nonce == "" || signature == "" {
		return errors.New("wechat callback is missing signature headers")
	}

	seconds, err := strconv.ParseInt(timestamp, 10, 64)
	if err != nil {
		return fmt.Errorf("wechat callback timestamp is not a number: %w", err)
	}
	skew := now.Sub(time.Unix(seconds, 0))
	if skew < 0 {
		skew = -skew
	}
	if skew > wechatCallbackMaxSkew {
		return errors.New("wechat callback timestamp is outside the accepted window")
	}

	raw, err := base64.StdEncoding.DecodeString(signature)
	if err != nil {
		return fmt.Errorf("wechat signature is not base64: %w", err)
	}
	key, err := parseRSAPublicKey(publicKeyPEM)
	if err != nil {
		return err
	}
	digest := sha256.Sum256([]byte(WechatCallbackSignSource(timestamp, nonce, body)))
	if err := rsa.VerifyPKCS1v15(key, crypto.SHA256, digest[:], raw); err != nil {
		return fmt.Errorf("wechat signature verification failed: %w", err)
	}
	return nil
}

// DecryptWechatResource decrypts a callback's business payload.
//
// WeChat encrypts it with AES-256-GCM keyed by the APIv3 key, using the
// associated data and nonce carried alongside the ciphertext.
func DecryptWechatResource(
	ciphertextB64 string,
	nonce string,
	associatedData string,
	apiV3Key string,
) ([]byte, error) {
	if len(apiV3Key) != 32 {
		return nil, errors.New("wechat APIv3 key must be exactly 32 characters")
	}
	ciphertext, err := base64.StdEncoding.DecodeString(ciphertextB64)
	if err != nil {
		return nil, fmt.Errorf("wechat ciphertext is not base64: %w", err)
	}

	block, err := aes.NewCipher([]byte(apiV3Key))
	if err != nil {
		return nil, err
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}
	if len(nonce) != gcm.NonceSize() {
		return nil, errors.New("wechat nonce has the wrong length")
	}

	plaintext, err := gcm.Open(nil, []byte(nonce), ciphertext, []byte(associatedData))
	if err != nil {
		return nil, fmt.Errorf("wechat payload could not be decrypted: %w", err)
	}
	return plaintext, nil
}

// WechatTransaction is the decrypted callback payload, narrowed to the fields
// that decide whether to credit an account.
type WechatTransaction struct {
	AppId         string `json:"appid"`
	MchId         string `json:"mchid"`
	OutTradeNo    string `json:"out_trade_no"`
	TransactionId string `json:"transaction_id"`
	TradeState    string `json:"trade_state"`
	Amount        struct {
		Total    int64  `json:"total"`
		Currency string `json:"currency"`
	} `json:"amount"`
}

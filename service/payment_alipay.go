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
	"crypto"
	"crypto/rand"
	"crypto/rsa"
	"crypto/sha256"
	"crypto/x509"
	"encoding/base64"
	"encoding/pem"
	"errors"
	"fmt"
	"net/url"
	"sort"
	"strings"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/setting/system_setting"
)

// Alipay's PC web payment product. The merchant does not call the gateway to
// create an order; it builds a signed URL and redirects the browser to
// Alipay's own checkout. That is the documented flow for this product and
// saves a server round trip.

const alipayTradePagePayMethod = "alipay.trade.page.pay"

// AlipayPageOrder describes one checkout redirect.
type AlipayPageOrder struct {
	// OutTradeNo is our own order number, echoed back in the callback.
	OutTradeNo string
	// TotalAmount is the payable amount in yuan, formatted with two decimals.
	TotalAmount string
	Subject     string
	NotifyURL   string
	ReturnURL   string
}

// BuildAlipayPagePayURL returns the URL to redirect the payer to.
func BuildAlipayPagePayURL(order AlipayPageOrder) (string, error) {
	settings := system_setting.GetAlipaySettings()
	if settings.AppId == "" || settings.PrivateKey == "" {
		return "", errors.New("alipay is not configured")
	}

	bizContent, err := common.Marshal(map[string]string{
		"out_trade_no": order.OutTradeNo,
		"total_amount": order.TotalAmount,
		"subject":      order.Subject,
		"product_code": "FAST_INSTANT_TRADE_PAY",
	})
	if err != nil {
		return "", err
	}

	params := map[string]string{
		"app_id":      settings.AppId,
		"method":      alipayTradePagePayMethod,
		"format":      "JSON",
		"charset":     "utf-8",
		"sign_type":   "RSA2",
		"timestamp":   time.Now().Format("2006-01-02 15:04:05"),
		"version":     "1.0",
		"notify_url":  order.NotifyURL,
		"return_url":  order.ReturnURL,
		"biz_content": string(bizContent),
	}

	signature, err := SignAlipayParams(params, settings.PrivateKey)
	if err != nil {
		return "", err
	}
	params["sign"] = signature

	query := url.Values{}
	for key, value := range params {
		query.Set(key, value)
	}
	return system_setting.AlipayGateway() + "?" + query.Encode(), nil
}

// AlipaySignSource builds the string Alipay signs and verifies: every non-empty
// parameter except the signature fields, sorted by key, joined as k=v pairs
// with no URL escaping.
//
// Exported for tests, because getting this string wrong is the most common way
// an Alipay integration silently fails to verify callbacks.
func AlipaySignSource(params map[string]string) string {
	keys := make([]string, 0, len(params))
	for key, value := range params {
		if key == "sign" || key == "sign_type" || value == "" {
			continue
		}
		keys = append(keys, key)
	}
	sort.Strings(keys)

	var builder strings.Builder
	for i, key := range keys {
		if i > 0 {
			builder.WriteString("&")
		}
		builder.WriteString(key)
		builder.WriteString("=")
		builder.WriteString(params[key])
	}
	return builder.String()
}

// SignAlipayParams signs with the merchant private key using SHA256withRSA.
func SignAlipayParams(params map[string]string, privateKeyPEM string) (string, error) {
	key, err := parseRSAPrivateKey(privateKeyPEM)
	if err != nil {
		return "", err
	}
	digest := sha256.Sum256([]byte(AlipaySignSource(params)))
	signature, err := rsa.SignPKCS1v15(rand.Reader, key, crypto.SHA256, digest[:])
	if err != nil {
		return "", err
	}
	return base64.StdEncoding.EncodeToString(signature), nil
}

// VerifyAlipayCallback checks that a callback really came from Alipay.
//
// The callback endpoint is public, so nothing in the payload may be trusted
// before this returns nil. Callers must not read the amount, the order number
// or anything else from an unverified callback.
func VerifyAlipayCallback(params map[string]string, publicKeyPEM string) error {
	signature := params["sign"]
	if signature == "" {
		return errors.New("alipay callback has no signature")
	}
	raw, err := base64.StdEncoding.DecodeString(signature)
	if err != nil {
		return fmt.Errorf("alipay signature is not base64: %w", err)
	}

	key, err := parseRSAPublicKey(publicKeyPEM)
	if err != nil {
		return err
	}
	digest := sha256.Sum256([]byte(AlipaySignSource(params)))
	if err := rsa.VerifyPKCS1v15(key, crypto.SHA256, digest[:], raw); err != nil {
		return fmt.Errorf("alipay signature verification failed: %w", err)
	}
	return nil
}

// parseRSAPrivateKey accepts both PKCS#1 and PKCS#8 PEM, and tolerates a key
// pasted without its PEM header, which is how Alipay's own console presents
// it.
func parseRSAPrivateKey(keyPEM string) (*rsa.PrivateKey, error) {
	block, _ := pem.Decode([]byte(normalizePEM(keyPEM, "RSA PRIVATE KEY")))
	if block == nil {
		return nil, errors.New("private key is not valid PEM")
	}
	if key, err := x509.ParsePKCS1PrivateKey(block.Bytes); err == nil {
		return key, nil
	}
	parsed, err := x509.ParsePKCS8PrivateKey(block.Bytes)
	if err != nil {
		return nil, fmt.Errorf("private key is neither PKCS#1 nor PKCS#8: %w", err)
	}
	key, ok := parsed.(*rsa.PrivateKey)
	if !ok {
		return nil, errors.New("private key is not an RSA key")
	}
	return key, nil
}

func parseRSAPublicKey(keyPEM string) (*rsa.PublicKey, error) {
	block, _ := pem.Decode([]byte(normalizePEM(keyPEM, "PUBLIC KEY")))
	if block == nil {
		return nil, errors.New("public key is not valid PEM")
	}
	parsed, err := x509.ParsePKIXPublicKey(block.Bytes)
	if err != nil {
		// Some consoles hand out a PKCS#1 public key instead.
		if key, pkcs1Err := x509.ParsePKCS1PublicKey(block.Bytes); pkcs1Err == nil {
			return key, nil
		}
		return nil, fmt.Errorf("public key is not parseable: %w", err)
	}
	key, ok := parsed.(*rsa.PublicKey)
	if !ok {
		return nil, errors.New("public key is not an RSA key")
	}
	return key, nil
}

// normalizePEM wraps a bare base64 key body in PEM armour. Operators routinely
// paste the key without headers because that is how the console shows it, and
// failing on that would look like a credential problem rather than a format
// one.
func normalizePEM(key string, label string) string {
	trimmed := strings.TrimSpace(key)
	if strings.HasPrefix(trimmed, "-----BEGIN") {
		return trimmed
	}
	body := strings.NewReplacer(" ", "", "\n", "", "\r", "", "\t", "").Replace(trimmed)
	if body == "" {
		return ""
	}
	var builder strings.Builder
	builder.WriteString("-----BEGIN " + label + "-----\n")
	for start := 0; start < len(body); start += 64 {
		end := start + 64
		if end > len(body) {
			end = len(body)
		}
		builder.WriteString(body[start:end])
		builder.WriteString("\n")
	}
	builder.WriteString("-----END " + label + "-----\n")
	return builder.String()
}

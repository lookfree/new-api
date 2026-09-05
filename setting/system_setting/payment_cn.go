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

package system_setting

import (
	"sync"

	"github.com/QuantumNous/new-api/setting/config"
)

// Gateway endpoints. Alipay's sandbox is a separate host; WeChat has no
// sandbox for Native pay, so it has a single endpoint.
const (
	AlipayGatewayProduction = "https://openapi.alipay.com/gateway.do"
	AlipayGatewaySandbox    = "https://openapi-sandbox.dl.alipaydev.com/gateway.do"
	WechatPayNativeEndpoint = "https://api.mch.weixin.qq.com/v3/pay/transactions/native"
)

// AlipaySettings holds the credentials for Alipay's PC web payment product.
//
// Keys are stored rather than read from files so an operator can rotate them
// from the admin UI without redeploying. They are never echoed back to any
// client; only the enabled flag is public.
type AlipaySettings struct {
	Enabled bool   `json:"enabled"`
	AppId   string `json:"app_id"`
	// PrivateKey is the merchant application private key, PEM encoded.
	PrivateKey string `json:"private_key"`
	// PublicKey is Alipay's public key, used to verify their callbacks.
	PublicKey string `json:"public_key"`
	// Sandbox switches to Alipay's sandbox gateway, which is what makes this
	// integration testable before the merchant account is approved.
	Sandbox bool `json:"sandbox"`
}

// WechatPaySettings holds the credentials for WeChat Pay's Native (QR) product
// on the APIv3 protocol, in public-key mode.
//
// Public-key mode is deliberate: the alternative, platform-certificate mode,
// requires downloading and rotating WeChat's certificates, which is the single
// most error-prone part of that protocol. Public-key mode replaces it with one
// value pasted from the merchant console.
type WechatPaySettings struct {
	Enabled bool   `json:"enabled"`
	MchId   string `json:"mch_id"`
	AppId   string `json:"app_id"`
	// ApiV3Key decrypts the callback payload (AES-256-GCM).
	ApiV3Key string `json:"api_v3_key"`
	// SerialNo is the merchant certificate serial number, sent with every
	// signed request so WeChat knows which key signed it.
	SerialNo string `json:"serial_no"`
	// PrivateKey is the merchant private key, PEM encoded, used to sign
	// outgoing requests.
	PrivateKey string `json:"private_key"`
	// PublicKey and PublicKeyId identify WeChat's public key, used to verify
	// their callbacks.
	PublicKey   string `json:"public_key"`
	PublicKeyId string `json:"public_key_id"`
}

var (
	alipaySettings    = AlipaySettings{}
	wechatPaySettings = WechatPaySettings{}

	cnPaymentMutex sync.RWMutex
)

func init() {
	config.GlobalConfig.Register("alipay", &alipaySettings)
	config.GlobalConfig.Register("wechatpay", &wechatPaySettings)
}

// GetAlipaySettings returns a copy so callers cannot mutate shared state.
func GetAlipaySettings() AlipaySettings {
	cnPaymentMutex.RLock()
	defer cnPaymentMutex.RUnlock()
	return alipaySettings
}

// GetWechatPaySettings returns a copy so callers cannot mutate shared state.
func GetWechatPaySettings() WechatPaySettings {
	cnPaymentMutex.RLock()
	defer cnPaymentMutex.RUnlock()
	return wechatPaySettings
}

// AlipayGateway resolves the endpoint for the configured environment.
func AlipayGateway() string {
	if GetAlipaySettings().Sandbox {
		return AlipayGatewaySandbox
	}
	return AlipayGatewayProduction
}

// AlipayReady reports whether Alipay payments can actually be initiated.
// Every credential is required: a half-configured gateway that accepts orders
// it cannot settle is worse than one that is plainly off.
func AlipayReady() bool {
	s := GetAlipaySettings()
	return s.Enabled && s.AppId != "" && s.PrivateKey != "" && s.PublicKey != ""
}

// WechatPayReady reports whether WeChat payments can actually be initiated.
func WechatPayReady() bool {
	s := GetWechatPaySettings()
	return s.Enabled && s.MchId != "" && s.AppId != "" && s.ApiV3Key != "" &&
		s.SerialNo != "" && s.PrivateKey != "" && s.PublicKey != ""
}

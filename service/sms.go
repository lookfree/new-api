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
	"crypto/hmac"
	"crypto/sha1"
	"encoding/base64"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"sort"
	"strings"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/setting/system_setting"
	"github.com/google/uuid"
)

// SendSMSVerificationCode delivers a verification code to a phone number using
// the configured provider.
//
// The `log` provider writes the code to the server log instead of sending it,
// which is what lets the whole phone sign-in flow be exercised before an SMS
// account exists. Any other provider must be fully configured; SMSReady is the
// gate callers use before reaching this function.
func SendSMSVerificationCode(phone string, code string) error {
	settings := system_setting.GetSMSSettings()

	if settings.Provider == system_setting.SMSProviderAliyun {
		return sendAliyunSMS(settings, phone, code)
	}

	common.SysLog(fmt.Sprintf(
		"[sms:log] verification code for %s is %s (no SMS provider configured, code not sent)",
		maskPhone(phone), code,
	))
	return nil
}

// maskPhone keeps a number identifiable in logs without writing it in full,
// showing the first three and last four digits as Chinese services do.
func maskPhone(phone string) string {
	if len(phone) < 7 {
		return "****"
	}
	return phone[:3] + "****" + phone[len(phone)-4:]
}

// sendAliyunSMS calls Dysmsapi over its RPC-style signed GET interface.
//
// The request is signed rather than routed through the vendor SDK so the
// dependency footprint stays unchanged; the signature algorithm below is
// Aliyun's documented RPC signing scheme.
func sendAliyunSMS(
	settings system_setting.SMSSettings,
	phone string,
	code string,
) error {
	params := map[string]string{
		"AccessKeyId":      settings.AccessKeyId,
		"Action":           "SendSms",
		"Format":           "JSON",
		"PhoneNumbers":     phone,
		"RegionId":         settings.Region,
		"SignName":         settings.SignName,
		"SignatureMethod":  "HMAC-SHA1",
		"SignatureNonce":   uuid.New().String(),
		"SignatureVersion": "1.0",
		"TemplateCode":     settings.TemplateCode,
		"TemplateParam":    fmt.Sprintf(`{"code":"%s"}`, code),
		"Timestamp":        time.Now().UTC().Format("2006-01-02T15:04:05Z"),
		"Version":          "2017-05-25",
	}

	keys := make([]string, 0, len(params))
	for key := range params {
		keys = append(keys, key)
	}
	sort.Strings(keys)

	var canonical strings.Builder
	for i, key := range keys {
		if i > 0 {
			canonical.WriteString("&")
		}
		canonical.WriteString(percentEncode(key))
		canonical.WriteString("=")
		canonical.WriteString(percentEncode(params[key]))
	}

	stringToSign := "GET&" + percentEncode("/") + "&" +
		percentEncode(canonical.String())
	mac := hmac.New(sha1.New, []byte(settings.AccessKeySecret+"&"))
	mac.Write([]byte(stringToSign))
	signature := base64.StdEncoding.EncodeToString(mac.Sum(nil))

	endpoint := fmt.Sprintf(
		"https://dysmsapi.aliyuncs.com/?Signature=%s&%s",
		percentEncode(signature), canonical.String(),
	)

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Get(endpoint)
	if err != nil {
		return fmt.Errorf("SMS request failed: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(io.LimitReader(resp.Body, 8*1024))
	if err != nil {
		return fmt.Errorf("SMS response unreadable: %w", err)
	}

	var result struct {
		Code    string `json:"Code"`
		Message string `json:"Message"`
	}
	if err := common.Unmarshal(body, &result); err != nil {
		return fmt.Errorf("SMS response malformed: %w", err)
	}
	if result.Code != "OK" {
		// The provider's message names the actual problem (unregistered
		// template, exhausted balance, blocked number), so surface it to the
		// log while the caller shows the user a generic failure.
		return fmt.Errorf("SMS rejected by provider: %s (%s)",
			result.Message, result.Code)
	}
	return nil
}

// percentEncode applies Aliyun's RPC signing escape rules, which differ from
// url.QueryEscape for space, asterisk and tilde.
func percentEncode(value string) string {
	encoded := url.QueryEscape(value)
	encoded = strings.ReplaceAll(encoded, "+", "%20")
	encoded = strings.ReplaceAll(encoded, "*", "%2A")
	encoded = strings.ReplaceAll(encoded, "%7E", "~")
	return encoded
}

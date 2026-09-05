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

// SMS provider identifiers accepted by SMSSettings.Provider.
const (
	// SMSProviderLog writes the verification code to the server log instead of
	// sending it. It is the default so a fresh deployment can exercise the
	// whole phone sign-in flow before any SMS account exists.
	SMSProviderLog = "log"
	// SMSProviderAliyun sends through Aliyun's Dysmsapi service.
	SMSProviderAliyun = "aliyun"
)

// SMSSettings holds the phone verification configuration an operator edits in
// system settings. Credentials live here rather than in environment variables
// so the provider can be swapped without a redeploy.
type SMSSettings struct {
	Enabled  bool   `json:"enabled"`
	Provider string `json:"provider"`

	AccessKeyId     string `json:"access_key_id"`
	AccessKeySecret string `json:"access_key_secret"`
	// SignName is the registered SMS signature, e.g. 智航通.
	SignName string `json:"sign_name"`
	// TemplateCode is the registered template, which must contain a ${code}
	// placeholder.
	TemplateCode string `json:"template_code"`
	// Region defaults to cn-hangzhou when left empty.
	Region string `json:"region"`

	// CodeLength is the number of digits in a verification code.
	CodeLength int `json:"code_length"`
	// CodeExpireMinutes is how long a code stays valid.
	CodeExpireMinutes int `json:"code_expire_minutes"`
	// ResendCooldownSeconds is the minimum gap between two sends to the same
	// number, which is what keeps an attacker from burning the SMS balance.
	ResendCooldownSeconds int `json:"resend_cooldown_seconds"`
}

var smsSettings = SMSSettings{
	Enabled:               false,
	Provider:              SMSProviderLog,
	Region:                "cn-hangzhou",
	CodeLength:            6,
	CodeExpireMinutes:     10,
	ResendCooldownSeconds: 60,
}

var smsSettingsMutex sync.RWMutex

func init() {
	config.GlobalConfig.Register("sms", &smsSettings)
}

// GetSMSSettings returns a copy, so callers cannot mutate shared state.
func GetSMSSettings() SMSSettings {
	smsSettingsMutex.RLock()
	defer smsSettingsMutex.RUnlock()
	return smsSettings
}

// SMSSettingsPointer is used by the settings-registration machinery, which
// unmarshals option JSON straight into the struct.
func SMSSettingsPointer() *SMSSettings {
	return &smsSettings
}

// NormalizeSMSSettings repairs values that would otherwise break the flow:
// an unknown provider, a code too short to be meaningful or too long for a
// template, a non-positive expiry, or a negative cooldown. Called after the
// option is loaded so bad input degrades instead of disabling sign-in.
func NormalizeSMSSettings() {
	smsSettingsMutex.Lock()
	defer smsSettingsMutex.Unlock()

	if smsSettings.Provider != SMSProviderAliyun {
		smsSettings.Provider = SMSProviderLog
	}
	if smsSettings.Region == "" {
		smsSettings.Region = "cn-hangzhou"
	}
	if smsSettings.CodeLength < 4 || smsSettings.CodeLength > 8 {
		smsSettings.CodeLength = 6
	}
	if smsSettings.CodeExpireMinutes <= 0 || smsSettings.CodeExpireMinutes > 60 {
		smsSettings.CodeExpireMinutes = 10
	}
	if smsSettings.ResendCooldownSeconds < 0 ||
		smsSettings.ResendCooldownSeconds > 600 {
		smsSettings.ResendCooldownSeconds = 60
	}
}

// SMSReady reports whether phone sign-in can actually run. The log provider
// needs no credentials, which is what makes local development possible; a real
// provider is only ready once its credentials and template are filled in.
func SMSReady() bool {
	s := GetSMSSettings()
	if !s.Enabled {
		return false
	}
	if s.Provider == SMSProviderAliyun {
		return s.AccessKeyId != "" && s.AccessKeySecret != "" &&
			s.SignName != "" && s.TemplateCode != ""
	}
	return true
}

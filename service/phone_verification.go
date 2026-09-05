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
	"crypto/rand"
	"errors"
	"math/big"
	"regexp"
	"strings"
	"sync"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/setting/system_setting"
)

// PhoneVerificationPurpose namespaces phone codes in the shared in-memory
// verification store so they cannot collide with email codes.
const PhoneVerificationPurpose = "p"

const (
	phoneCodeRedisPrefix     = "phone_code:"
	phoneCooldownRedisPrefix = "phone_cooldown:"
)

// ErrPhoneCodeCooldown is returned while a previous code for the same number
// is still within its resend window.
var ErrPhoneCodeCooldown = errors.New("phone verification code still in cooldown")

// mainland China mobile numbers; the only format the SMS templates target.
var phonePattern = regexp.MustCompile(`^1[3-9]\d{9}$`)

// NormalizePhone trims incidental formatting and accepts the +86 / 86 prefixes
// people paste from contact lists, returning the bare 11-digit number.
func NormalizePhone(raw string) string {
	phone := strings.TrimSpace(raw)
	phone = strings.ReplaceAll(phone, " ", "")
	phone = strings.ReplaceAll(phone, "-", "")
	phone = strings.TrimPrefix(phone, "+86")
	phone = strings.TrimPrefix(phone, "86")
	return phone
}

// IsValidPhone reports whether the normalized number is a mainland China
// mobile number.
func IsValidPhone(phone string) bool {
	return phonePattern.MatchString(phone)
}

// GenerateNumericCode returns a cryptographically random decimal code.
//
// The shared common.GenerateVerificationCode derives its value from a UUID,
// which yields hex characters; an SMS code has to be digits only.
func GenerateNumericCode(length int) (string, error) {
	if length < 4 || length > 8 {
		length = 6
	}
	var builder strings.Builder
	for i := 0; i < length; i++ {
		digit, err := rand.Int(rand.Reader, big.NewInt(10))
		if err != nil {
			return "", err
		}
		builder.WriteString(digit.String())
	}
	return builder.String(), nil
}

// IssuePhoneVerificationCode generates, stores and returns a code for a phone
// number, refusing while the previous one is still in its cooldown window.
//
// Codes live in Redis when it is configured. The shared in-memory store the
// email flow uses is per-process, so on a multi-node deployment a code issued
// by one node cannot be verified by another — tolerable for email, but phone
// is a primary sign-in path here. Single-node deployments fall back to the
// in-memory store and behave exactly as before.
func IssuePhoneVerificationCode(phone string) (string, error) {
	settings := system_setting.GetSMSSettings()

	if settings.ResendCooldownSeconds > 0 {
		active, err := phoneCooldownActive(phone)
		if err != nil {
			return "", err
		}
		if active {
			return "", ErrPhoneCodeCooldown
		}
	}

	code, err := GenerateNumericCode(settings.CodeLength)
	if err != nil {
		return "", err
	}

	expiry := time.Duration(settings.CodeExpireMinutes) * time.Minute
	if common.RedisEnabled {
		if err := common.RedisSet(
			phoneCodeRedisPrefix+phone, code, expiry,
		); err != nil {
			return "", err
		}
		if settings.ResendCooldownSeconds > 0 {
			cooldown := time.Duration(settings.ResendCooldownSeconds) * time.Second
			if err := common.RedisSet(
				phoneCooldownRedisPrefix+phone, "1", cooldown,
			); err != nil {
				return "", err
			}
		}
		return code, nil
	}

	common.RegisterVerificationCodeWithKey(phone, code, PhoneVerificationPurpose)
	registerPhoneCooldownInMemory(phone, settings.ResendCooldownSeconds)
	return code, nil
}

// VerifyPhoneCode checks a submitted code and consumes it on success, so a
// single code cannot be replayed.
func VerifyPhoneCode(phone string, code string) bool {
	if code == "" {
		return false
	}

	if common.RedisEnabled {
		stored, err := common.RedisGet(phoneCodeRedisPrefix + phone)
		if err != nil || stored == "" || stored != code {
			return false
		}
		_ = common.RedisDel(phoneCodeRedisPrefix + phone)
		return true
	}

	if !common.VerifyCodeWithKey(phone, code, PhoneVerificationPurpose) {
		return false
	}
	common.DeleteKey(phone, PhoneVerificationPurpose)
	return true
}

// WarnIfPhoneCodeStoreIsLocal logs once at startup when phone sign-in is on
// without Redis, because the failure it causes on a multi-node deployment is
// otherwise silent and intermittent.
func WarnIfPhoneCodeStoreIsLocal() {
	if system_setting.SMSReady() && !common.RedisEnabled {
		common.SysLog(
			"phone sign-in is enabled without Redis; verification codes are " +
				"kept in process memory and will not verify across multiple nodes",
		)
	}
}

func phoneCooldownActive(phone string) (bool, error) {
	if common.RedisEnabled {
		value, err := common.RedisGet(phoneCooldownRedisPrefix + phone)
		if err != nil {
			// A miss is reported as an error by the client; treat any failure
			// to read as "no cooldown" rather than blocking sign-in on a Redis
			// hiccup.
			return false, nil
		}
		return value != "", nil
	}
	return phoneCooldownActiveInMemory(phone), nil
}

// Single-node cooldown tracking. Redis holds this state when configured; this
// map is the fallback and is swept lazily on read, so an abandoned number
// costs one entry until it is looked up again.
var phoneCooldownUntil sync.Map

func registerPhoneCooldownInMemory(phone string, seconds int) {
	if seconds <= 0 {
		return
	}
	phoneCooldownUntil.Store(
		phone, time.Now().Add(time.Duration(seconds)*time.Second),
	)
}

func phoneCooldownActiveInMemory(phone string) bool {
	value, ok := phoneCooldownUntil.Load(phone)
	if !ok {
		return false
	}
	until, ok := value.(time.Time)
	if !ok {
		phoneCooldownUntil.Delete(phone)
		return false
	}
	if time.Now().After(until) {
		phoneCooldownUntil.Delete(phone)
		return false
	}
	return true
}

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
	"testing"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/relaykit/dto"
	"github.com/gin-gonic/gin"
	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
)

// The notification form and the language / sidebar / billing preferences are
// stored in one JSON blob on the user. Saving the notification form used to
// rebuild that blob from scratch and silently erase the other three.
func TestUpdateUserSettingKeepsPreferencesThatAreNotPartOfTheNotificationForm(t *testing.T) {
	previousDB := model.DB
	previousMemoryCache := common.MemoryCacheEnabled
	previousRedis := common.RedisEnabled
	initModelListColumnNames(t)
	database, err := gorm.Open(sqlite.Open("file:user_setting?mode=memory&cache=shared"), &gorm.Config{})
	require.NoError(t, err)
	require.NoError(t, database.AutoMigrate(&model.User{}))
	model.DB = database
	common.MemoryCacheEnabled = false
	common.RedisEnabled = false
	t.Cleanup(func() {
		model.DB = previousDB
		common.MemoryCacheEnabled = previousMemoryCache
		common.RedisEnabled = previousRedis
		if sqlDB, err := database.DB(); err == nil {
			_ = sqlDB.Close()
		}
	})

	user := &model.User{
		Username: "prefs",
		Password: "password123",
		AffCode:  "PRF1",
		Status:   common.UserStatusEnabled,
		Setting:  `{"notify_type":"webhook","webhook_url":"https://old.example/hook","quota_warning_threshold":500,"language":"en","sidebar_modules":"{\"chat\":{\"enabled\":false}}","billing_preference":"wallet_first"}`,
	}
	require.NoError(t, database.Create(user).Error)

	gin.SetMode(gin.TestMode)
	recorder := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(recorder)
	c.Request = httptest.NewRequest(http.MethodPut, "/api/user/setting", bytes.NewBufferString(
		`{"notify_type":"email","quota_warning_threshold":1000,"notification_email":"me@example.com","accept_unset_model_ratio_model":false,"record_ip_log":false}`,
	))
	c.Request.Header.Set("Content-Type", "application/json")
	c.Set("id", user.Id)

	UpdateUserSetting(c)

	require.Equal(t, http.StatusOK, recorder.Code)
	require.Contains(t, recorder.Body.String(), `"success":true`)
	saved := &model.User{}
	require.NoError(t, database.First(saved, user.Id).Error)
	setting := saved.GetSetting()

	assert.Equal(t, "email", setting.NotifyType)
	assert.Equal(t, "me@example.com", setting.NotificationEmail)
	assert.EqualValues(t, 1000, setting.QuotaWarningThreshold)
	assert.Empty(t, setting.WebhookUrl, "fields of the previous channel are still cleared")
	assert.Equal(t, "en", setting.Language)
	assert.Equal(t, `{"chat":{"enabled":false}}`, setting.SidebarModules)
	assert.Equal(t, "wallet_first", setting.BillingPreference)
}

func TestUpdateUserSettingTogglesNotificationsWithoutLosingTheChannel(t *testing.T) {
	previousDB := model.DB
	previousMemoryCache := common.MemoryCacheEnabled
	previousRedis := common.RedisEnabled
	initModelListColumnNames(t)
	database, err := gorm.Open(sqlite.Open("file:user_setting_toggle?mode=memory&cache=shared"), &gorm.Config{})
	require.NoError(t, err)
	require.NoError(t, database.AutoMigrate(&model.User{}))
	model.DB = database
	common.MemoryCacheEnabled = false
	common.RedisEnabled = false
	t.Cleanup(func() {
		model.DB = previousDB
		common.MemoryCacheEnabled = previousMemoryCache
		common.RedisEnabled = previousRedis
		if sqlDB, err := database.DB(); err == nil {
			_ = sqlDB.Close()
		}
	})
	user := &model.User{Username: "toggle", Password: "password123", AffCode: "TGL1", Status: common.UserStatusEnabled}
	require.NoError(t, database.Create(user).Error)

	save := func(body string) dto.UserSetting {
		t.Helper()
		gin.SetMode(gin.TestMode)
		recorder := httptest.NewRecorder()
		c, _ := gin.CreateTestContext(recorder)
		c.Request = httptest.NewRequest(http.MethodPut, "/api/user/setting", bytes.NewBufferString(body))
		c.Request.Header.Set("Content-Type", "application/json")
		c.Set("id", user.Id)
		UpdateUserSetting(c)
		require.Contains(t, recorder.Body.String(), `"success":true`)
		saved := &model.User{}
		require.NoError(t, database.First(saved, user.Id).Error)
		return saved.GetSetting()
	}

	off := save(`{"notify_type":"email","quota_warning_threshold":1000,"notification_email":"me@example.com","notify_disabled":true}`)
	assert.True(t, off.NotifyDisabled)
	assert.Equal(t, "me@example.com", off.NotificationEmail, "the channel survives being switched off")

	// A form that does not mention the flag (an older client) must not turn
	// the user's notifications back on.
	untouched := save(`{"notify_type":"email","quota_warning_threshold":1000,"notification_email":"me@example.com"}`)
	assert.True(t, untouched.NotifyDisabled)

	on := save(`{"notify_type":"email","quota_warning_threshold":1000,"notification_email":"me@example.com","notify_disabled":false}`)
	assert.False(t, on.NotifyDisabled)
	assert.Equal(t, "me@example.com", on.NotificationEmail)
}

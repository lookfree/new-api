package service

import (
	"testing"

	"github.com/QuantumNous/new-api/relaykit/dto"
	"github.com/stretchr/testify/require"
)

// Turning notifications off must stop delivery while leaving the configured
// channel in place, so switching them back on needs no re-entry.
func TestNotifyUserSendsNothingWhileNotificationsAreDisabled(t *testing.T) {
	notification := dto.NewNotify(dto.NotifyTypeQuotaExceed, "low balance", "top up soon", nil)
	setting := dto.UserSetting{
		NotifyType: dto.NotifyTypeWebhook,
		// Nothing listens here, so an attempted delivery always fails.
		WebhookUrl: "http://127.0.0.1:1/hook",
	}

	require.Error(t, NotifyUser(910001, "", setting, notification), "control: an enabled user's delivery is attempted")

	setting.NotifyDisabled = true

	require.NoError(t, NotifyUser(910001, "", setting, notification))
}

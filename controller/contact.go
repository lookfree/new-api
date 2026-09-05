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
	"fmt"
	"html"
	"strings"

	"github.com/QuantumNous/new-api/common"
	"github.com/gin-gonic/gin"
)

// Bounds on the contact form fields. They keep a single submission from
// turning into an unbounded email body, and are enforced server-side because
// the client-side schema is not a trust boundary.
const (
	maxContactNameLength    = 64
	maxContactContactLength = 128
	maxContactMessageLength = 2000
)

type ContactMessageRequest struct {
	Name    string `json:"name"`
	Contact string `json:"contact"`
	Message string `json:"message"`
}

// ContactMessage forwards a website contact form submission to the address an
// operator configures in `ContactEmail`, reusing the SMTP settings that already
// power verification mail. Nothing is persisted: the mailbox is the record.
func ContactMessage(c *gin.Context) {
	receiver := strings.TrimSpace(common.OptionMap["ContactEmail"])
	if receiver == "" {
		common.ApiErrorMsg(c, "联系表单未启用")
		return
	}

	var req ContactMessageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		common.ApiError(c, err)
		return
	}

	req.Name = strings.TrimSpace(req.Name)
	req.Contact = strings.TrimSpace(req.Contact)
	req.Message = strings.TrimSpace(req.Message)

	if req.Name == "" || req.Contact == "" || req.Message == "" {
		common.ApiErrorMsg(c, "请填写姓名、联系方式与留言内容")
		return
	}
	if len([]rune(req.Name)) > maxContactNameLength ||
		len([]rune(req.Contact)) > maxContactContactLength ||
		len([]rune(req.Message)) > maxContactMessageLength {
		common.ApiErrorMsg(c, "填写内容过长，请精简后重试")
		return
	}

	// The body is HTML mail assembled from visitor input, so every field is
	// escaped before interpolation and newlines are converted afterwards.
	body := fmt.Sprintf(
		"<p><strong>姓名：</strong>%s</p>"+
			"<p><strong>联系方式：</strong>%s</p>"+
			"<p><strong>留言内容：</strong></p><p>%s</p>"+
			"<hr><p>来自 %s 网站联系表单</p>",
		html.EscapeString(req.Name),
		html.EscapeString(req.Contact),
		strings.ReplaceAll(html.EscapeString(req.Message), "\n", "<br>"),
		html.EscapeString(common.SystemName),
	)

	subject := fmt.Sprintf("[%s] 网站留言 - %s", common.SystemName, req.Name)
	if err := common.SendEmail(subject, receiver, body); err != nil {
		common.SysError("failed to deliver contact form message: " + err.Error())
		common.ApiErrorMsg(c, "留言发送失败，请稍后重试或直接通过邮箱联系我们")
		return
	}

	common.ApiSuccess(c, nil)
}

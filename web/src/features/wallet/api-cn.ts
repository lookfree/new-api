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
import { api } from '@/lib/api'

export type AlipayPayResponse = {
  success: boolean
  message?: string
  data?: { url: string; trade_no: string }
}

export type WechatPayResponse = {
  success: boolean
  message?: string
  data?: { code_url: string; trade_no: string }
}

/** Create an Alipay order; the caller redirects to the returned checkout URL. */
export async function requestAlipayPay(
  amount: number
): Promise<AlipayPayResponse> {
  const res = await api.post('/api/user/alipay/pay', { amount })
  return res.data
}

/** Create a WeChat Native order; the caller renders code_url as a QR code. */
export async function requestWechatPay(
  amount: number
): Promise<WechatPayResponse> {
  const res = await api.post('/api/user/wechat/pay', { amount })
  return res.data
}

export type TopUpRecord = {
  trade_no: string
  status: string
}

/**
 * Look up one order's status. Used to notice that a QR payment completed,
 * since the gateway notifies the server, not the browser.
 */
export async function getTopUpStatus(
  tradeNo: string
): Promise<string | undefined> {
  const res = await api.get('/api/user/topup/self', {
    params: { p: 0, page_size: 20 },
  })
  const payload = res.data?.data
  const items: TopUpRecord[] = Array.isArray(payload)
    ? payload
    : (payload?.items ?? [])
  return items.find((item) => item.trade_no === tradeNo)?.status
}

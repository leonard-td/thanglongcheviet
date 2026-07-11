import { createHash } from "node:crypto"

/**
 * Zalo Official Account API — gửi tin CSKH (v3) + refresh access token (OAuth v4).
 * https://developers.zalo.me/docs/official-account
 *
 * Lưu ý nghiệp vụ: OA chỉ gửi được tin CSKH tới user đã tương tác với OA
 * (trong cửa sổ 48h). `notify_user_ids` trong config là danh sách Zalo user id
 * của nhân viên nhận thông báo đơn hàng — họ phải nhắn cho OA trước ít nhất
 * một lần.
 */

export type ZaloConfig = {
  app_id?: string
  secret_key?: string
  oa_id?: string
  access_token?: string
  refresh_token?: string
  token_expires_at?: number
  notify_user_ids?: string[]
}

const OAUTH_URL = "https://oauth.zaloapp.com/v4/oa/access_token"
const MESSAGE_URL = "https://openapi.zalo.me/v3.0/oa/message/cs"

/**
 * Access token của Zalo OA hết hạn sau ~25h; refresh_token xoay vòng theo mỗi
 * lần refresh (token cũ mất hiệu lực) nên kết quả phải được lưu lại ngay.
 */
export async function refreshZaloAccessToken(config: ZaloConfig): Promise<{
  access_token: string
  refresh_token: string
  token_expires_at: number
}> {
  if (!config.app_id || !config.secret_key || !config.refresh_token) {
    throw new Error("Zalo OA config is missing app_id/secret_key/refresh_token")
  }

  const response = await fetch(OAUTH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      secret_key: config.secret_key,
    },
    body: new URLSearchParams({
      app_id: config.app_id,
      refresh_token: config.refresh_token,
      grant_type: "refresh_token",
    }).toString(),
  })

  const data = (await response.json().catch(() => null)) as {
    access_token?: string
    refresh_token?: string
    expires_in?: string | number
    error_name?: string
    error_description?: string
  } | null

  if (!response.ok || !data?.access_token) {
    throw new Error(
      data?.error_description ||
        data?.error_name ||
        `Zalo token refresh failed (HTTP ${response.status})`
    )
  }

  return {
    access_token: String(data.access_token),
    refresh_token: data.refresh_token
      ? String(data.refresh_token)
      : config.refresh_token,
    // expires_in tính bằng giây (~90000 = 25h); làm mới sớm 5 phút cho an toàn
    token_expires_at:
      Date.now() + (Number(data.expires_in) || 90000) * 1000 - 5 * 60 * 1000,
  }
}

export async function sendZaloMessage(
  accessToken: string,
  userId: string,
  text: string
): Promise<{ messageId: string | null }> {
  const response = await fetch(MESSAGE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", access_token: accessToken },
    body: JSON.stringify({
      recipient: { user_id: userId },
      message: { text },
    }),
  })

  const data = (await response.json().catch(() => null)) as {
    error?: number
    message?: string
    data?: { message_id?: string }
  } | null

  if (!response.ok || (data && data.error !== 0)) {
    throw new Error(
      data?.message
        ? `Zalo error ${data.error}: ${data.message}`
        : `Zalo send failed (HTTP ${response.status})`
    )
  }

  return {
    messageId: data?.data?.message_id ? String(data.data.message_id) : null,
  }
}

/**
 * Xác thực webhook Zalo: header `X-ZEvent-Signature` mang
 * `mac=sha256(appId + rawBody + timestamp + secretKey)`.
 */
export function verifyZaloSignature(opts: {
  appId: string
  secretKey: string
  rawBody: string
  timestamp: string
  signature: string
}): boolean {
  const mac = createHash("sha256")
    .update(`${opts.appId}${opts.rawBody}${opts.timestamp}${opts.secretKey}`)
    .digest("hex")

  const normalized = opts.signature.startsWith("mac=")
    ? opts.signature.slice(4)
    : opts.signature

  return normalized === mac
}

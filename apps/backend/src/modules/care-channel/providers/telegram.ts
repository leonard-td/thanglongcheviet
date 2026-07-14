/**
 * Telegram Bot API — gửi tin nhắn tới group/chat và đăng ký webhook nhận tin.
 * https://core.telegram.org/bots/api
 */

export type TelegramConfig = {
  bot_token?: string
  chat_id?: string
}

type TelegramApiResponse = {
  ok?: boolean
  description?: string
  result?: { message_id?: number }
}

const API_BASE = "https://api.telegram.org"

async function callTelegram(
  botToken: string,
  method: string,
  payload: Record<string, unknown>
): Promise<TelegramApiResponse> {
  const response = await fetch(`${API_BASE}/bot${botToken}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })

  const data = (await response
    .json()
    .catch(() => null)) as TelegramApiResponse | null

  if (!response.ok || !data?.ok) {
    throw new Error(
      data?.description || `Telegram ${method} failed (HTTP ${response.status})`
    )
  }

  return data
}

export async function sendTelegramMessage(
  botToken: string,
  chatId: string,
  text: string
): Promise<{ messageId: string | null }> {
  const data = await callTelegram(botToken, "sendMessage", {
    chat_id: chatId,
    text,
  })

  return {
    messageId:
      data.result?.message_id != null ? String(data.result.message_id) : null,
  }
}

/**
 * Trỏ webhook của bot về backend. `secretToken` được Telegram gửi lại trong
 * header `X-Telegram-Bot-Api-Secret-Token` của mỗi update để xác thực nguồn.
 */
export async function setTelegramWebhook(
  botToken: string,
  url: string,
  secretToken?: string
): Promise<void> {
  await callTelegram(botToken, "setWebhook", {
    url,
    allowed_updates: ["message"],
    ...(secretToken ? { secret_token: secretToken } : {}),
  })
}

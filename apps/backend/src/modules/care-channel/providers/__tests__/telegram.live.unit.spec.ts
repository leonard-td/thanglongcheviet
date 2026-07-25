/**
 * Live smoke against Telegram Bot API.
 *
 * Requires TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID in env (apps/backend/.env
 * is loaded by jest via loadEnv). Skipped automatically when missing so CI
 * without secrets still passes.
 *
 * Run:
 *   npm run test:unit -w @dtc/backend -- --testPathPattern=telegram.live
 */

import { sendTelegramMessage } from "../telegram"

const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim()
const chatId = process.env.TELEGRAM_CHAT_ID?.trim()
const runLive = Boolean(botToken && chatId)

const describeLive = runLive ? describe : describe.skip

describeLive("telegram provider (live Bot API)", () => {
  jest.setTimeout(20_000)

  it("getMe confirms the bot token is valid", async () => {
    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/getMe`
    )
    const data = (await response.json()) as {
      ok?: boolean
      result?: { is_bot?: boolean; username?: string }
      description?: string
    }

    expect(response.ok).toBe(true)
    expect(data.ok).toBe(true)
    expect(data.result?.is_bot).toBe(true)
    expect(data.result?.username).toBeTruthy()
  })

  it("sendTelegramMessage delivers a real test ping", async () => {
    const stamp = new Date().toISOString()
    const text = `✅ Live test care-channel OK — ${stamp}`

    const result = await sendTelegramMessage(botToken!, chatId!, text)

    expect(result.messageId).toBeTruthy()
    expect(Number(result.messageId)).toBeGreaterThan(0)
  })
})

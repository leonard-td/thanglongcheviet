import { randomBytes } from "node:crypto"
import type { ExecArgs } from "@medusajs/framework/types"
import { CARE_CHANNEL_MODULE } from "../modules/care-channel"
import type CareChannelModuleService from "../modules/care-channel/service"
import { sendTelegramMessage } from "../modules/care-channel/providers/telegram"

/**
 * Upsert kênh Telegram từ env:
 *   TELEGRAM_BOT_TOKEN  — bắt buộc
 *   TELEGRAM_CHAT_ID    — bắt buộc
 *   TELEGRAM_CHANNEL_NAME — tùy chọn (mặc định "Telegram CSKH")
 *   TELEGRAM_SEED_SEND_TEST=1 — gửi tin thử sau khi seed
 *
 * Run: npm run seed:care-channel-telegram -w @dtc/backend
 */
export default async function seedCareChannelTelegram({
  container,
}: ExecArgs) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim()
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim()
  const channelName = process.env.TELEGRAM_CHANNEL_NAME?.trim() || "Telegram CSKH"

  if (!botToken || !chatId) {
    console.error(
      "Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID. Set them in .env then re-run."
    )
    return
  }

  const service: CareChannelModuleService = container.resolve(
    CARE_CHANNEL_MODULE
  )

  const existing = await service.listCareChannels(
    { provider: "telegram" },
    { take: 50 }
  )

  const match =
    existing.find((channel) => {
      const config = (channel.config ?? {}) as {
        bot_token?: string
        chat_id?: string
      }
      return config.chat_id === chatId || channel.name === channelName
    }) ?? null

  const config = { bot_token: botToken, chat_id: chatId }

  let channelId: string
  if (match) {
    await service.updateCareChannels({
      id: match.id,
      name: channelName,
      provider: "telegram",
      notify_orders: true,
      receive_messages: true,
      is_active: true,
      config,
      webhook_secret: match.webhook_secret || randomBytes(24).toString("hex"),
    })
    channelId = match.id
    console.log(`Updated Telegram care channel (id: ${channelId}).`)
  } else {
    const created = await service.createCareChannels({
      name: channelName,
      provider: "telegram",
      notify_orders: true,
      receive_messages: true,
      is_active: true,
      config,
      webhook_secret: randomBytes(24).toString("hex"),
    })
    channelId = Array.isArray(created) ? created[0].id : created.id
    console.log(`Created Telegram care channel (id: ${channelId}).`)
  }

  if (process.env.TELEGRAM_SEED_SEND_TEST === "1") {
    const text =
      "🔔 Tin nhắn thử từ seed care-channel — kênh Telegram đã kết nối thành công."
    const { messageId } = await sendTelegramMessage(botToken, chatId, text)
    console.log(`Test message sent (telegram message_id: ${messageId}).`)
  }

  console.log(
    `Channel ready: name="${channelName}", id=${channelId}, chat_id=${chatId}, notify_orders=true, receive_messages=true`
  )
}

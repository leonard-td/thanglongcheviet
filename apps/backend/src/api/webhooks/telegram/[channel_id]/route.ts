import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { CARE_CHANNEL_MODULE } from "../../../../modules/care-channel"
import type CareChannelModuleService from "../../../../modules/care-channel/service"
import { claimIdempotencyKey } from "../../../../lib/idempotency"

type TelegramUpdate = {
  message?: {
    message_id?: number
    text?: string
    caption?: string
    chat?: { id?: number | string }
    from?: {
      is_bot?: boolean
      first_name?: string
      last_name?: string
      username?: string
    }
  }
}

/**
 * POST /webhooks/telegram/:channel_id
 *
 * Nhận update từ Telegram (đăng ký qua setWebhook). Xác thực bằng header
 * `X-Telegram-Bot-Api-Secret-Token` khớp với webhook_secret của kênh.
 * Luôn trả 200 với kênh không tồn tại/không hợp lệ để Telegram không
 * retry vô hạn.
 */
export async function POST(
  req: MedusaRequest<TelegramUpdate>,
  res: MedusaResponse
) {
  const { channel_id } = req.params

  const service: CareChannelModuleService = req.scope.resolve(
    CARE_CHANNEL_MODULE
  )

  let channel
  try {
    channel = await service.retrieveCareChannel(channel_id)
  } catch {
    res.status(200).json({ ok: true })
    return
  }

  const secretHeader = req.headers["x-telegram-bot-api-secret-token"]
  if (channel.webhook_secret && secretHeader !== channel.webhook_secret) {
    res.status(401).json({ ok: false })
    return
  }

  if (
    channel.provider !== "telegram" ||
    !channel.is_active ||
    !channel.receive_messages
  ) {
    res.status(200).json({ ok: true })
    return
  }

  const message = req.body?.message
  const text = message?.text ?? message?.caption

  if (
    message?.chat?.id != null &&
    typeof text === "string" &&
    text.length &&
    !message.from?.is_bot
  ) {
    const externalMessageId = `${message.chat.id}:${message.message_id}`
    const claimed = await claimIdempotencyKey(
      `telegram:${channel.id}:${externalMessageId}`,
      86_400,
    )
    if (claimed === false) {
      res.status(200).json({ ok: true, duplicate: true })
      return
    }

    const name =
      [message.from?.first_name, message.from?.last_name]
        .filter(Boolean)
        .join(" ") ||
      message.from?.username ||
      null

    await service.recordInboundMessage(channel.id, {
      externalUserId: String(message.chat.id),
      externalUserName: name,
      externalMessageId,
      text,
    })
  }

  res.status(200).json({ ok: true })
}

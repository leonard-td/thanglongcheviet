import { MedusaError, MedusaService } from "@medusajs/framework/utils"
import CareChannel from "./models/care-channel"
import CareMessage from "./models/care-message"
import {
  sendTelegramMessage,
  setTelegramWebhook,
  type TelegramConfig,
} from "./providers/telegram"
import {
  refreshZaloAccessToken,
  sendZaloMessage,
  type ZaloConfig,
} from "./providers/zalo"

export type CareChannelProvider = "telegram" | "zalo_oa"
export type CareMessageKind = "order" | "support" | "test"

type CareChannelRecord = {
  id: string
  name: string
  provider: CareChannelProvider
  notify_orders: boolean
  receive_messages: boolean
  is_active: boolean
  config: Record<string, unknown> | null
  webhook_secret: string | null
}

export type CareMessageRecord = {
  id: string
  channel_id: string
  direction: "inbound" | "outbound"
  kind: CareMessageKind
  external_user_id: string | null
  external_user_name: string | null
  external_message_id: string | null
  content: string
  status: "sent" | "failed" | "received"
  error: string | null
}

type SendOptions = {
  text: string
  kind?: CareMessageKind
  externalUserId?: string | null
  externalUserName?: string | null
}

type InboundMessage = {
  externalUserId: string | null
  externalUserName?: string | null
  externalMessageId?: string | null
  text: string
}

class CareChannelModuleService extends MedusaService({
  CareChannel,
  CareMessage,
}) {
  /**
   * Gửi một tin nhắn qua kênh tới một người nhận cụ thể và ghi log.
   * Không throw khi provider lỗi — trả về bản ghi với status `failed`
   * để caller (route trả lời / broadcast) tự quyết định xử lý.
   */
  async sendMessage(channelId: string, options: SendOptions) {
    const channel = (await this.retrieveCareChannel(
      channelId
    )) as unknown as CareChannelRecord

    return await this.sendViaChannel(channel, options)
  }

  /**
   * Gửi một tin tới toàn bộ người nhận mặc định của kênh: Telegram gửi vào
   * `chat_id`, Zalo OA gửi tới từng user trong `notify_user_ids`.
   */
  async sendToChannel(channelId: string, text: string, kind: CareMessageKind) {
    const channel = (await this.retrieveCareChannel(
      channelId
    )) as unknown as CareChannelRecord

    return await this.dispatchToChannel(channel, text, kind)
  }

  /** Thông báo tới mọi kênh chăm sóc bán hàng đang bật (`notify_orders`). */
  async notifyOrderChannels(text: string) {
    return await this.broadcast(text, "order", { notify_orders: true })
  }

  /** Thông báo tới mọi kênh CSKH chung đang bật (`receive_messages`). */
  async notifySupportChannels(text: string) {
    return await this.broadcast(text, "support", { receive_messages: true })
  }

  /**
   * Lưu tin nhắn khách gửi tới (từ webhook). Dedupe theo
   * `external_message_id` vì các nền tảng retry webhook khi chưa nhận 2xx.
   */
  async recordInboundMessage(channelId: string, message: InboundMessage) {
    if (message.externalMessageId) {
      const [existing] = await this.listCareMessages(
        {
          channel_id: channelId,
          direction: "inbound",
          external_message_id: message.externalMessageId,
        },
        { take: 1 }
      )

      if (existing) {
        return existing
      }
    }

    return await this.createCareMessages({
      channel_id: channelId,
      direction: "inbound",
      kind: "support",
      external_user_id: message.externalUserId,
      external_user_name: message.externalUserName ?? null,
      external_message_id: message.externalMessageId ?? null,
      content: message.text,
      status: "received",
      error: null,
    })
  }

  /** Đăng ký webhook của bot Telegram trỏ về backend. Trả về URL đã đăng ký. */
  async registerTelegramWebhook(channelId: string, baseUrl: string) {
    const channel = (await this.retrieveCareChannel(
      channelId
    )) as unknown as CareChannelRecord

    if (channel.provider !== "telegram") {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Webhook registration is only supported for Telegram channels"
      )
    }

    const config = (channel.config ?? {}) as TelegramConfig

    if (!config.bot_token) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Telegram channel is missing bot_token"
      )
    }

    const url = `${baseUrl.replace(/\/+$/, "")}/webhooks/telegram/${channel.id}`

    await setTelegramWebhook(
      config.bot_token,
      url,
      channel.webhook_secret ?? undefined
    )

    return url
  }

  private async broadcast(
    text: string,
    kind: CareMessageKind,
    flagFilter: Record<string, boolean>
  ) {
    const channels = (await this.listCareChannels({
      is_active: true,
      ...flagFilter,
    })) as unknown as CareChannelRecord[]

    const results: CareMessageRecord[] = []

    for (const channel of channels) {
      results.push(...(await this.dispatchToChannel(channel, text, kind)))
    }

    return results
  }

  private async dispatchToChannel(
    channel: CareChannelRecord,
    text: string,
    kind: CareMessageKind
  ) {
    if (channel.provider === "zalo_oa") {
      const userIds = ((channel.config ?? {}) as ZaloConfig).notify_user_ids ?? []

      if (!userIds.length) {
        return [
          await this.logMessage(channel, {
            text,
            kind,
            status: "failed",
            error: "Zalo OA channel has no notify_user_ids configured",
          }),
        ]
      }

      const results: CareMessageRecord[] = []
      for (const userId of userIds) {
        results.push(
          await this.sendViaChannel(channel, {
            text,
            kind,
            externalUserId: userId,
          })
        )
      }
      return results
    }

    return [await this.sendViaChannel(channel, { text, kind })]
  }

  private async sendViaChannel(channel: CareChannelRecord, options: SendOptions) {
    const kind = options.kind ?? "support"

    try {
      const { messageId, recipientId } = await this.deliver(
        channel,
        options.externalUserId ?? null,
        options.text
      )

      return await this.logMessage(channel, {
        text: options.text,
        kind,
        status: "sent",
        externalUserId: recipientId,
        externalUserName: options.externalUserName ?? null,
        externalMessageId: messageId,
      })
    } catch (error) {
      return await this.logMessage(channel, {
        text: options.text,
        kind,
        status: "failed",
        externalUserId: options.externalUserId ?? null,
        externalUserName: options.externalUserName ?? null,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  private async deliver(
    channel: CareChannelRecord,
    recipientId: string | null,
    text: string
  ): Promise<{ messageId: string | null; recipientId: string | null }> {
    if (channel.provider === "telegram") {
      const config = (channel.config ?? {}) as TelegramConfig
      const chatId = recipientId || config.chat_id

      if (!config.bot_token || !chatId) {
        throw new Error("Telegram channel is missing bot_token/chat_id")
      }

      const { messageId } = await sendTelegramMessage(
        config.bot_token,
        chatId,
        text
      )
      return { messageId, recipientId: chatId }
    }

    if (!recipientId) {
      throw new Error("Zalo OA requires a recipient user id")
    }

    const accessToken = await this.ensureZaloAccessToken(channel)
    const { messageId } = await sendZaloMessage(accessToken, recipientId, text)
    return { messageId, recipientId }
  }

  /**
   * Trả về access token Zalo còn hạn; tự refresh và lưu lại token mới khi đã
   * hết hạn (refresh_token của Zalo xoay vòng nên phải persist ngay).
   */
  private async ensureZaloAccessToken(
    channel: CareChannelRecord
  ): Promise<string> {
    const config = (channel.config ?? {}) as ZaloConfig

    if (
      config.access_token &&
      (!config.token_expires_at || config.token_expires_at > Date.now())
    ) {
      return config.access_token
    }

    const refreshed = await refreshZaloAccessToken(config)

    const nextConfig = { ...config, ...refreshed }
    await this.updateCareChannels({ id: channel.id, config: nextConfig })
    channel.config = nextConfig

    return refreshed.access_token
  }

  private async logMessage(
    channel: CareChannelRecord,
    entry: {
      text: string
      kind: CareMessageKind
      status: "sent" | "failed"
      externalUserId?: string | null
      externalUserName?: string | null
      externalMessageId?: string | null
      error?: string | null
    }
  ): Promise<CareMessageRecord> {
    return await this.createCareMessages({
      channel_id: channel.id,
      direction: "outbound",
      kind: entry.kind,
      external_user_id: entry.externalUserId ?? null,
      external_user_name: entry.externalUserName ?? null,
      external_message_id: entry.externalMessageId ?? null,
      content: entry.text,
      status: entry.status,
      error: entry.error ?? null,
    })
  }
}

export default CareChannelModuleService

import { model } from "@medusajs/framework/utils"

/**
 * Một kênh chăm sóc khách hàng đã tích hợp (Zalo OA, Telegram...).
 *
 * - `notify_orders`: kênh nhận thông báo khi có đơn hàng mới (chăm sóc bán hàng)
 * - `receive_messages`: kênh nhận/gửi tin nhắn với khách hàng (CSKH chung)
 * - `config`: credential riêng theo nền tảng —
 *   telegram: { bot_token, chat_id }
 *   zalo_oa:  { app_id, secret_key, oa_id, access_token, refresh_token,
 *               token_expires_at, notify_user_ids }
 * - `webhook_secret`: token xác thực webhook inbound (Telegram secret_token)
 */
const CareChannel = model.define("care_channel", {
  id: model.id({ prefix: "cch" }).primaryKey(),
  name: model.text().searchable(),
  provider: model.enum(["telegram", "zalo_oa"]),
  notify_orders: model.boolean().default(true),
  receive_messages: model.boolean().default(true),
  is_active: model.boolean().default(true),
  config: model.json(),
  webhook_secret: model.text().nullable(),
})

export default CareChannel

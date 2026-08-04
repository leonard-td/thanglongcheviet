import { model } from "@medusajs/framework/utils"

/**
 * Log tin nhắn gửi/nhận qua một kênh CSKH.
 *
 * - `direction`: outbound (hệ thống gửi đi) / inbound (khách nhắn tới, qua webhook)
 * - `kind`: order (thông báo đơn hàng), support (CSKH chung), test (tin thử)
 * - `external_user_id`: Telegram chat id / Zalo user id của người nhận-gửi
 * - `external_message_id`: id tin nhắn phía nền tảng — dùng dedupe webhook retry
 */
const CareMessage = model.define("care_message", {
  id: model.id({ prefix: "cmsg" }).primaryKey(),
  channel_id: model.text(),
  direction: model.enum(["inbound", "outbound"]),
  kind: model.enum(["order", "support", "test"]).default("support"),
  external_user_id: model.text().nullable(),
  external_user_name: model.text().nullable(),
  external_message_id: model.text().nullable(),
  reference_id: model.text().nullable(),
  content: model.text().searchable(),
  status: model.enum(["sent", "failed", "received"]),
  error: model.text().nullable(),
})

export default CareMessage

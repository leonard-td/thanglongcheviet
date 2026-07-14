import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { CARE_CHANNEL_MODULE } from "../../../../../modules/care-channel"
import type CareChannelModuleService from "../../../../../modules/care-channel/service"

/**
 * POST /admin/care-channels/:id/test
 *
 * Gửi một tin nhắn thử tới kênh để kiểm tra cấu hình credential.
 */
export async function POST(
  req: MedusaRequest<{ text?: string }>,
  res: MedusaResponse
) {
  const { id } = req.params

  const service: CareChannelModuleService = req.scope.resolve(
    CARE_CHANNEL_MODULE
  )

  const text =
    req.body?.text?.trim() ||
    "🔔 Tin nhắn thử từ hệ thống — kênh đã kết nối thành công."

  const messages = await service.sendToChannel(id, text, "test")
  const failed = messages.filter((message) => message.status === "failed")

  res.json({
    success: failed.length === 0,
    error: failed[0]?.error ?? null,
    messages,
  })
}

import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { CARE_CHANNEL_MODULE } from "../../../../../modules/care-channel"
import type CareChannelModuleService from "../../../../../modules/care-channel/service"

/**
 * POST /admin/care-channels/:id/webhook
 *
 * Đăng ký webhook của bot Telegram trỏ về backend (Telegram yêu cầu URL
 * HTTPS công khai — lấy từ MEDUSA_BACKEND_URL). Zalo OA không có API này:
 * URL webhook phải dán thủ công trong Zalo Developer Console.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const { id } = req.params

  const service: CareChannelModuleService = req.scope.resolve(
    CARE_CHANNEL_MODULE
  )

  const baseUrl = process.env.MEDUSA_BACKEND_URL

  if (!baseUrl) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "MEDUSA_BACKEND_URL is not configured"
    )
  }

  const webhook_url = await service.registerTelegramWebhook(id, baseUrl)

  res.json({ success: true, webhook_url })
}

import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { CARE_CHANNEL_MODULE } from "../../../../modules/care-channel"
import type CareChannelModuleService from "../../../../modules/care-channel/service"
import {
  verifyZaloSignature,
  type ZaloConfig,
} from "../../../../modules/care-channel/providers/zalo"
import { claimIdempotencyKey } from "../../../../lib/idempotency"

type ZaloEvent = {
  event_name?: string
  timestamp?: string | number
  sender?: { id?: string }
  message?: { text?: string; msg_id?: string }
}

/** Zalo ping GET khi xác minh URL webhook trong Developer Console. */
export async function GET(_req: MedusaRequest, res: MedusaResponse) {
  res.status(200).json({ ok: true })
}

/**
 * POST /webhooks/zalo/:channel_id
 *
 * Nhận sự kiện từ Zalo OA. Khi kênh có app_id + secret_key và request mang
 * header `X-ZEvent-Signature` thì xác thực chữ ký trên raw body
 * (bodyParser.preserveRawBody bật trong middlewares.ts).
 */
export async function POST(
  req: MedusaRequest<ZaloEvent>,
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

  if (
    channel.provider !== "zalo_oa" ||
    !channel.is_active ||
    !channel.receive_messages
  ) {
    res.status(200).json({ ok: true })
    return
  }

  const config = ((channel.config as Record<string, unknown>) ??
    {}) as ZaloConfig
  const signature = req.headers["x-zevent-signature"]
  const body = req.body ?? {}

  if (config.app_id && config.secret_key) {
    if (typeof signature !== "string") {
      res.status(401).json({ ok: false })
      return
    }

    const rawBody = req.rawBody
      ? req.rawBody.toString()
      : JSON.stringify(body)

    const valid = verifyZaloSignature({
      appId: config.app_id,
      secretKey: config.secret_key,
      rawBody,
      timestamp: String(body.timestamp ?? ""),
      signature,
    })

    if (!valid) {
      res.status(401).json({ ok: false })
      return
    }
  }

  if (body.event_name === "user_send_text" && body.message?.text && body.sender?.id) {
    const msgId = body.message.msg_id ? String(body.message.msg_id) : null
    if (!msgId) {
      res.status(200).json({ ok: true, skipped: true })
      return
    }

    const claimed = await claimIdempotencyKey(`zalo:${channel.id}:${msgId}`, 86_400)
    if (claimed === false) {
      res.status(200).json({ ok: true, duplicate: true })
      return
    }

    await service.recordInboundMessage(channel.id, {
      externalUserId: String(body.sender.id),
      externalMessageId: msgId,
      text: String(body.message.text),
    })
  }

  res.status(200).json({ ok: true })
}

import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "zod"
import { zodValidator } from "../../utils/zod-validator"
import { CARE_CHANNEL_MODULE } from "../../../modules/care-channel"
import type CareChannelModuleService from "../../../modules/care-channel/service"
import { parsePagination } from "../../utils/pagination"

const ReplySchema = z.object({
  channel_id: z.string().min(1),
  external_user_id: z.string().min(1),
  content: z.string().min(1).max(4000),
})

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const service: CareChannelModuleService = req.scope.resolve(
    CARE_CHANNEL_MODULE
  )

  const { limit, offset } = parsePagination(req.query, {
    limit: 20,
    max: 200,
  })

  const filters: Record<string, unknown> = {}
  for (const key of [
    "channel_id",
    "direction",
    "kind",
    "external_user_id",
  ] as const) {
    if (typeof req.query[key] === "string" && req.query[key]) {
      filters[key] = req.query[key]
    }
  }

  const [messages, count] = await service.listAndCountCareMessages(filters, {
    take: limit,
    skip: offset,
    order: { created_at: "DESC" },
  })

  // gắn thông tin kênh (tham chiếu channel_id là cột thường — resolve thủ công)
  const channelIds = [...new Set(messages.map((m) => m.channel_id))]
  const channels = channelIds.length
    ? await service.listCareChannels(
        { id: channelIds },
        { select: ["id", "name", "provider"] }
      )
    : []
  const channelMap = new Map(channels.map((c) => [c.id, c]))

  res.json({
    care_messages: messages.map((message) => ({
      ...message,
      channel: channelMap.get(message.channel_id) ?? null,
    })),
    count,
    limit,
    offset,
  })
}

/**
 * POST /admin/care-messages
 *
 * Nhân viên trả lời một khách hàng qua kênh đã tích hợp.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const service: CareChannelModuleService = req.scope.resolve(
    CARE_CHANNEL_MODULE
  )

  const body = await zodValidator(ReplySchema, req.body)

  const care_message = await service.sendMessage(body.channel_id, {
    text: body.content,
    kind: "support",
    externalUserId: body.external_user_id,
  })

  if (care_message.status === "failed") {
    res.status(502).json({
      message: care_message.error || "Failed to deliver message",
      care_message,
    })
    return
  }

  res.status(201).json({ care_message })
}

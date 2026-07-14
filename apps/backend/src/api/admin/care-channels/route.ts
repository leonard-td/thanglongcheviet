import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { randomBytes } from "node:crypto"
import { z } from "zod"
import { CARE_CHANNEL_MODULE } from "../../../modules/care-channel"
import type CareChannelModuleService from "../../../modules/care-channel/service"

export const ChannelConfigSchema = z.object({
  // telegram
  bot_token: z.string().optional(),
  chat_id: z.string().optional(),
  // zalo_oa
  app_id: z.string().optional(),
  secret_key: z.string().optional(),
  oa_id: z.string().optional(),
  access_token: z.string().optional(),
  refresh_token: z.string().optional(),
  notify_user_ids: z.array(z.string()).optional(),
})

const CreateCareChannelSchema = z.object({
  name: z.string().min(1),
  provider: z.enum(["telegram", "zalo_oa"]),
  notify_orders: z.boolean().default(true),
  receive_messages: z.boolean().default(true),
  is_active: z.boolean().default(true),
  config: ChannelConfigSchema.default({}),
})

/**
 * Loại bỏ các giá trị rỗng để input bỏ trống trong form không ghi đè
 * credential đã lưu (PATCH merge config với bản hiện có).
 */
export function cleanChannelConfig(
  config: Record<string, unknown> = {}
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(config).filter(
      ([, value]) => value !== "" && value !== undefined && value !== null
    )
  )
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const service: CareChannelModuleService = req.scope.resolve(
    CARE_CHANNEL_MODULE
  )

  const limit = Math.min(Number(req.query.limit) || 20, 100)
  const offset = Number(req.query.offset) || 0
  const provider =
    typeof req.query.provider === "string" ? req.query.provider : undefined

  const [care_channels, count] = await service.listAndCountCareChannels(
    { ...(provider ? { provider } : {}) },
    { take: limit, skip: offset, order: { created_at: "DESC" } }
  )

  res.json({ care_channels, count, limit, offset })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const service: CareChannelModuleService = req.scope.resolve(
    CARE_CHANNEL_MODULE
  )

  const body = CreateCareChannelSchema.parse(req.body)

  const care_channel = await service.createCareChannels({
    ...body,
    config: cleanChannelConfig(body.config),
    webhook_secret: randomBytes(24).toString("hex"),
  })

  res.status(201).json({ care_channel })
}

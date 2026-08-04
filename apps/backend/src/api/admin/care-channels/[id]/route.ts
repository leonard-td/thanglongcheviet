import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "zod"
import { zodValidator } from "../../../utils/zod-validator"
import { CARE_CHANNEL_MODULE } from "../../../../modules/care-channel"
import type CareChannelModuleService from "../../../../modules/care-channel/service"
import { redactCareChannel } from "../redact"
import { ChannelConfigSchema, cleanChannelConfig } from "../route"

const UpdateCareChannelSchema = z.object({
  name: z.string().min(1).optional(),
  notify_orders: z.boolean().optional(),
  receive_messages: z.boolean().optional(),
  is_active: z.boolean().optional(),
  config: ChannelConfigSchema.optional(),
})

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const { id } = req.params

  const service: CareChannelModuleService = req.scope.resolve(
    CARE_CHANNEL_MODULE
  )

  const care_channel = await service.retrieveCareChannel(id)

  res.json({ care_channel: redactCareChannel(care_channel) })
}

export async function PATCH(req: MedusaRequest, res: MedusaResponse) {
  const { id } = req.params

  const service: CareChannelModuleService = req.scope.resolve(
    CARE_CHANNEL_MODULE
  )

  const body = await zodValidator(UpdateCareChannelSchema, req.body)

  const existing = await service.retrieveCareChannel(id)

  // merge để field bỏ trống không xoá mất credential/token đã lưu
  const config =
    body.config === undefined
      ? undefined
      : {
          ...((existing.config as Record<string, unknown>) ?? {}),
          ...cleanChannelConfig(body.config),
        }

  const care_channel = await service.updateCareChannels({
    id,
    ...body,
    config,
  })

  res.json({ care_channel: redactCareChannel(care_channel) })
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const { id } = req.params

  const service: CareChannelModuleService = req.scope.resolve(
    CARE_CHANNEL_MODULE
  )

  await service.deleteCareChannels(id)

  res.status(200).json({
    id,
    object: "care_channel",
    deleted: true,
  })
}

import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "zod"
import { zodValidator } from "@medusajs/framework/zod"
import { CAMPAIGN_MODULE } from "../../../../modules/campaign"
import type CampaignModuleService from "../../../../modules/campaign/service"
import { toRelativeMediaUrl } from "../../../utils/media-url"

const UpdateCampaignTopicSchema = z.object({
  name: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  image: z.string().nullable().optional(),
  is_active: z.boolean().optional(),
  rank: z.number().int().optional(),
})

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const { id } = req.params

  const campaignModuleService: CampaignModuleService =
    req.scope.resolve(CAMPAIGN_MODULE)

  const topic = await campaignModuleService.retrieveCampaignTopic(id)

  res.json({ campaign_topic: topic })
}

export async function PATCH(req: MedusaRequest, res: MedusaResponse) {
  const { id } = req.params

  const campaignModuleService: CampaignModuleService =
    req.scope.resolve(CAMPAIGN_MODULE)

  const body = await zodValidator(UpdateCampaignTopicSchema, req.body)

  const topic = await campaignModuleService.updateCampaignTopics({
    id,
    ...body,
    image: body.image === undefined ? undefined : toRelativeMediaUrl(body.image),
  })

  res.json({ campaign_topic: topic })
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const { id } = req.params

  const campaignModuleService: CampaignModuleService =
    req.scope.resolve(CAMPAIGN_MODULE)

  // Detach posts still pointing at this topic so they don't keep a dead reference
  const posts = await campaignModuleService.listCampaignPosts(
    { topic_id: id },
    { select: ["id"] }
  )
  if (posts.length) {
    await campaignModuleService.updateCampaignPosts(
      posts.map((post) => ({ id: post.id, topic_id: null }))
    )
  }

  await campaignModuleService.deleteCampaignTopics(id)

  res.status(200).json({
    id,
    object: "campaign_topic",
    deleted: true,
  })
}

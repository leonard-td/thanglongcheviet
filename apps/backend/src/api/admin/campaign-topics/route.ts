import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "zod"
import { zodValidator } from "@medusajs/framework/zod"
import { CAMPAIGN_MODULE } from "../../../modules/campaign"
import type CampaignModuleService from "../../../modules/campaign/service"
import { toRelativeMediaUrl } from "../../utils/media-url"

const CreateCampaignTopicSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  image: z.string().nullable().optional(),
  is_active: z.boolean().default(true),
  rank: z.number().int().default(0),
})

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "")

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const campaignModuleService: CampaignModuleService =
    req.scope.resolve(CAMPAIGN_MODULE)

  const limit = Math.min(Number(req.query.limit) || 50, 100)
  const offset = Number(req.query.offset) || 0

  const [topics, count] =
    await campaignModuleService.listAndCountCampaignTopics(
      {},
      {
        take: limit,
        skip: offset,
        order: { rank: "ASC", name: "ASC" },
      }
    )

  res.json({
    campaign_topics: topics,
    count,
    limit,
    offset,
  })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const campaignModuleService: CampaignModuleService =
    req.scope.resolve(CAMPAIGN_MODULE)

  const body = await zodValidator(CreateCampaignTopicSchema, req.body)

  const topic = await campaignModuleService.createCampaignTopics({
    name: body.name,
    slug: body.slug || slugify(body.name),
    description: body.description ?? null,
    image: toRelativeMediaUrl(body.image),
    is_active: body.is_active,
    rank: body.rank,
  })

  res.status(201).json({ campaign_topic: topic })
}

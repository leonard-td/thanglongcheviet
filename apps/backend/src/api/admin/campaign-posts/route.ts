import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "zod"
import { zodValidator } from "@medusajs/framework"
import { CAMPAIGN_MODULE } from "../../../modules/campaign"
import type CampaignModuleService from "../../../modules/campaign/service"
import { normalizeTiptapImageUrls, toRelativeMediaUrl } from "../../utils/media-url"

const CreateCampaignPostSchema = z.object({
  title: z.string().min(1),
  slug: z.string().min(1).optional(),
  content: z.record(z.string(), z.unknown()).default({}),
  description: z.string().nullable().optional(),
  thumbnail: z.string().nullable().optional(),
  topic_id: z.string().nullable().optional(),
  is_active: z.boolean().default(true),
  publish_at: z.string().datetime().nullable().optional(),
  unpublish_at: z.string().datetime().nullable().optional(),
  source: z.string().nullable().optional(),
  seo_title: z.string().nullable().optional(),
  seo_description: z.string().nullable().optional(),
  seo_keywords: z.string().nullable().optional(),
})

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "")

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const campaignModuleService: CampaignModuleService =
    req.scope.resolve(CAMPAIGN_MODULE)

  const { take, skip } = req.queryConfig.pagination

  const [posts, count] = await campaignModuleService.listAndCountCampaignPosts(
    {},
    {
      take,
      skip,
      order: { created_at: "DESC" },
    }
  )

  res.json({
    campaign_posts: posts,
    count,
    limit: take,
    offset: skip,
  })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const campaignModuleService: CampaignModuleService =
    req.scope.resolve(CAMPAIGN_MODULE)

  const body = await zodValidator(CreateCampaignPostSchema, req.body)
  const slug = body.slug || slugify(body.title)

  const post = await campaignModuleService.createCampaignPosts({
    title: body.title,
    slug,
    content: normalizeTiptapImageUrls(body.content),
    description: body.description ?? null,
    thumbnail: toRelativeMediaUrl(body.thumbnail),
    topic_id: body.topic_id ?? null,
    is_active: body.is_active,
    publish_at: body.publish_at ? new Date(body.publish_at) : null,
    unpublish_at: body.unpublish_at ? new Date(body.unpublish_at) : null,
    source: body.source ?? null,
    seo_title: body.seo_title ?? null,
    seo_description: body.seo_description ?? null,
    seo_keywords: body.seo_keywords ?? null,
  })

  res.status(201).json({ campaign_post: post })
}

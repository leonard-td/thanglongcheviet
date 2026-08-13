import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "zod"
import { zodValidator } from "../../utils/zod-validator"
import { CAMPAIGN_MODULE } from "../../../modules/campaign"
import type CampaignModuleService from "../../../modules/campaign/service"
import { normalizeTiptapImageUrls, toRelativeMediaUrl } from "../../utils/media-url"
import {
  legacyFieldsFromVietnameseTranslation,
  mergeCampaignPostTranslations,
  type CampaignPostTranslations,
} from "../../../modules/campaign/translations"

const LocalizedCampaignPostSchema = z.object({
  title: z.string().min(1).optional(),
  content: z.record(z.string(), z.unknown()).optional(),
  description: z.string().nullable().optional(),
  source: z.string().nullable().optional(),
  seo_title: z.string().nullable().optional(),
  seo_description: z.string().nullable().optional(),
  seo_keywords: z.string().nullable().optional(),
})

const CreateCampaignPostSchema = z.object({
  title: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  content: z.record(z.string(), z.unknown()).optional(),
  translations: z
    .object({
      vi: LocalizedCampaignPostSchema.optional(),
      en: LocalizedCampaignPostSchema.optional(),
    })
    .optional(),
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
}).superRefine((data, ctx) => {
  if (!data.translations && !data.title) {
    ctx.addIssue({
      code: "custom",
      path: ["title"],
      message: "A Vietnamese title is required",
    })
  }

  if (data.translations && !data.translations.vi?.title) {
    ctx.addIssue({
      code: "custom",
      path: ["translations", "vi", "title"],
      message: "A Vietnamese title is required",
    })
  }
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
  const translations = mergeCampaignPostTranslations(
    {},
    body.translations as CampaignPostTranslations | undefined,
    {
      ...body,
      content: body.content ?? {},
    }
  )
  const localizedFields = legacyFieldsFromVietnameseTranslation(translations)
  const title = localizedFields.title ?? body.title
  const slug = body.slug || slugify(title ?? "")

  const post = await campaignModuleService.createCampaignPosts({
    title: title!,
    slug,
    content: normalizeTiptapImageUrls(localizedFields.content ?? {}),
    translations: Object.fromEntries(
      Object.entries(translations).map(([locale, translation]) => [
        locale,
        {
          ...translation,
          content: translation.content
            ? normalizeTiptapImageUrls(translation.content)
            : undefined,
        },
      ])
    ),
    description: localizedFields.description ?? null,
    thumbnail: toRelativeMediaUrl(body.thumbnail),
    topic_id: body.topic_id ?? null,
    is_active: body.is_active,
    publish_at: body.publish_at ? new Date(body.publish_at) : null,
    unpublish_at: body.unpublish_at ? new Date(body.unpublish_at) : null,
    source: localizedFields.source ?? null,
    seo_title: localizedFields.seo_title ?? null,
    seo_description: localizedFields.seo_description ?? null,
    seo_keywords: localizedFields.seo_keywords ?? null,
  })

  res.status(201).json({ campaign_post: post })
}

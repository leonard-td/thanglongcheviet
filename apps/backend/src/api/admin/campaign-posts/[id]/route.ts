import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "zod"
import { zodValidator } from "../../../utils/zod-validator"
import { CAMPAIGN_MODULE } from "../../../../modules/campaign"
import type CampaignModuleService from "../../../../modules/campaign/service"
import { normalizeTiptapImageUrls, toRelativeMediaUrl } from "../../../utils/media-url"
import {
  legacyFieldsFromVietnameseTranslation,
  mergeCampaignPostTranslations,
  type CampaignPostTranslations,
} from "../../../../modules/campaign/translations"

const LocalizedCampaignPostSchema = z.object({
  title: z.string().min(1).optional(),
  content: z.record(z.string(), z.unknown()).optional(),
  description: z.string().nullable().optional(),
  source: z.string().nullable().optional(),
  seo_title: z.string().nullable().optional(),
  seo_description: z.string().nullable().optional(),
  seo_keywords: z.string().nullable().optional(),
})

const UpdateCampaignPostSchema = z.object({
  title: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  content: z.record(z.string(), z.unknown()).optional(),
  description: z.string().nullable().optional(),
  thumbnail: z.string().nullable().optional(),
  topic_id: z.string().nullable().optional(),
  is_active: z.boolean().optional(),
  publish_at: z.string().datetime().nullable().optional(),
  unpublish_at: z.string().datetime().nullable().optional(),
  source: z.string().nullable().optional(),
  seo_title: z.string().nullable().optional(),
  seo_description: z.string().nullable().optional(),
  seo_keywords: z.string().nullable().optional(),
  translations: z
    .object({
      vi: LocalizedCampaignPostSchema.optional(),
      en: LocalizedCampaignPostSchema.optional(),
    })
    .optional(),
})

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const { id } = req.params

  const campaignModuleService: CampaignModuleService =
    req.scope.resolve(CAMPAIGN_MODULE)

  const post = await campaignModuleService.retrieveCampaignPost(id)

  res.json({ campaign_post: post })
}

export async function PATCH(req: MedusaRequest, res: MedusaResponse) {
  const { id } = req.params

  const campaignModuleService: CampaignModuleService =
    req.scope.resolve(CAMPAIGN_MODULE)

  const body = await zodValidator(UpdateCampaignPostSchema, req.body)
  const existing = await campaignModuleService.retrieveCampaignPost(id)
  const translations = mergeCampaignPostTranslations(
    existing,
    body.translations as CampaignPostTranslations | undefined,
    body
  )
  const localizedFields = legacyFieldsFromVietnameseTranslation(translations)

  const post = await campaignModuleService.updateCampaignPosts({
    id,
    ...body,
    title: localizedFields.title ?? existing.title,
    content: localizedFields.content
      ? normalizeTiptapImageUrls(localizedFields.content)
      : existing.content,
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
    thumbnail: body.thumbnail === undefined ? undefined : toRelativeMediaUrl(body.thumbnail),
    source: localizedFields.source ?? null,
    seo_title: localizedFields.seo_title ?? null,
    seo_description: localizedFields.seo_description ?? null,
    seo_keywords: localizedFields.seo_keywords ?? null,
    publish_at:
      body.publish_at === undefined
        ? undefined
        : body.publish_at
          ? new Date(body.publish_at)
          : null,
    unpublish_at:
      body.unpublish_at === undefined
        ? undefined
        : body.unpublish_at
          ? new Date(body.unpublish_at)
          : null,
  })

  res.json({ campaign_post: post })
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const { id } = req.params

  const campaignModuleService: CampaignModuleService =
    req.scope.resolve(CAMPAIGN_MODULE)

  await campaignModuleService.deleteCampaignPosts(id)

  res.status(200).json({
    id,
    object: "campaign_post",
    deleted: true,
  })
}

import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "zod"
import { zodValidator } from "../../utils/zod-validator"
import { SITE_SETTINGS_MODULE } from "../../../modules/site-settings"
import type SiteSettingsModuleService from "../../../modules/site-settings/service"
import {
  normalizeTiptapImageUrls,
  toRelativeMediaUrl,
} from "../../utils/media-url"

const UpdateSiteSettingsSchema = z.object({
  store_name: z.string().nullable().optional(),
  email: z
    .union([z.string().email(), z.literal(""), z.null()])
    .optional()
    .transform((value) => (value === "" || value === undefined ? null : value)),
  phone: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  google_map_url: z.string().nullable().optional(),
  open_hours: z.string().nullable().optional(),
  facebook_url: z.string().nullable().optional(),
  zalo_url: z.string().nullable().optional(),
  instagram_url: z.string().nullable().optional(),
  hero_images: z.array(z.string()).max(2).optional(),
  about_title: z.string().nullable().optional(),
  about_thumbnail: z.string().nullable().optional(),
  about_content: z.record(z.string(), z.unknown()).nullable().optional(),
  about_collection_id: z.string().nullable().optional(),
})

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const service: SiteSettingsModuleService =
    req.scope.resolve(SITE_SETTINGS_MODULE)

  const settings = await service.getSingleton()

  res.json({ site_settings: settings })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const service: SiteSettingsModuleService =
    req.scope.resolve(SITE_SETTINGS_MODULE)

  const body = await zodValidator(UpdateSiteSettingsSchema, req.body)

  const data: Record<string, unknown> = { ...body }
  if (body.hero_images) {
    data.hero_images = body.hero_images
      .map((url) => toRelativeMediaUrl(url))
      .filter(Boolean)
  }
  if ("about_thumbnail" in body) {
    data.about_thumbnail = toRelativeMediaUrl(body.about_thumbnail)
  }
  if (body.about_content) {
    data.about_content = normalizeTiptapImageUrls(
      body.about_content as Record<string, unknown>
    )
  }

  const settings = await service.updateSingleton(data)

  res.json({ site_settings: settings })
}

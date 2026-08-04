import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { SITE_SETTINGS_MODULE } from "../../../modules/site-settings"
import type SiteSettingsModuleService from "../../../modules/site-settings/service"
import {
  getCachedAsync,
  setCached,
  setPublicCacheHeaders,
  STORE_CACHE_TTL,
} from "../../../lib/store-cache"
import { toStoreSiteSettings } from "../../../lib/store-dto"

const CACHE_KEY = "store:site-settings"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const cached = await getCachedAsync<{ site_settings: unknown }>(CACHE_KEY)
  if (cached) {
    setPublicCacheHeaders(res, 60)
    res.json(cached)
    return
  }

  const service: SiteSettingsModuleService =
    req.scope.resolve(SITE_SETTINGS_MODULE)

  const settings = await service.getSingleton()
  const payload = {
    site_settings: toStoreSiteSettings(settings as Record<string, unknown>),
  }

  setCached(CACHE_KEY, payload, STORE_CACHE_TTL.siteSettings)
  setPublicCacheHeaders(res, 60)
  res.json(payload)
}

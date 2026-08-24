import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { SITE_SETTINGS_MODULE } from "../../../modules/site-settings"
import type SiteSettingsModuleService from "../../../modules/site-settings/service"
import {
  resolveSiteSettingTranslation,
  type SiteSettingLocale,
} from "../../../modules/site-settings/translations"

const requestedLocale = (value: unknown): SiteSettingLocale =>
  value === "en" ? "en" : "vi"

/**
 * GET /store/site-settings?lang=vi|en
 *
 * The localized brand copy stored in `translations` is flattened onto the
 * response as `tagline`/`description` for the requested locale (same
 * convention as /store/campaign-posts), so the storefront never has to know
 * the fallback rules.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const service: SiteSettingsModuleService =
    req.scope.resolve(SITE_SETTINGS_MODULE)

  const settings = await service.getSingleton()
  const locale = requestedLocale(req.query.lang)

  res.json({
    site_settings: settings
      ? { ...settings, ...resolveSiteSettingTranslation(settings, locale) }
      : settings,
  })
}

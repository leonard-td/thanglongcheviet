import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { SITE_SETTINGS_MODULE } from "../../../modules/site-settings"

export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
) {
  const siteSettingsService = req.scope.resolve(SITE_SETTINGS_MODULE)
  
  const settings = await siteSettingsService.listSiteSettings()
  
  // Transform array into an object mapping key -> value
  const formattedSettings = settings.reduce((acc, setting) => {
    acc[setting.key] = setting.value
    return acc
  }, {})

  res.json({
    site_settings: formattedSettings,
  })
}

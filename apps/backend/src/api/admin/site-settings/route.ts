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

export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
) {
  const siteSettingsService = req.scope.resolve(SITE_SETTINGS_MODULE)
  const { settings } = req.body as { settings: Record<string, any> }
  
  if (!settings || typeof settings !== 'object') {
    res.status(400).json({ message: "Invalid settings payload" })
    return
  }

  // settings is an object of key -> value. We need to update or create each one.
  for (const [key, value] of Object.entries(settings)) {
    // Check if it exists
    const existing = await siteSettingsService.listSiteSettings({ key })
    
    if (existing.length > 0) {
      await siteSettingsService.updateSiteSettings({
        id: existing[0].id,
        value,
      })
    } else {
      await siteSettingsService.createSiteSettings({
        key,
        value,
      })
    }
  }

  const updatedSettings = await siteSettingsService.listSiteSettings()
  const formattedSettings = updatedSettings.reduce((acc, setting) => {
    acc[setting.key] = setting.value
    return acc
  }, {})

  res.json({
    site_settings: formattedSettings,
  })
}

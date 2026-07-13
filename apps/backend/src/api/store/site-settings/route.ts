import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { SITE_SETTINGS_MODULE } from "../../../modules/site-settings"
import type SiteSettingsModuleService from "../../../modules/site-settings/service"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const service: SiteSettingsModuleService =
    req.scope.resolve(SITE_SETTINGS_MODULE)

  const settings = await service.getSingleton()

  res.json({ site_settings: settings })
}

import { MedusaService } from "@medusajs/framework/utils"
import SiteSetting from "./models/site-setting"

/**
 * Site-wide storefront settings. The table holds exactly one row —
 * getSingleton lazily creates it so callers never deal with the empty state.
 */
class SiteSettingsModuleService extends MedusaService({
  SiteSetting,
}) {
  async getSingleton() {
    const [existing] = await this.listSiteSettings({}, { take: 1 })
    if (existing) {
      return existing
    }
    // DB column is NOT NULL DEFAULT '[]' — omit/null fails Mikro create.
    return await this.createSiteSettings({ hero_images: [] })
  }

  async updateSingleton(data: Record<string, unknown>) {
    const current = await this.getSingleton()
    return await this.updateSiteSettings({ id: current.id, ...data })
  }
}

export default SiteSettingsModuleService

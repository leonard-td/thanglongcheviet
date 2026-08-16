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
      // CSV restore / legacy rows may leave hero_images NULL; Medusa rejects that on read.
      if (existing.hero_images == null) {
        return await this.updateSiteSettings({
          id: existing.id,
          hero_images: [] as unknown as Record<string, unknown>,
        })
      }
      return existing
    }
    return await this.createSiteSettings({
      hero_images: [] as unknown as Record<string, unknown>,
    })
  }

  async updateSingleton(data: Record<string, unknown>) {
    const current = await this.getSingleton()
    return await this.updateSiteSettings({ id: current.id, ...data })
  }
}

export default SiteSettingsModuleService

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
    try {
      return await this.createSiteSettings({})
    } catch (error) {
      const candidate = error as {
        code?: string
        cause?: { code?: string }
      }
      if (
        candidate.code === "23505" ||
        candidate.cause?.code === "23505"
      ) {
        const [createdByConcurrentRequest] = await this.listSiteSettings(
          {},
          { take: 1 }
        )
        if (createdByConcurrentRequest) return createdByConcurrentRequest
      }
      throw error
    }
  }

  async updateSingleton(data: Record<string, unknown>) {
    const current = await this.getSingleton()
    return await this.updateSiteSettings({ id: current.id, ...data })
  }
}

export default SiteSettingsModuleService

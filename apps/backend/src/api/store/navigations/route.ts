import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { NAVIGATION_MODULE } from "../../../modules/navigation"
import type NavigationModuleService from "../../../modules/navigation/service"

/**
 * GET /store/navigations — tree of the currently active menu template.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const service: NavigationModuleService = req.scope.resolve(NAVIGATION_MODULE)

  const active = await service.getActiveMenu()
  if (!active) {
    return res.json({ menu: null, navigations: [] })
  }

  const tree = await service.getMenuTree(active.id, { activeOnly: true })
  res.json({
    menu: { id: active.id, name: active.name, slug: active.slug },
    navigations: tree,
  })
}

import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { NAVIGATION_MODULE } from "../../../../../modules/navigation"
import type NavigationModuleService from "../../../../../modules/navigation/service"

/**
 * POST /admin/navigation-menus/:id/activate
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const service: NavigationModuleService = req.scope.resolve(NAVIGATION_MODULE)
  const menu = await service.setActiveMenu(req.params.id)
  res.json({ menu })
}

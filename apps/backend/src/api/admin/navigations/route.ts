import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { NAVIGATION_MODULE } from "../../../modules/navigation"
import { invalidateStoreCache } from "../../../lib/store-cache"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const navigationModuleService = req.scope.resolve(NAVIGATION_MODULE)
  const items = await navigationModuleService.listNavigationItems({}, {
    take: 100,
    order: { order: "ASC" },
  })
  res.json({ navigations: items })
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const navigationModuleService = req.scope.resolve(NAVIGATION_MODULE)
  const item = await navigationModuleService.createNavigationItems(req.body)
  invalidateStoreCache("store:")
  res.json({ navigation: item })
}

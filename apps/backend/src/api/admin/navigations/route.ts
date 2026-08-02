import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { NAVIGATION_MODULE } from "../../../modules/navigation"
import type NavigationModuleService from "../../../modules/navigation/service"

type CreateNavigationItemInput = {
  label: string
  url: string
  order?: number
  openInNewTab?: boolean
  parent_id?: string | null
  is_active?: boolean
}

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const navigationModuleService = req.scope.resolve<NavigationModuleService>(NAVIGATION_MODULE)
  const items = await navigationModuleService.listNavigationItems({}, {
    take: 1000,
    order: { order: "ASC" },
  })
  res.json({ navigations: items })
}

export const POST = async (
  req: MedusaRequest<CreateNavigationItemInput>,
  res: MedusaResponse
) => {
  const navigationModuleService = req.scope.resolve<NavigationModuleService>(NAVIGATION_MODULE)
  const item = await navigationModuleService.createNavigationItems(req.body)
  res.json({ navigation: item })
}

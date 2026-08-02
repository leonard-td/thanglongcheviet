import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { NAVIGATION_MODULE } from "../../../../modules/navigation"
import type NavigationModuleService from "../../../../modules/navigation/service"

type UpdateNavigationItemInput = {
  label?: string
  url?: string
  order?: number
  openInNewTab?: boolean
  parent_id?: string | null
  is_active?: boolean
}

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const navigationModuleService = req.scope.resolve<NavigationModuleService>(NAVIGATION_MODULE)
  const item = await navigationModuleService.retrieveNavigationItem(req.params.id)
  res.json({ navigation: item })
}

export const PUT = async (
  req: MedusaRequest<UpdateNavigationItemInput>,
  res: MedusaResponse
) => {
  const navigationModuleService = req.scope.resolve<NavigationModuleService>(NAVIGATION_MODULE)
  const item = await navigationModuleService.updateNavigationItems({
    id: req.params.id,
    ...req.body,
  })
  res.json({ navigation: item })
}

export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  const navigationModuleService = req.scope.resolve<NavigationModuleService>(NAVIGATION_MODULE)
  await navigationModuleService.deleteNavigationItems(req.params.id)
  res.json({ id: req.params.id, deleted: true })
}

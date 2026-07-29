import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { NAVIGATION_MODULE } from "../../../../modules/navigation"
import type NavigationModuleService from "../../../../modules/navigation/service"
import {
  UpdateNavigationItemSchema,
  validateNavigationInput,
  validateParent,
} from "../validation"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const navigationModuleService: NavigationModuleService =
    req.scope.resolve(NAVIGATION_MODULE)
  const item = await navigationModuleService.retrieveNavigationItem(req.params.id)
  res.json({ navigation: item })
}

export const PUT = async (
  req: MedusaRequest,
  res: MedusaResponse
) => {
  const navigationModuleService: NavigationModuleService =
    req.scope.resolve(NAVIGATION_MODULE)
  const body = validateNavigationInput(UpdateNavigationItemSchema, req.body)

  await validateParent(navigationModuleService, body.parent_id, req.params.id)

  const item = await navigationModuleService.updateNavigationItems({
    ...body,
    id: req.params.id,
  })
  res.json({ navigation: item })
}

export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  const navigationModuleService: NavigationModuleService =
    req.scope.resolve(NAVIGATION_MODULE)
  await navigationModuleService.deleteNavigationItems(req.params.id)
  res.json({ id: req.params.id, deleted: true })
}

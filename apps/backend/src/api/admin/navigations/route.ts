import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { NAVIGATION_MODULE } from "../../../modules/navigation"
import type NavigationModuleService from "../../../modules/navigation/service"
import {
  CreateNavigationItemSchema,
  validateNavigationInput,
  validateParent,
} from "./validation"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const navigationModuleService: NavigationModuleService =
    req.scope.resolve(NAVIGATION_MODULE)
  const items = await navigationModuleService.listNavigationItems({}, {
    take: 1000,
    order: { order: "ASC" },
  })
  res.json({ navigations: items })
}

export const POST = async (
  req: MedusaRequest,
  res: MedusaResponse
) => {
  const navigationModuleService: NavigationModuleService =
    req.scope.resolve(NAVIGATION_MODULE)
  const body = validateNavigationInput(CreateNavigationItemSchema, req.body)

  await validateParent(navigationModuleService, body.parent_id)

  const item = await navigationModuleService.createNavigationItems(body)
  res.json({ navigation: item })
}

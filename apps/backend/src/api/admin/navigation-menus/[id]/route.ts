import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { z } from "zod"
import { zodValidator } from "../../../utils/zod-validator"
import { NAVIGATION_MODULE } from "../../../../modules/navigation"
import type NavigationModuleService from "../../../../modules/navigation/service"

const UpdateMenuSchema = z.object({
  name: z.string().min(1).optional(),
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .optional(),
})

/**
 * GET /admin/navigation-menus/:id
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const service: NavigationModuleService = req.scope.resolve(NAVIGATION_MODULE)
  const menu = await service.retrieveNavigationMenu(req.params.id)
  const tree = await service.getMenuTree(req.params.id)
  res.json({ menu, tree })
}

/**
 * POST /admin/navigation-menus/:id — rename / update slug
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const service: NavigationModuleService = req.scope.resolve(NAVIGATION_MODULE)
  const body = await zodValidator(UpdateMenuSchema, req.body)

  if (body.slug) {
    const existing = await service.listNavigationMenus(
      { slug: body.slug },
      { take: 1 }
    )
    if (existing.length && existing[0].id !== req.params.id) {
      throw new MedusaError(
        MedusaError.Types.DUPLICATE_ERROR,
        `Menu with slug "${body.slug}" already exists`
      )
    }
  }

  const menu = await service.updateNavigationMenus({
    id: req.params.id,
    ...body,
  })

  res.json({ menu })
}

/**
 * DELETE /admin/navigation-menus/:id
 */
export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const service: NavigationModuleService = req.scope.resolve(NAVIGATION_MODULE)
  const menu = await service.retrieveNavigationMenu(req.params.id)

  if (menu.is_active) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "Cannot delete the active menu. Activate another menu first."
    )
  }

  const items = await service.listItemsByMenu(req.params.id)
  if (items.length) {
    await service.deleteNavigationItems(items.map((item) => item.id))
  }

  await service.deleteNavigationMenus(req.params.id)

  res.json({ id: req.params.id, object: "navigation_menu", deleted: true })
}

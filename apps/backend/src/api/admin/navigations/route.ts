import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { z } from "zod"
import { zodValidator } from "../../utils/zod-validator"
import { attachNavThumbnails } from "../../utils/nav-thumbnails"
import { NAVIGATION_MODULE } from "../../../modules/navigation"
import type NavigationModuleService from "../../../modules/navigation/service"

const CreateItemSchema = z.object({
  menu_id: z.string().min(1),
  label: z.string().min(1),
  url: z.string().min(1),
  order: z.number().int().optional(),
  openInNewTab: z.boolean().optional().default(false),
  parent_id: z.string().nullable().optional(),
  is_active: z.boolean().optional().default(true),
  thumbnail: z.string().nullable().optional(),
  icon: z.string().nullable().optional(),
  display_mode: z.enum(["none", "icon", "image"]).optional().default("none"),
})

/**
 * GET /admin/navigations?menu_id=...
 * Returns tree for the menu (flat list also available via ?flat=1).
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const service: NavigationModuleService = req.scope.resolve(NAVIGATION_MODULE)
  const menuId =
    typeof req.query.menu_id === "string" ? req.query.menu_id : undefined
  const flat = req.query.flat === "1" || req.query.flat === "true"

  if (!menuId) {
    // Backward-compatible: return items of the active menu as a tree.
    const active = await service.getActiveMenu()
    if (!active) {
      return res.json({ menu: null, navigations: [], tree: [] })
    }
    const tree = await attachNavThumbnails(
      req.scope,
      await service.getMenuTree(active.id)
    )
    return res.json({
      menu: active,
      navigations: tree,
      tree,
    })
  }

  await service.retrieveNavigationMenu(menuId)

  if (flat) {
    const items = await attachNavThumbnails(
      req.scope,
      await service.listItemsByMenu(menuId)
    )
    return res.json({ navigations: items })
  }

  const tree = await attachNavThumbnails(req.scope, await service.getMenuTree(menuId))
  res.json({ navigations: tree, tree })
}

/**
 * POST /admin/navigations — create item (requires menu_id).
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const service: NavigationModuleService = req.scope.resolve(NAVIGATION_MODULE)
  const body = await zodValidator(CreateItemSchema, req.body)

  await service.retrieveNavigationMenu(body.menu_id)
  await service.assertValidParent(body.menu_id, body.parent_id ?? null)

  let order = body.order
  if (order === undefined) {
    const siblings = await service.listNavigationItems(
      {
        menu_id: body.menu_id,
        parent_id: body.parent_id ?? null,
      },
      { take: 1000 }
    )
    order =
      siblings.reduce(
        (max, item) => Math.max(max, (item as { order?: number }).order ?? 0),
        -1
      ) + 1
  }

  const item = await service.createNavigationItems({
    menu_id: body.menu_id,
    label: body.label,
    url: body.url,
    order,
    openInNewTab: body.openInNewTab,
    parent_id: body.parent_id ?? null,
    is_active: body.is_active,
    thumbnail: body.thumbnail ?? null,
    icon: body.icon ?? null,
    display_mode: body.display_mode,
  })

  res.status(201).json({ navigation: item })
}

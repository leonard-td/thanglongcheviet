import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "zod"
import { zodValidator } from "../../../utils/zod-validator"
import { attachNavThumbnails } from "../../../utils/nav-thumbnails"
import { NAVIGATION_MODULE } from "../../../../modules/navigation"
import type NavigationModuleService from "../../../../modules/navigation/service"

const UpdateItemSchema = z.object({
  label: z.string().min(1).optional(),
  url: z.string().min(1).optional(),
  order: z.number().int().optional(),
  openInNewTab: z.boolean().optional(),
  parent_id: z.string().nullable().optional(),
  is_active: z.boolean().optional(),
  thumbnail: z.string().nullable().optional(),
  icon: z.string().nullable().optional(),
  display_mode: z.enum(["none", "icon", "image"]).optional(),
})

/**
 * GET /admin/navigations/:id
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const service: NavigationModuleService = req.scope.resolve(NAVIGATION_MODULE)
  const item = await service.retrieveNavigationItem(req.params.id)
  const [withThumbnail] = await attachNavThumbnails(req.scope, [item])
  res.json({ navigation: withThumbnail })
}

/**
 * PUT /admin/navigations/:id
 */
export async function PUT(req: MedusaRequest, res: MedusaResponse) {
  const service: NavigationModuleService = req.scope.resolve(NAVIGATION_MODULE)
  const body = await zodValidator(UpdateItemSchema, req.body)
  const existing = (await service.retrieveNavigationItem(
    req.params.id
  )) as unknown as { id: string; menu_id: string }

  if (body.parent_id !== undefined) {
    await service.assertValidParent(
      existing.menu_id,
      body.parent_id,
      existing.id
    )
  }

  const item = await service.updateNavigationItems({
    id: req.params.id,
    ...body,
  })
  const [withThumbnail] = await attachNavThumbnails(req.scope, [item])

  res.json({ navigation: withThumbnail })
}

/**
 * DELETE /admin/navigations/:id — also deletes direct children.
 */
export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const service: NavigationModuleService = req.scope.resolve(NAVIGATION_MODULE)
  await service.retrieveNavigationItem(req.params.id)

  const children = await service.listNavigationItems(
    { parent_id: req.params.id },
    { take: 500 }
  )

  if (children.length) {
    await service.deleteNavigationItems(children.map((child) => child.id))
  }

  await service.deleteNavigationItems(req.params.id)

  res.json({ id: req.params.id, deleted: true })
}

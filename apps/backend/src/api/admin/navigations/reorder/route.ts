import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "zod"
import { NAVIGATION_MODULE } from "../../../../modules/navigation"
import type NavigationModuleService from "../../../../modules/navigation/service"

const ReorderSchema = z.object({
  menu_id: z.string().min(1),
  items: z
    .array(
      z.object({
        id: z.string().min(1),
        parent_id: z.string().nullable(),
        order: z.number().int(),
      })
    )
    .min(1),
})

/**
 * POST /admin/navigations/reorder — bulk update parent_id + order (DnD).
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const service: NavigationModuleService = req.scope.resolve(NAVIGATION_MODULE)
  const body = ReorderSchema.parse(req.body)

  const tree = await service.reorderItems(body.menu_id, body.items)
  res.json({ tree, navigations: tree })
}

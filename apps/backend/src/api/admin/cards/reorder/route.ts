import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "zod"
import { zodValidator } from "../../../utils/zod-validator"
import { CARD_MODULE } from "../../../../modules/card"
import type CardModuleService from "../../../../modules/card/service"

const ReorderSchema = z.object({
  items: z.array(z.object({ id: z.string(), rank: z.number().int() })).min(1),
})

/**
 * POST /admin/cards/reorder
 *
 * Bulk-assigns rank for a drag-reordered list in one call. Applies to every
 * card regardless of locked — reordering a fixed widget's position is
 * allowed, only deleting/editing its content is not.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const cardModuleService: CardModuleService = req.scope.resolve(CARD_MODULE)

  const { items } = await zodValidator(ReorderSchema, req.body)

  await cardModuleService.updateCards(
    items.map(({ id, rank }) => ({ id, rank })),
  )

  const cards = await cardModuleService.listCards({}, { order: { rank: "ASC" } })

  res.json({ cards })
}

import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "zod"
import { zodValidator } from "@medusajs/framework/zod"
import { CARD_MODULE } from "../../../../modules/card"
import type CardModuleService from "../../../../modules/card/service"

const BulkDeleteSchema = z.object({
  ids: z.array(z.string()).min(1).max(500),
})

/**
 * POST /admin/cards/bulk-delete
 *
 * Deletes many cards at once. Locked cards (contact/map/promotions) are
 * never deletable — same rule as DELETE /admin/cards/:id — so any locked id
 * in the request is silently skipped rather than failing the whole batch.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const cardModuleService: CardModuleService = req.scope.resolve(CARD_MODULE)
  const { ids } = await zodValidator(, req.body)

  const cards = await cardModuleService.listCards({ id: ids })
  const byId = new Map(cards.map((c) => [c.id, c]))

  const deletableIds = ids.filter((id) => byId.get(id) && !byId.get(id)!.locked)
  const skipped = ids.length - deletableIds.length

  if (deletableIds.length) {
    await cardModuleService.deleteCards(deletableIds)
  }

  const remaining = await cardModuleService.listCards({}, { order: { rank: "ASC" } })

  res.json({ deleted: deletableIds.length, skipped, cards: remaining })
}

import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MedusaError } from "@medusajs/framework/utils"
import { z } from "zod"
import { zodValidator } from "../../../utils/zod-validator"
import { CARD_MODULE } from "../../../../modules/card"
import type CardModuleService from "../../../../modules/card/service"
import { toRelativeMediaUrl } from "../../../utils/media-url"

const UpdateCardSchema = z.object({
  title: z.record(z.string(), z.string()).optional(),
  image: z.string().nullable().optional(),
  path: z.string().nullable().optional(),
  is_active: z.boolean().optional(),
  rank: z.number().int().optional(),
})

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const { id } = req.params
  const cardModuleService: CardModuleService = req.scope.resolve(CARD_MODULE)

  const card = await cardModuleService.retrieveCard(id)

  res.json({ card })
}

/**
 * PATCH /admin/cards/:id
 *
 * Locked cards (contact/map/promotions) can only have their display order
 * or visibility changed — title/image/path/type are fixed at the storefront
 * widget level, so those fields are silently dropped rather than erroring
 * (keeps the same edit form usable for both card kinds).
 */
export async function PATCH(req: MedusaRequest, res: MedusaResponse) {
  const { id } = req.params
  const cardModuleService: CardModuleService = req.scope.resolve(CARD_MODULE)

  const existing = await cardModuleService.retrieveCard(id)
  const body = await zodValidator(UpdateCardSchema, req.body)

  // Mikro-ORM rejects explicit `undefined` values on a known property, so
  // only forward keys the caller actually sent — and for locked cards, drop
  // everything except rank/is_active regardless of what was sent.
  const allowedKeys = existing.locked
    ? (["rank", "is_active"] as const)
    : (["title", "image", "path", "is_active", "rank"] as const)

  const patch: Record<string, unknown> = {}
  for (const key of allowedKeys) {
    if (body[key] !== undefined) patch[key] = body[key]
  }
  if (patch.image !== undefined) {
    patch.image = toRelativeMediaUrl(patch.image as string | null)
  }

  const card = await cardModuleService.updateCards({ id, ...patch })

  res.json({ card })
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const { id } = req.params
  const cardModuleService: CardModuleService = req.scope.resolve(CARD_MODULE)

  const existing = await cardModuleService.retrieveCard(id)
  if (existing.locked) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "This card is fixed and cannot be deleted"
    )
  }

  await cardModuleService.deleteCards(id)

  res.json({ id, object: "card", deleted: true })
}

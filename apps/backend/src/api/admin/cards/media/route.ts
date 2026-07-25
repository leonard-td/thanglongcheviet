import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "zod"
import { zodValidator } from "@medusajs/framework/zod"
import { CARD_MODULE } from "../../../../modules/card"
import type CardModuleService from "../../../../modules/card/service"
import { toRelativeMediaUrl } from "../../../utils/media-url"

const RecordMediaSchema = z.object({
  url: z.string().min(1),
  filename: z.string().nullable().optional(),
})

/**
 * GET /admin/cards/media
 *
 * The "already uploaded images" library for the card thumbnail picker.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const cardModuleService: CardModuleService = req.scope.resolve(CARD_MODULE)

  const media = await cardModuleService.listCardMedias(
    {},
    { order: { created_at: "DESC" }, take: 200 }
  )

  res.json({ media })
}

/**
 * POST /admin/cards/media
 *
 * Records a file the admin just uploaded via sdk.admin.upload.create (which
 * hits Medusa's own /admin/uploads route) so it shows up in the library on
 * future visits, even after it stops being any card's current image.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const cardModuleService: CardModuleService = req.scope.resolve(CARD_MODULE)

  const body = await zodValidator(RecordMediaSchema, req.body)
  const url = toRelativeMediaUrl(body.url)!

  const existing = await cardModuleService.listCardMedias({ url }, { take: 1 })
  if (existing.length) {
    res.status(201).json({ media: existing[0] })
    return
  }

  const media = await cardModuleService.createCardMedias({
    url,
    filename: body.filename ?? null,
  })

  res.status(201).json({ media })
}

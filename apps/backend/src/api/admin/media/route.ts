import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "zod"
import { zodValidator } from "../../utils/zod-validator"
import { CARD_MODULE } from "../../../modules/card"
import type CardModuleService from "../../../modules/card/service"
import { toRelativeMediaUrl } from "../../utils/media-url"

const RecordMediaSchema = z.object({
  url: z.string().min(1),
  filename: z.string().nullable().optional(),
  folder_id: z.string().nullable().optional(),
})

/**
 * GET /admin/media?folder_id=<id|root>
 *
 * The full media library. Without ?folder_id returns everything; ?folder_id=root
 * returns only unfiled media (folder_id IS NULL); any other value filters to
 * that folder.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const cardModuleService: CardModuleService = req.scope.resolve(CARD_MODULE)

  const folderParam = typeof req.query.folder_id === "string" ? req.query.folder_id : undefined
  const filters: Record<string, unknown> = {}
  if (folderParam === "root") filters.folder_id = null
  else if (folderParam) filters.folder_id = folderParam

  const [media, count] = await cardModuleService.listAndCountCardMedias(
    filters,
    { order: { created_at: "DESC" }, take: 500 }
  )

  res.json({ media, count })
}

/**
 * POST /admin/media
 *
 * Records an uploaded file into the library (same dedupe-by-url behavior as
 * POST /admin/cards/media, plus an optional target folder).
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
    folder_id: body.folder_id ?? null,
  })

  res.status(201).json({ media })
}

import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "zod"
import { zodValidator } from "@medusajs/framework"
import { CARD_MODULE } from "../../../../modules/card"
import type CardModuleService from "../../../../modules/card/service"
import { toRelativeMediaUrl } from "../../../utils/media-url"

const ImportRowSchema = z.object({
  id: z.string().optional(),
  title_vi: z.string().optional(),
  title_en: z.string().optional(),
  image: z.string().nullable().optional(),
  path: z.string().nullable().optional(),
  is_active: z.boolean().optional(),
})

const ImportSchema = z.object({
  items: z.array(ImportRowSchema).min(1).max(500),
})

/**
 * POST /admin/cards/import
 *
 * Bulk create/update from an already-normalized row list (the admin UI
 * parses JSON/CSV/TSV client-side into this shape before posting). A row
 * updates an existing card when its `id` matches one already in the
 * database, otherwise it creates a new type="link" card — matching the
 * single-card routes, `type`/`locked`/`rank` are never settable from import
 * data: created cards are always unlocked links, and locked cards only ever
 * get `is_active` touched, never their content.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const cardModuleService: CardModuleService = req.scope.resolve(CARD_MODULE)
  const { items } = await zodValidator(ImportSchema, req.body)

  const existingCards = await cardModuleService.listCards({})
  const byId = new Map(existingCards.map((c) => [c.id, c]))
  let nextRank = existingCards.reduce((max, c) => Math.max(max, c.rank), -1) + 1

  let created = 0
  let updated = 0
  let skipped = 0
  const errors: string[] = []

  for (let index = 0; index < items.length; index++) {
    const row = items[index]
    const existing = row.id ? byId.get(row.id) : undefined

    if (existing) {
      const patch: Record<string, unknown> = { id: existing.id }
      if (row.is_active !== undefined) patch.is_active = row.is_active

      if (!existing.locked) {
        if (row.title_vi !== undefined || row.title_en !== undefined) {
          const vi = row.title_vi ?? existing.title?.vi ?? ""
          const en = row.title_en ?? existing.title?.en ?? vi
          patch.title = { vi, en }
        }
        if (row.image !== undefined) patch.image = toRelativeMediaUrl(row.image)
        if (row.path !== undefined) patch.path = row.path
      }

      await cardModuleService.updateCards(patch)
      updated++
      continue
    }

    const titleVi = row.title_vi?.trim()
    const titleEn = row.title_en?.trim()
    if (!titleVi && !titleEn) {
      skipped++
      errors.push(`Dòng ${index + 1}: thiếu tiêu đề, đã bỏ qua`)
      continue
    }

    await cardModuleService.createCards({
      type: "link",
      title: { vi: titleVi || titleEn!, en: titleEn || titleVi! },
      image: toRelativeMediaUrl(row.image),
      path: row.path ?? null,
      is_active: row.is_active ?? true,
      locked: false,
      rank: nextRank++,
    })
    created++
  }

  const cards = await cardModuleService.listCards({}, { order: { rank: "ASC" } })

  res.json({ created, updated, skipped, errors, cards })
}

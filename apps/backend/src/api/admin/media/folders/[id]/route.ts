import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "zod"
import { zodValidator } from "@medusajs/framework"
import { CARD_MODULE } from "../../../../../modules/card"
import type CardModuleService from "../../../../../modules/card/service"

const RenameFolderSchema = z.object({
  name: z.string().trim().min(1).max(100),
})

export async function PATCH(req: MedusaRequest, res: MedusaResponse) {
  const { id } = req.params
  const cardModuleService: CardModuleService = req.scope.resolve(CARD_MODULE)

  const body = await zodValidator(RenameFolderSchema, req.body)

  const folder = await cardModuleService.updateMediaFolders({ id, name: body.name })

  res.json({ folder })
}

/**
 * DELETE /admin/media/folders/:id
 *
 * Deleting a folder never deletes its images — they're moved back to the
 * library root first (folder_id = null), then the folder itself is removed.
 */
export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const { id } = req.params
  const cardModuleService: CardModuleService = req.scope.resolve(CARD_MODULE)

  await cardModuleService.retrieveMediaFolder(id)

  const contents = await cardModuleService.listCardMedias({ folder_id: id })
  if (contents.length) {
    await cardModuleService.updateCardMedias(
      contents.map((m) => ({ id: m.id, folder_id: null }))
    )
  }

  await cardModuleService.deleteMediaFolders(id)

  res.json({ id, object: "media_folder", deleted: true, moved_to_root: contents.length })
}

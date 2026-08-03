import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import type { IFileModuleService } from "@medusajs/framework/types"
import { z } from "zod"
import { zodValidator } from "../../../utils/zod-validator"
import { CARD_MODULE } from "../../../../modules/card"
import type CardModuleService from "../../../../modules/card/service"

const UpdateMediaSchema = z.object({
  folder_id: z.string().nullable(),
})

/**
 * PATCH /admin/media/:id — move the image to another folder (null = root).
 */
export async function PATCH(req: MedusaRequest, res: MedusaResponse) {
  const { id } = req.params
  const cardModuleService: CardModuleService = req.scope.resolve(CARD_MODULE)

  const body = await zodValidator(UpdateMediaSchema, req.body)

  if (body.folder_id) {
    // 404s if the target folder doesn't exist, instead of silently filing
    // the image under a dangling id.
    await cardModuleService.retrieveMediaFolder(body.folder_id)
  }

  const media = await cardModuleService.updateCardMedias({ id, folder_id: body.folder_id })

  res.json({ media })
}

/**
 * DELETE /admin/media/:id
 *
 * Removes the library record and best-effort deletes the underlying file via
 * the file module (only for files served from our own /static/ storage —
 * external URLs recorded via paste have no file to delete). Usage checks are
 * the caller's job: the admin UI always shows the usage warning modal first
 * (GET /admin/media/:id/usage), but the API itself doesn't block deletion.
 */
export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const { id } = req.params
  const cardModuleService: CardModuleService = req.scope.resolve(CARD_MODULE)

  const media = await cardModuleService.retrieveCardMedia(id)

  await cardModuleService.deleteCardMedias(id)

  let fileDeleted = false
  const fileKey = media.url.split("/static/")[1]
  if (fileKey) {
    try {
      const fileModule: IFileModuleService = req.scope.resolve(Modules.FILE)
      await fileModule.deleteFiles([decodeURIComponent(fileKey)])
      fileDeleted = true
    } catch {
      // Record removal already succeeded; a missing physical file (already
      // gone, or a permission hiccup) shouldn't fail the request.
    }
  }

  res.json({ id, object: "media", deleted: true, file_deleted: fileDeleted })
}

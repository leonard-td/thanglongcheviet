import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "zod"
import { zodValidator } from "../../../utils/zod-validator"
import { CARD_MODULE } from "../../../../modules/card"
import type CardModuleService from "../../../../modules/card/service"

const CreateFolderSchema = z.object({
  name: z.string().trim().min(1).max(100),
})

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const cardModuleService: CardModuleService = req.scope.resolve(CARD_MODULE)

  const folders = await cardModuleService.listMediaFolders(
    {},
    { order: { name: "ASC" } }
  )

  res.json({ folders })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const cardModuleService: CardModuleService = req.scope.resolve(CARD_MODULE)

  const body = await zodValidator(CreateFolderSchema, req.body)

  const folder = await cardModuleService.createMediaFolders({ name: body.name })

  res.status(201).json({ folder })
}

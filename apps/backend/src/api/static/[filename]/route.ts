import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import fsp from "node:fs/promises"
import {
  ensurePrivateExportsMigrated,
  migratePrivateExportsFromStaticSync,
} from "../../../lib/private-exports/migrate"
import { resolvePrivateExportFile } from "../../../lib/private-exports/paths"

migratePrivateExportsFromStaticSync()

/**
 * GET /static/:filename
 *
 * Serves Medusa private file exports (order CSVs) after admin authentication.
 * Public uploads continue to be served by express.static when present in
 * `static/`; private exports live in `.private-exports/` instead.
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const { filename } = req.params

  if (!filename.startsWith("private-")) {
    res.status(404).end()
    return
  }

  await ensurePrivateExportsMigrated()

  const filePath = resolvePrivateExportFile(filename)
  if (!filePath) {
    res.status(400).json({
      code: "invalid_name",
      message: "Invalid private export file name",
    })
    return
  }

  try {
    await fsp.access(filePath)
  } catch {
    res.status(404).json({
      code: "not_found",
      message: "Private export file not found",
    })
    return
  }

  res.download(filePath)
}

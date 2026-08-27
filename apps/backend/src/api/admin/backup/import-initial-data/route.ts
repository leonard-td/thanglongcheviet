import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import fsp from "node:fs/promises"
import { importInitialDataFromFile } from "../../../../lib/backup/initial-data"
import { JobRunningError, startJob } from "../../../../lib/backup/jobs"

// POST /admin/backup/import-initial-data — seed from an uploaded seed-data
// JSON file (multipart field "file", via multer in middlewares.ts), running
// the unchanged `initial-data-seed.ts` script. Takes an automatic full
// backup first, same pre_import_backup pattern as content JSON import.
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const uploaded = (req as MedusaRequest & { file?: Express.Multer.File }).file
  if (!uploaded) {
    res.status(400).json({
      code: "invalid_request",
      message: "Upload a JSON file in the file field",
    })
    return
  }

  const jsonPath = uploaded.path
  try {
    const job = startJob("import-initial-data", async (setStep) => {
      try {
        const result = await importInitialDataFromFile(req.scope, jsonPath, setStep)
        return { pre_restore_file: result.preRestoreFile }
      } finally {
        await fsp.rm(jsonPath, { force: true }).catch(() => {})
      }
    })
    res.status(202).json({ job })
  } catch (e) {
    await fsp.rm(jsonPath, { force: true }).catch(() => {})
    if (e instanceof JobRunningError) {
      res.status(409).json({ code: "job_running", message: e.message })
      return
    }
    throw e
  }
}

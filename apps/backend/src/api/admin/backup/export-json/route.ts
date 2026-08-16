import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { exportContentJson } from "../../../../lib/content-export/export-json"
import { getLastJob, JobRunningError, startJob } from "../../../../lib/backup/jobs"

type ExportJsonBody = {
  tables?: string[]
}

// POST /admin/backup/export-json — export selected tables to JSON
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const { tables } = (req.body ?? {}) as ExportJsonBody
  if (!Array.isArray(tables) || !tables.length) {
    res.status(400).json({
      code: "invalid_request",
      message: "Provide a non-empty tables array",
    })
    return
  }

  try {
    const job = startJob("export-json", async (setStep) => {
      const result = await exportContentJson(tables, setStep)
      return {
        file_name: result.fileName,
        warns_no_media_files: result.warns_no_media_files,
      }
    })
    res.status(202).json({ job })
  } catch (e) {
    if (e instanceof JobRunningError) {
      res.status(409).json({ code: "job_running", message: e.message })
      return
    }
    throw e
  }
}

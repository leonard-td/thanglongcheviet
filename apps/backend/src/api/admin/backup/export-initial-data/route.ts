import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { exportInitialDataToFile } from "../../../../lib/backup/initial-data"
import { JobRunningError, startJob } from "../../../../lib/backup/jobs"

// POST /admin/backup/export-initial-data — export seed data (store, region,
// shipping, products, content, menu) as JSON, using the same logic as
// `export-initial-data.ts`.
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const job = startJob("export-initial-data", async (setStep) => {
      const result = await exportInitialDataToFile(req.scope, setStep)
      return { file_name: result.fileName }
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

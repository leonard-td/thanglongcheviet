import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import fsp from "node:fs/promises"
import path from "node:path"
import { JobRunningError, startJob } from "../../../../lib/backup/jobs"
import { BACKUP_DIR, BACKUP_NAME_RE } from "../../../../lib/backup/paths"
import { restoreBackup } from "../../../../lib/backup/restore"

// POST /admin/backup/restore — nhận multipart (field "file", qua multer trong
// middlewares.ts) HOẶC JSON { file_name } trỏ tới một backup có sẵn trên
// server. Khởi động job restore, trả 202 + job để poll.
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const uploaded = (req as MedusaRequest & { file?: Express.Multer.File }).file

  let zipPath: string
  let cleanupUpload = false
  if (uploaded) {
    zipPath = uploaded.path
    cleanupUpload = true
  } else {
    const { file_name } = (req.body ?? {}) as { file_name?: string }
    if (!file_name || !BACKUP_NAME_RE.test(file_name)) {
      res.status(400).json({
        code: "invalid_request",
        message: "Provide a backup file upload or a valid file_name",
      })
      return
    }
    zipPath = path.join(BACKUP_DIR, file_name)
    try {
      await fsp.access(zipPath)
    } catch {
      res.status(404).json({ code: "not_found", message: "Backup file not found" })
      return
    }
  }

  try {
    const job = startJob("restore", async (setStep) => {
      try {
        const result = await restoreBackup(zipPath, setStep)
        return { pre_restore_file: result.preRestoreFile }
      } finally {
        if (cleanupUpload) {
          await fsp.rm(zipPath, { force: true }).catch(() => {})
        }
      }
    })
    res.status(202).json({ job })
  } catch (e) {
    if (cleanupUpload) {
      await fsp.rm(zipPath, { force: true }).catch(() => {})
    }
    if (e instanceof JobRunningError) {
      res.status(409).json({ code: "job_running", message: e.message })
      return
    }
    throw e
  }
}

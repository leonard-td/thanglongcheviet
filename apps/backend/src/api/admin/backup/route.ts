import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import fsp from "node:fs/promises"
import path from "node:path"
import { createBackup } from "../../../lib/backup/create"
import { getLastJob, JobRunningError, startJob } from "../../../lib/backup/jobs"
import { BACKUP_DIR } from "../../../lib/backup/paths"

// GET /admin/backup — danh sách file backup + trạng thái job hiện tại
// (admin UI poll endpoint này trong lúc job chạy)
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  await fsp.mkdir(BACKUP_DIR, { recursive: true })
  const entries = await fsp.readdir(BACKUP_DIR, { withFileTypes: true })
  const backups: { file_name: string; size: number; created_at: string }[] = []
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".zip")) continue
    const stat = await fsp.stat(path.join(BACKUP_DIR, entry.name))
    backups.push({
      file_name: entry.name,
      size: stat.size,
      created_at: stat.mtime.toISOString(),
    })
  }
  backups.sort((a, b) => b.created_at.localeCompare(a.created_at))
  res.json({ backups, job: getLastJob() })
}

// POST /admin/backup — khởi động job tạo backup, trả 202 + job để poll
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  try {
    const job = startJob("backup", async (setStep) => {
      const result = await createBackup("backup", setStep)
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

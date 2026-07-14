import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import fsp from "node:fs/promises"
import path from "node:path"
import { getLastJob } from "../../../../../lib/backup/jobs"
import { BACKUP_DIR, BACKUP_NAME_RE } from "../../../../../lib/backup/paths"

// Tên file đến từ URL — bắt buộc khớp whitelist để không thoát ra ngoài
// BACKUP_DIR (path traversal).
function resolveBackupFile(name: string): string | null {
  if (!BACKUP_NAME_RE.test(name)) return null
  return path.join(BACKUP_DIR, name)
}

// GET /admin/backup/files/:name — tải file backup về máy
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const filePath = resolveBackupFile(req.params.name)
  if (!filePath) {
    res.status(400).json({ code: "invalid_name", message: "Invalid backup file name" })
    return
  }
  try {
    await fsp.access(filePath)
  } catch {
    res.status(404).json({ code: "not_found", message: "Backup file not found" })
    return
  }
  res.download(filePath)
}

// DELETE /admin/backup/files/:name — xóa file backup trên server
export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  const filePath = resolveBackupFile(req.params.name)
  if (!filePath) {
    res.status(400).json({ code: "invalid_name", message: "Invalid backup file name" })
    return
  }
  if (getLastJob()?.status === "running") {
    // job đang chạy có thể đang đọc/ghi đúng file này
    res.status(409).json({ code: "job_running", message: "A backup/restore job is running" })
    return
  }
  try {
    await fsp.rm(filePath)
  } catch {
    res.status(404).json({ code: "not_found", message: "Backup file not found" })
    return
  }
  res.json({ deleted: true, file_name: req.params.name })
}

import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import fsp from "node:fs/promises"
import { importContentJson } from "../../../../lib/content-export/import-json"
import type { ContentImportMode } from "../../../../lib/content-export/schema"
import { JobRunningError, startJob } from "../../../../lib/backup/jobs"

function parseTablesField(raw: unknown): string[] | null {
  if (Array.isArray(raw)) return raw.map(String)
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) return parsed.map(String)
    } catch {
      return raw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    }
  }
  return null
}

// POST /admin/backup/import-json — import JSON (multipart file + tables + mode)
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const uploaded = (req as MedusaRequest & { file?: Express.Multer.File }).file
  if (!uploaded) {
    res.status(400).json({
      code: "invalid_request",
      message: "Upload a JSON file in the file field",
    })
    return
  }

  const body = req.body as Record<string, unknown>
  const tables = parseTablesField(body.tables)
  const mode = body.mode as ContentImportMode | undefined

  if (!tables?.length) {
    await fsp.rm(uploaded.path, { force: true }).catch(() => {})
    res.status(400).json({
      code: "invalid_request",
      message: "Provide tables (JSON array or comma-separated)",
    })
    return
  }

  if (mode !== "merge" && mode !== "replace") {
    await fsp.rm(uploaded.path, { force: true }).catch(() => {})
    res.status(400).json({
      code: "invalid_request",
      message: 'mode must be "merge" or "replace"',
    })
    return
  }

  const jsonPath = uploaded.path
  try {
    const job = startJob("import-json", async (setStep) => {
      try {
        const result = await importContentJson(jsonPath, tables, mode, setStep)
        return {
          pre_restore_file: result.preRestoreFile,
          imported_tables: result.imported_tables,
          mode: result.mode,
          skipped_blocked: result.skipped_blocked,
          expanded_for_replace: result.expanded_for_replace,
        }
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

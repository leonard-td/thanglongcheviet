import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import path from "node:path"
import fs from "node:fs/promises"
import { CARD_MODULE } from "../../../../modules/card"
import type CardModuleService from "../../../../modules/card/service"

const ALLOWED_EXT = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".gif",
  ".svg",
  ".avif",
])

const IGNORED_BASENAMES = new Set([
  // Admin branding asset (served from /static but not part of the media library)
  "branding-favicon.png",
])

function encodeUrlPath(p: string): string {
  return p
    .split("/")
    .filter(Boolean)
    .map((seg) => encodeURIComponent(seg))
    .join("/")
}

async function walkFiles(dirAbs: string, rootAbs: string): Promise<string[]> {
  const out: string[] = []
  const entries = await fs.readdir(dirAbs, { withFileTypes: true })
  for (const ent of entries) {
    // ignore hidden files/dirs
    if (ent.name.startsWith(".")) continue
    const abs = path.join(dirAbs, ent.name)
    if (ent.isDirectory()) {
      out.push(...await walkFiles(abs, rootAbs))
      continue
    }
    if (!ent.isFile()) continue
    const rel = path.relative(rootAbs, abs)
    // Guard: never allow escaping the root directory.
    if (rel.startsWith("..")) continue
    out.push(rel)
  }
  return out
}

async function resolveStaticDirAbs(): Promise<string | null> {
  const candidates = [
    path.resolve(process.cwd(), "static"),
    path.resolve(process.cwd(), "apps/backend/static"),
  ]

  for (const p of candidates) {
    try {
      const st = await fs.stat(p)
      if (st.isDirectory()) return p
    } catch {
      // try next
    }
  }

  return null
}

/**
 * POST /admin/media/scan
 *
 * Scans the local file storage directory (upload_dir = "static") and imports
 * any image files that exist on disk but are missing from the media library DB.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const cardModuleService: CardModuleService = req.scope.resolve(CARD_MODULE)

  const staticDirAbs = await resolveStaticDirAbs()
  if (!staticDirAbs) {
    const candidates = [
      path.resolve(process.cwd(), "static"),
      path.resolve(process.cwd(), "apps/backend/static"),
    ]
    res.status(404).json({
      message: "Static directory not found",
      candidates,
      scanned_files: 0,
      scanned_images: 0,
      existing_db: 0,
      missing_db: 0,
      imported: 0,
      skipped_non_images: 0,
      errors: candidates.map((p) => `missing_static_dir:${p}`),
    })
    return
  }

  // --- collect all existing media URLs --------------------------------------
  const existingUrls = new Set<string>()
  const take = 1000
  let skip = 0
  let total = 0
  do {
    const [rows, count] = await cardModuleService.listAndCountCardMedias(
      {},
      { take, skip }
    )
    total = count
    for (const m of rows) existingUrls.add(m.url)
    skip += rows.length
  } while (skip < total)

  // --- scan filesystem -------------------------------------------------------
  const relPaths = await walkFiles(staticDirAbs, staticDirAbs)
  const candidates: Array<{ url: string; filename: string }> = []
  let imageCount = 0
  let skipped = 0
  for (const rel of relPaths) {
    if (IGNORED_BASENAMES.has(path.basename(rel))) {
      skipped++
      continue
    }
    const ext = path.extname(rel).toLowerCase()
    if (!ALLOWED_EXT.has(ext)) {
      skipped++
      continue
    }

    imageCount++
    const relPosix = rel.split(path.sep).join("/")
    const url = `/static/${encodeUrlPath(relPosix)}`
    if (existingUrls.has(url)) continue

    candidates.push({
      url,
      filename: path.basename(relPosix),
    })
  }

  // --- import in chunks ------------------------------------------------------
  const errors: string[] = []
  let imported = 0
  const chunkSize = 50
  for (let i = 0; i < candidates.length; i += chunkSize) {
    const chunk = candidates.slice(i, i + chunkSize)
    try {
      await cardModuleService.createCardMedias(
        chunk.map((c) => ({
          url: c.url,
          filename: c.filename,
          folder_id: null,
        }))
      )
      imported += chunk.length
    } catch (e) {
      errors.push(`chunk_failed:${i}:${(e as Error)?.message ?? "unknown"}`)
      // best-effort fallback: try to import one-by-one to salvage the rest
      for (const c of chunk) {
        try {
          await cardModuleService.createCardMedias({
            url: c.url,
            filename: c.filename,
            folder_id: null,
          })
          imported++
        } catch (e2) {
          errors.push(`import_failed:${c.url}:${(e2 as Error)?.message ?? "unknown"}`)
        }
      }
    }
  }

  res.json({
    static_dir: staticDirAbs,
    scanned_files: relPaths.length,
    scanned_images: imageCount,
    existing_db: existingUrls.size,
    missing_db: candidates.length,
    imported,
    skipped_non_images: skipped,
    errors,
  })
}


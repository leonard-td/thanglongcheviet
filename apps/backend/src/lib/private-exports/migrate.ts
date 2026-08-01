import fs from "node:fs"
import fsp from "node:fs/promises"
import path from "node:path"
import { PRIVATE_EXPORTS_DIR, STATIC_DIR } from "./paths"

let migrated = false

/**
 * Medusa's local file provider writes private exports (order CSVs) into the
 * same tree as public uploads. Move any legacy `private-*` files out of
 * `static/` so express.static cannot serve them without authentication.
 */
export function migratePrivateExportsFromStaticSync(): void {
  if (migrated) {
    return
  }
  migrated = true

  fs.mkdirSync(PRIVATE_EXPORTS_DIR, { recursive: true })

  let entries: string[]
  try {
    entries = fs.readdirSync(STATIC_DIR)
  } catch {
    return
  }

  for (const name of entries) {
    if (!name.startsWith("private-")) {
      continue
    }

    const from = path.join(STATIC_DIR, name)
    const to = path.join(PRIVATE_EXPORTS_DIR, name)

    try {
      if (!fs.statSync(from).isFile()) {
        continue
      }
      fs.renameSync(from, to)
      console.warn(
        `[private-exports] Moved ${name} out of public static/ into .private-exports/`
      )
    } catch (error) {
      console.error(
        `[private-exports] Failed to move ${name} out of static/: ${
          error instanceof Error ? error.message : String(error)
        }`
      )
    }
  }
}

export async function ensurePrivateExportsMigrated(): Promise<void> {
  migratePrivateExportsFromStaticSync()
  await fsp.mkdir(PRIVATE_EXPORTS_DIR, { recursive: true })
}

import path from "node:path"

export const STATIC_DIR = path.resolve(process.cwd(), "static")

/** Medusa file-local stores `access: "private"` uploads here (not under /static). */
export const PRIVATE_EXPORTS_DIR = path.resolve(process.cwd(), ".private-exports")

/** Order export CSV keys look like `private-1785550706257-1785550706254-order-exports.csv`. */
export const PRIVATE_EXPORT_FILE_RE = /^private-[0-9]+-[0-9A-Za-z0-9._-]+$/

export function resolvePrivateExportFile(filename: string): string | null {
  if (!PRIVATE_EXPORT_FILE_RE.test(filename)) {
    return null
  }

  const resolved = path.resolve(PRIVATE_EXPORTS_DIR, filename)
  const relative = path.relative(PRIVATE_EXPORTS_DIR, resolved)

  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    return null
  }

  return resolved
}

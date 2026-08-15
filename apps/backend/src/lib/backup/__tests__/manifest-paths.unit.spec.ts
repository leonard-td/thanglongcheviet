import { describe, expect, it } from "@jest/globals"
import path from "node:path"

/** Mirror of restore.ts path guard — keep in sync with validateManifestPaths. */
function resolveManifestPath(root: string, rel: string, label: string): string {
  if (
    rel.includes("\\") ||
    path.posix.isAbsolute(rel) ||
    rel.split("/").some((seg) => seg === ".." || seg === "")
  ) {
    throw new Error(`Unsafe ${label} path in manifest: ${rel}`)
  }
  const abs = path.resolve(root, ...rel.split("/"))
  const rootResolved = path.resolve(root)
  const prefix = rootResolved.endsWith(path.sep)
    ? rootResolved
    : rootResolved + path.sep
  if (abs !== rootResolved && !abs.startsWith(prefix)) {
    throw new Error(`Unsafe ${label} path in manifest: ${rel}`)
  }
  return abs
}

describe("backup manifest path validation", () => {
  const staging = "/tmp/restore-staging"

  it("allows normal relative paths", () => {
    expect(resolveManifestPath(staging, "db/product.csv", "table data")).toBe(
      path.resolve(staging, "db/product.csv")
    )
  })

  it("rejects parent traversal", () => {
    expect(() =>
      resolveManifestPath(staging, "../etc/passwd", "table data")
    ).toThrow(/Unsafe table data path/)
  })

  it("rejects absolute paths", () => {
    expect(() =>
      resolveManifestPath(staging, "/etc/passwd", "static file")
    ).toThrow(/Unsafe static file path/)
  })
})

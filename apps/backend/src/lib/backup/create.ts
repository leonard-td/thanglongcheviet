import { createHash } from "node:crypto"
import fs from "node:fs"
import fsp from "node:fs/promises"
import path from "node:path"
import { pipeline } from "node:stream/promises"
import archiver from "archiver"
import { to as copyTo } from "pg-copy-streams"
import {
  connectDb,
  listColumns,
  listMigrations,
  listSequences,
  listTables,
  quoteIdent,
} from "./db"
import { hashFile, walkFiles } from "./fs-utils"
import type { BackupManifest } from "./manifest"
import { BACKUP_DIR, STATIC_DIR, TMP_DIR } from "./paths"

export type CreateBackupResult = {
  fileName: string
  filePath: string
  manifest: BackupManifest
}

// Tạo bản backup đầy đủ: dump mọi bảng public bằng COPY ... TO STDOUT trong
// MỘT transaction REPEATABLE READ (snapshot nhất quán toàn database tại một
// thời điểm), gom kèm toàn bộ thư mục media static, checksum SHA-256 từng
// file, đóng gói thành zip trong thư mục backups/.
export async function createBackup(
  label: string,
  setStep: (step: string) => void = () => {}
): Promise<CreateBackupResult> {
  const safeLabel = label.toLowerCase().replace(/[^a-z0-9-]+/g, "-") || "backup"
  const stamp = new Date().toISOString().replace(/[:.]/g, "-")
  const name = `${safeLabel}-${stamp}`
  const staging = path.join(TMP_DIR, name)
  const dbDir = path.join(staging, "db")
  await fsp.mkdir(dbDir, { recursive: true })
  await fsp.mkdir(BACKUP_DIR, { recursive: true })

  try {
    setStep("dump_db")
    const client = await connectDb()
    let tables: BackupManifest["tables"]
    let sequences: BackupManifest["sequences"]
    let migrations: string[]
    try {
      await client.query(
        "BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY"
      )
      migrations = await listMigrations(client)
      sequences = await listSequences(client)

      tables = []
      for (const table of await listTables(client)) {
        const columns = await listColumns(client, table)
        // bảng không còn cột thường nào (chỉ generated) — không thể COPY
        if (!columns.length) continue
        const countRes = await client.query(
          `SELECT count(*)::text AS n FROM ${quoteIdent(table)}`
        )
        const file = `db/${table}.csv`
        const dest = path.join(staging, file)
        const hash = createHash("sha256")
        const colList = columns.map(quoteIdent).join(", ")
        const copyStream = client.query(
          copyTo(
            `COPY ${quoteIdent(table)} (${colList}) TO STDOUT (FORMAT csv)`
          )
        )
        copyStream.on("data", (chunk: Buffer) => hash.update(chunk))
        await pipeline(copyStream, fs.createWriteStream(dest))
        tables.push({
          name: table,
          columns,
          row_count: Number(countRes.rows[0].n),
          file,
          sha256: hash.digest("hex"),
        })
      }
      await client.query("COMMIT")
    } catch (e) {
      await client.query("ROLLBACK").catch(() => {})
      throw e
    } finally {
      await client.end()
    }

    setStep("collect_static")
    const staticFiles: BackupManifest["static_files"] = []
    for (const rel of await walkFiles(STATIC_DIR)) {
      const abs = path.join(STATIC_DIR, rel)
      const stat = await fsp.stat(abs)
      staticFiles.push({
        path: rel,
        size: stat.size,
        sha256: await hashFile(abs),
      })
    }

    const manifest: BackupManifest = {
      manifest_version: 1,
      created_at: new Date().toISOString(),
      label: safeLabel,
      migrations,
      tables,
      sequences,
      static_files: staticFiles,
    }

    setStep("zip")
    const fileName = `${name}.zip`
    const filePath = path.join(BACKUP_DIR, fileName)
    const output = fs.createWriteStream(filePath)
    const archive = archiver("zip", { zlib: { level: 6 } })
    const finished = new Promise<void>((resolve, reject) => {
      output.on("close", () => resolve())
      output.on("error", reject)
      archive.on("error", reject)
    })
    archive.pipe(output)
    for (const t of manifest.tables) {
      archive.file(path.join(staging, t.file), { name: t.file })
    }
    for (const f of manifest.static_files) {
      archive.file(path.join(STATIC_DIR, f.path), { name: `static/${f.path}` })
    }
    archive.append(JSON.stringify(manifest, null, 2), { name: "manifest.json" })
    await archive.finalize()
    await finished

    return { fileName, filePath, manifest }
  } finally {
    await fsp.rm(staging, { recursive: true, force: true }).catch(() => {})
  }
}

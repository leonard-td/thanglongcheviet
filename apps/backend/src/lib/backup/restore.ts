import fs from "node:fs"
import fsp from "node:fs/promises"
import path from "node:path"
import { pipeline } from "node:stream/promises"
import unzipper from "unzipper"
import { from as copyFrom } from "pg-copy-streams"
import { createBackup } from "./create"
import {
  connectDb,
  listColumns,
  listMigrations,
  listSequences,
  listTables,
  quoteIdent,
} from "./db"
import { hashFile } from "./fs-utils"
import { manifestSchema, type BackupManifest } from "./manifest"
import { STATIC_DIR, TMP_DIR } from "./paths"

export type RestoreResult = {
  preRestoreFile: string
}

function sameSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false
  const bs = new Set(b)
  return a.every((x) => bs.has(x))
}

// Giải nén zip vào staging, chặn path traversal (entry chứa "..", đường dẫn
// tuyệt đối hoặc backslash đều bị từ chối).
async function extractZip(zipPath: string, staging: string): Promise<void> {
  const dir = await unzipper.Open.file(zipPath)
  for (const entry of dir.files) {
    if (entry.type !== "File") continue
    const rel = entry.path
    if (
      rel.includes("\\") ||
      path.posix.isAbsolute(rel) ||
      rel.split("/").some((seg) => seg === ".." || seg === "")
    ) {
      throw new Error(`Unsafe zip entry path: ${rel}`)
    }
    const dest = path.join(staging, ...rel.split("/"))
    await fsp.mkdir(path.dirname(dest), { recursive: true })
    await pipeline(entry.stream(), fs.createWriteStream(dest))
  }
}

// Toàn vẹn file: mọi entry dữ liệu phải khớp checksum SHA-256 ghi trong
// manifest — file hỏng/thiếu là dừng ngay, trước khi đụng vào bất cứ thứ gì.
async function verifyChecksums(
  staging: string,
  manifest: BackupManifest
): Promise<void> {
  for (const t of manifest.tables) {
    const abs = path.join(staging, ...t.file.split("/"))
    let actual: string
    try {
      actual = await hashFile(abs)
    } catch {
      throw new Error(`Backup is missing table data file: ${t.file}`)
    }
    if (actual !== t.sha256) {
      throw new Error(`Checksum mismatch for ${t.file} — backup file is corrupted`)
    }
  }
  for (const f of manifest.static_files) {
    const abs = path.join(staging, "static", ...f.path.split("/"))
    let actual: string
    try {
      actual = await hashFile(abs)
    } catch {
      throw new Error(`Backup is missing media file: static/${f.path}`)
    }
    if (actual !== f.sha256) {
      throw new Error(
        `Checksum mismatch for static/${f.path} — backup file is corrupted`
      )
    }
  }
}

// Tương thích schema: backup chỉ được restore vào database có ĐÚNG trạng thái
// migrations/bảng/cột như lúc backup. Lệch là từ chối — không đoán, không tự
// migrate, vì restore data-only vào schema khác là mất toàn vẹn âm thầm.
async function verifyCompatibility(manifest: BackupManifest): Promise<void> {
  const client = await connectDb()
  try {
    const migrations = await listMigrations(client)
    if (!sameSet(migrations, manifest.migrations)) {
      throw new Error(
        `Migration state mismatch: backup has ${manifest.migrations.length} migrations, ` +
          `database has ${migrations.length}. Deploy the matching code version before restoring.`
      )
    }
    const tables = await listTables(client)
    const manifestTables = manifest.tables.map((t) => t.name)
    if (!sameSet(tables, manifestTables)) {
      throw new Error(
        "Table list mismatch between backup and current database — backup is from a different schema version."
      )
    }
    for (const t of manifest.tables) {
      const columns = await listColumns(client, t.name)
      if (!sameSet(columns, t.columns)) {
        throw new Error(
          `Column mismatch on table "${t.name}" — backup is from a different schema version.`
        )
      }
    }
  } finally {
    await client.end()
  }
}

// Nạp lại toàn bộ dữ liệu trong MỘT transaction: TRUNCATE + COPY FROM + reset
// sequence rồi mới COMMIT. Bất kỳ lỗi nào → ROLLBACK, database giữ nguyên như
// chưa từng restore. session_replication_role=replica tắt trigger/FK trong
// transaction nên thứ tự nạp bảng không quan trọng.
async function restoreDatabase(
  staging: string,
  manifest: BackupManifest
): Promise<void> {
  const client = await connectDb()
  try {
    await client.query("BEGIN")
    await client.query("SET LOCAL session_replication_role = 'replica'")

    // mikro_orm_migrations đã được xác minh là khớp — không đụng vào nó để
    // trạng thái migration luôn nhất quán với code đang chạy.
    const tables = manifest.tables.filter(
      (t) => t.name !== "mikro_orm_migrations"
    )
    const truncateList = tables.map((t) => quoteIdent(t.name)).join(", ")
    await client.query(`TRUNCATE ${truncateList}`)

    for (const t of tables) {
      const colList = t.columns.map(quoteIdent).join(", ")
      const copyStream = client.query(
        copyFrom(
          `COPY ${quoteIdent(t.name)} (${colList}) FROM STDIN (FORMAT csv)`
        )
      )
      const src = fs.createReadStream(path.join(staging, ...t.file.split("/")))
      await pipeline(src, copyStream)
    }

    const existing = new Set((await listSequences(client)).map((s) => s.name))
    for (const seq of manifest.sequences) {
      if (!existing.has(seq.name)) continue
      if (seq.last_value === null) {
        // sequence chưa từng được dùng — đưa về trạng thái "chưa gọi"
        await client.query(
          `SELECT setval(format('%I', $1::text)::regclass, 1, false)`,
          [seq.name]
        )
      } else {
        await client.query(
          `SELECT setval(format('%I', $1::text)::regclass, $2::bigint, true)`,
          [seq.name, seq.last_value]
        )
      }
    }

    await client.query("COMMIT")
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {})
    throw e
  } finally {
    await client.end()
  }
}

// Hoán đổi nội dung thư mục media. Mọi bước move đều diễn ra BÊN TRONG
// STATIC_DIR (trong prod đây là một Docker volume riêng — rename ra ngoài sẽ
// lỗi EXDEV, và bản thân STATIC_DIR là mount point nên không thể rename chính
// nó). Dữ liệu cũ được giữ trong .old-<timestamp> để còn đường quay lui.
async function swapStatic(staging: string, stamp: string): Promise<void> {
  const stagingStatic = path.join(staging, "static")
  await fsp.mkdir(STATIC_DIR, { recursive: true })

  // copy (không rename — khác volume) media mới vào thư mục tạm trong static
  const restoreTmp = path.join(STATIC_DIR, ".restore-tmp")
  await fsp.rm(restoreTmp, { recursive: true, force: true })
  await fsp.mkdir(restoreTmp, { recursive: true })
  try {
    await fsp.access(stagingStatic)
    await fsp.cp(stagingStatic, restoreTmp, { recursive: true })
  } catch (e: unknown) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e
    // backup không có media — restoreTmp rỗng, static sẽ được dọn trống
  }

  const oldDir = path.join(STATIC_DIR, `.old-${stamp}`)
  await fsp.mkdir(oldDir, { recursive: true })
  const moved: string[] = []
  try {
    for (const entry of await fsp.readdir(STATIC_DIR)) {
      if (entry.startsWith(".")) continue
      await fsp.rename(path.join(STATIC_DIR, entry), path.join(oldDir, entry))
      moved.push(entry)
    }
    for (const entry of await fsp.readdir(restoreTmp)) {
      await fsp.rename(path.join(restoreTmp, entry), path.join(STATIC_DIR, entry))
    }
  } catch (e) {
    // đưa media cũ trở lại chỗ cũ hết mức có thể trước khi báo lỗi
    for (const entry of moved) {
      await fsp
        .rename(path.join(oldDir, entry), path.join(STATIC_DIR, entry))
        .catch(() => {})
    }
    throw e
  }
  await fsp.rm(restoreTmp, { recursive: true, force: true }).catch(() => {})

  // chỉ giữ bản .old-* mới nhất để volume không phình theo số lần restore
  const olds = (await fsp.readdir(STATIC_DIR))
    .filter((n) => n.startsWith(".old-"))
    .sort()
  for (const stale of olds.slice(0, -1)) {
    await fsp
      .rm(path.join(STATIC_DIR, stale), { recursive: true, force: true })
      .catch(() => {})
  }
}

// Quy trình restore đầy đủ — thứ tự các bước là bất biến an toàn:
//   giải nén → checksum → tương thích schema → TỰ ĐỘNG BACKUP HIỆN TRẠNG →
//   restore DB (1 transaction) → hoán đổi media.
// Trước bước backup hiện trạng, chưa có gì bị thay đổi. Sau đó mọi hư hại đều
// quay lui được từ bản pre-restore.
export async function restoreBackup(
  zipPath: string,
  setStep: (step: string) => void = () => {}
): Promise<RestoreResult> {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-")
  const staging = path.join(TMP_DIR, `restore-${stamp}`)
  await fsp.mkdir(staging, { recursive: true })

  try {
    setStep("validate")
    await extractZip(zipPath, staging)
    let manifest: BackupManifest
    try {
      const raw = await fsp.readFile(path.join(staging, "manifest.json"), "utf8")
      manifest = manifestSchema.parse(JSON.parse(raw))
    } catch {
      throw new Error(
        "Invalid backup file: manifest.json is missing or malformed."
      )
    }
    await verifyChecksums(staging, manifest)

    setStep("check_compat")
    await verifyCompatibility(manifest)

    setStep("pre_restore_backup")
    const preRestore = await createBackup("pre-restore")

    setStep("restore_db")
    await restoreDatabase(staging, manifest)

    setStep("restore_static")
    await swapStatic(staging, stamp)

    return { preRestoreFile: preRestore.fileName }
  } finally {
    await fsp.rm(staging, { recursive: true, force: true }).catch(() => {})
  }
}

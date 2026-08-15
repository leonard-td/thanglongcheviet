import fsp from "node:fs/promises"
import path from "node:path"
import {
  assertExportableTables,
  resolveTableMeta,
  selectionIncludesMediaTables,
} from "./table-registry"
import { contentExportSchema, type ContentExportFile } from "./schema"
import {
  connectDb,
  listColumns,
  listMigrations,
  listTables,
  quoteIdent,
} from "../backup/db"
import { BACKUP_DIR } from "../backup/paths"

export type ExportJsonResult = {
  fileName: string
  filePath: string
  manifest: ContentExportFile
  warns_no_media_files: boolean
}

export async function exportContentJson(
  tables: string[],
  setStep: (step: string) => void = () => {}
): Promise<ExportJsonResult> {
  assertExportableTables(tables)

  const client = await connectDb()
  let migrations: string[] = []
  const exportTables: ContentExportFile["tables"] = {}

  try {
    setStep("read_schema")
    const existing = new Set(await listTables(client))
    const unknown = tables.filter((t) => !existing.has(t))
    if (unknown.length) {
      throw new Error(`Unknown tables: ${unknown.join(", ")}`)
    }

    migrations = await listMigrations(client)

    setStep("export_tables")
    await client.query(
      "BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY"
    )

    for (const table of tables) {
      const columns = await listColumns(client, table)
      if (!columns.length) continue

      const colList = columns.map(quoteIdent).join(", ")
      const res = await client.query(
        `SELECT ${colList} FROM ${quoteIdent(table)}`
      )

      exportTables[table] = {
        columns,
        row_count: res.rowCount ?? res.rows.length,
        rows: res.rows.map((row) => ({ ...row })),
      }
    }

    await client.query("COMMIT")
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {})
    throw e
  } finally {
    await client.end()
  }

  setStep("write_json")
  const stamp = new Date().toISOString().replace(/[:.]/g, "-")
  const fileName = `content-export-${stamp}.json`
  await fsp.mkdir(BACKUP_DIR, { recursive: true })
  const filePath = path.join(BACKUP_DIR, fileName)

  const manifest: ContentExportFile = {
    format_version: 1,
    exported_at: new Date().toISOString(),
    label: "content-export",
    migrations,
    tables: exportTables,
  }

  contentExportSchema.parse(manifest)
  await fsp.writeFile(filePath, JSON.stringify(manifest, null, 2), "utf8")

  return {
    fileName,
    filePath,
    manifest,
    warns_no_media_files: selectionIncludesMediaTables(tables),
  }
}

export type TableListItem = {
  name: string
  group: string
  group_label: string
  label: string
  row_count: number
  default_selected: boolean
  default_merge: boolean
  excluded: boolean
  import_blocked: boolean
}

export async function listExportableTables(): Promise<TableListItem[]> {
  const client = await connectDb()
  try {
    const names = await listTables(client)
    const items: TableListItem[] = []

    for (const name of names) {
      const meta = resolveTableMeta(name)
      if (meta.excluded) continue

      const countRes = await client.query(
        `SELECT count(*)::text AS n FROM ${quoteIdent(name)}`
      )
      items.push({
        name: meta.name,
        group: meta.group,
        group_label: meta.group,
        label: meta.label,
        row_count: Number(countRes.rows[0].n),
        default_selected: meta.default_selected,
        default_merge: meta.default_merge,
        excluded: meta.excluded,
        import_blocked: meta.import_blocked,
      })
    }

    items.sort((a, b) => {
      if (a.group !== b.group) return a.group.localeCompare(b.group)
      return a.name.localeCompare(b.name)
    })

    return items
  } finally {
    await client.end()
  }
}

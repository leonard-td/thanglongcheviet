import fsp from "node:fs/promises"
import { createBackup } from "../backup/create"
import {
  connectDb,
  listColumns,
  listTables,
  quoteIdent,
} from "../backup/db"
import {
  expandTablesForReplace,
  filterImportableTables,
  getSkippedBlockedTables,
  sortTablesForImport,
  sortTablesForReplaceTruncate,
} from "./table-registry"
import { contentExportSchema, type ContentImportMode } from "./schema"

export type ImportJsonResult = {
  preRestoreFile: string
  imported_tables: string[]
  mode: ContentImportMode
  skipped_blocked: string[]
  expanded_for_replace: string[]
}

function buildUpsertSql(table: string, columns: string[]): string {
  const quoted = columns.map(quoteIdent)
  const colList = quoted.join(", ")
  const placeholders = columns.map((_, i) => `$${i + 1}`).join(", ")
  const updates = columns
    .filter((c) => c !== "id")
    .map((c) => `${quoteIdent(c)} = EXCLUDED.${quoteIdent(c)}`)
    .join(", ")

  if (!columns.includes("id") || !updates) {
    throw new Error(`Table "${table}" cannot be merged — missing id column.`)
  }

  return `INSERT INTO ${quoteIdent(table)} (${colList}) VALUES (${placeholders})
    ON CONFLICT (${quoteIdent("id")}) DO UPDATE SET ${updates}`
}

function buildInsertSql(table: string, columns: string[]): string {
  const quoted = columns.map(quoteIdent)
  const colList = quoted.join(", ")
  const placeholders = columns.map((_, i) => `$${i + 1}`).join(", ")
  return `INSERT INTO ${quoteIdent(table)} (${colList}) VALUES (${placeholders})`
}

function rowColumnsForImport(
  mode: ContentImportMode,
  columns: string[],
  row: Record<string, unknown>
): string[] {
  if (mode === "merge") {
    return columns.filter((col) =>
      Object.prototype.hasOwnProperty.call(row, col)
    )
  }
  return columns
}

async function validateTableColumns(
  client: Awaited<ReturnType<typeof connectDb>>,
  table: string,
  fileColumns: string[]
): Promise<string[]> {
  const dbColumns = await listColumns(client, table)
  const dbSet = new Set(dbColumns)
  const usable = fileColumns.filter((c) => dbSet.has(c))
  if (!usable.length) {
    throw new Error(`No compatible columns for table "${table}".`)
  }
  return usable
}

export async function importContentJson(
  jsonPath: string,
  selectedTables: string[],
  mode: ContentImportMode,
  setStep: (step: string) => void = () => {}
): Promise<ImportJsonResult> {
  setStep("validate")
  const raw = await fsp.readFile(jsonPath, "utf8")
  const parsed = contentExportSchema.parse(JSON.parse(raw))

  const skippedBlocked = getSkippedBlockedTables(selectedTables)
  const requested = filterImportableTables(selectedTables)
  if (!requested.length) {
    throw new Error("No importable tables selected.")
  }

  const fileTables = Object.keys(parsed.tables)
  let tables = requested.filter((t) => fileTables.includes(t))
  const missing = requested.filter((t) => !fileTables.includes(t))
  if (missing.length) {
    throw new Error(
      `File does not contain data for: ${missing.join(", ")}`
    )
  }

  let expandedForReplace: string[] = []

  const client = await connectDb()
  try {
    const existing = new Set(await listTables(client))
    const unknown = tables.filter((t) => !existing.has(t))
    if (unknown.length) {
      throw new Error(`Unknown tables in database: ${unknown.join(", ")}`)
    }

    if (mode === "replace") {
      const { expanded, added } = expandTablesForReplace(tables, existing)
      const addedMissing = added.filter((t) => !fileTables.includes(t))
      if (addedMissing.length) {
        throw new Error(
          `Replace mode requires full table group in file. Missing: ${addedMissing.join(", ")}`
        )
      }
      tables = expanded.filter((t) => fileTables.includes(t))
      expandedForReplace = added
    }
  } finally {
    await client.end()
  }

  setStep("pre_import_backup")
  const preRestore = await createBackup("pre-import")

  setStep("import_tables")
  const importClient = await connectDb()
  try {
    await importClient.query("BEGIN")
    await importClient.query("SET LOCAL session_replication_role = 'replica'")

    if (mode === "replace") {
      const truncateOrder = sortTablesForReplaceTruncate(tables)
      const truncateList = truncateOrder.map(quoteIdent).join(", ")
      if (truncateList) {
        await importClient.query(`TRUNCATE ${truncateList}`)
      }
    }

    const importOrder = sortTablesForImport(tables)
    for (const table of importOrder) {
      const entry = parsed.tables[table]
      if (!entry) continue
      const columns = await validateTableColumns(
        importClient,
        table,
        entry.columns
      )
      const rows = entry.rows
      if (!rows.length) continue

      for (const row of rows) {
        const importCols = rowColumnsForImport(mode, columns, row)
        if (!importCols.length) continue
        if (mode === "merge" && !importCols.includes("id")) continue

        const sql =
          mode === "merge"
            ? buildUpsertSql(table, importCols)
            : buildInsertSql(table, importCols)
        const values = importCols.map((col) => row[col] ?? null)
        await importClient.query(sql, values)
      }
    }

    await importClient.query("COMMIT")
  } catch (e) {
    await importClient.query("ROLLBACK").catch(() => {})
    throw e
  } finally {
    await importClient.end()
  }

  return {
    preRestoreFile: preRestore.fileName,
    imported_tables: sortTablesForImport(tables),
    mode,
    skipped_blocked: skippedBlocked,
    expanded_for_replace: expandedForReplace,
  }
}

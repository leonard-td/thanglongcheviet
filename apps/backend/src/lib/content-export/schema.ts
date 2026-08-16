import { z } from "zod"

export const contentTableDataSchema = z.object({
  columns: z.array(z.string()),
  row_count: z.number(),
  rows: z.array(z.record(z.string(), z.unknown())),
})

export const contentExportSchema = z.object({
  format_version: z.literal(1),
  exported_at: z.string(),
  label: z.string().optional(),
  migrations: z.array(z.string()).optional(),
  tables: z.record(z.string(), contentTableDataSchema),
})

export type ContentExportFile = z.infer<typeof contentExportSchema>
export type ContentImportMode = "merge" | "replace"

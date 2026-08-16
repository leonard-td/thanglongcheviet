import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  getGroupLabel,
  type TableGroup,
} from "../../../../lib/content-export/table-registry"
import { listExportableTables } from "../../../../lib/content-export/export-json"

// GET /admin/backup/tables — dynamic list of exportable/importable tables
export const GET = async (_req: MedusaRequest, res: MedusaResponse) => {
  const tables = await listExportableTables()
  res.json({
    tables: tables.map((t) => ({
      ...t,
      group_label: getGroupLabel(t.group as TableGroup),
    })),
  })
}

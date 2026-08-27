import fsp from "node:fs/promises"
import path from "node:path"
import type { MedusaContainer } from "@medusajs/framework"
import {
  buildInitialDataPayload,
  collectInitialDataInput,
} from "../../scripts/export-initial-data"
import initialDataSeed from "../../migration-scripts/initial-data-seed"
import { createBackup } from "./create"
import { BACKUP_DIR } from "./paths"

export type ExportInitialDataResult = {
  fileName: string
  filePath: string
}

// Export dữ liệu khởi tạo (store/region/shipping/products/content/menu) ra
// JSON trong BACKUP_DIR — dùng chung buildInitialDataPayload/
// collectInitialDataInput với script CLI export-initial-data.ts, khác biệt
// duy nhất là ghi vào BACKUP_DIR thay vì đường dẫn tuỳ ý qua ExecArgs.
export async function exportInitialDataToFile(
  container: MedusaContainer,
  setStep: (step: string) => void = () => {}
): Promise<ExportInitialDataResult> {
  setStep("read_schema")
  const input = await collectInitialDataInput(container)
  const payload = buildInitialDataPayload(input)

  setStep("write_json")
  const stamp = new Date().toISOString().replace(/[:.]/g, "-")
  const fileName = `initial-data-${stamp}.json`
  await fsp.mkdir(BACKUP_DIR, { recursive: true })
  const filePath = path.join(BACKUP_DIR, fileName)
  await fsp.writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8")

  return { fileName, filePath }
}

export type ImportInitialDataResult = {
  preRestoreFile: string
}

// Seed từ một file JSON đã upload, qua initial_data_seed() không đổi
// (initial-data-seed.ts) — hàm đó tự idempotent theo handle/slug/name. Trước
// khi chạy, luôn tạo một bản backup zip toàn phần để có đường lùi, cùng
// pattern với importContentJson()'s pre_import_backup.
export async function importInitialDataFromFile(
  container: MedusaContainer,
  jsonPath: string,
  setStep: (step: string) => void = () => {}
): Promise<ImportInitialDataResult> {
  setStep("pre_import_backup")
  const preRestore = await createBackup("pre-initial-data-import")

  setStep("seed")
  await initialDataSeed({ container, data: jsonPath })

  return { preRestoreFile: preRestore.fileName }
}

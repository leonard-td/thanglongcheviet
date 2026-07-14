import { z } from "zod"

// manifest.json nằm trong file zip backup — nguồn sự thật để restore xác minh
// tính toàn vẹn (checksum) và tính tương thích (migrations/bảng/cột) trước
// khi đụng vào dữ liệu.
export const manifestSchema = z.object({
  manifest_version: z.literal(1),
  created_at: z.string(),
  label: z.string(),
  migrations: z.array(z.string()),
  tables: z.array(
    z.object({
      name: z.string(),
      columns: z.array(z.string()),
      row_count: z.number(),
      file: z.string(),
      sha256: z.string(),
    })
  ),
  sequences: z.array(
    z.object({
      name: z.string(),
      // last_value là bigint — giữ dạng chuỗi để không mất độ chính xác
      last_value: z.string().nullable(),
    })
  ),
  static_files: z.array(
    z.object({
      path: z.string(),
      size: z.number(),
      sha256: z.string(),
    })
  ),
})

export type BackupManifest = z.infer<typeof manifestSchema>

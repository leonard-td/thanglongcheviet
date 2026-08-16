import path from "node:path"
import fs from "node:fs"

// cwd là apps/backend khi chạy `medusa develop` và .medusa/server khi chạy
// `medusa start` (prod) — cả hai trường hợp static/.backups đều nằm ngay dưới
// cwd, khớp với upload_dir="static" của file-local provider và volume
// backend_static/backend_backups trong docker-compose prod.
// Tên bắt đầu bằng dấu chấm là bắt buộc: file watcher của `medusa develop`
// bỏ qua dot-path (cùng danh sách với node_modules/static/.medusa...) — nếu
// không, mỗi file zip tạo ra sẽ làm dev server tự restart và giết chính job
// backup/restore đang chạy.
export const BACKUP_DIR = path.resolve(process.cwd(), ".backups")
/** Thư mục media mà server đang phục vụ / ghi upload (cwd/static). */
export const STATIC_DIR = path.resolve(process.cwd(), "static")
export const TMP_DIR = path.join(BACKUP_DIR, ".tmp")

/**
 * Mọi thư mục cần quét khi backup. `medusa start` chạy từ `.medusa/server/`
 * nên cwd/static thường trống, trong khi media seed/repo nằm ở
 * `apps/backend/static/` (../../static). Restore vẫn ghi vào STATIC_DIR.
 */
export function resolveStaticSourceDirs(): string[] {
  const dirs = [STATIC_DIR]
  const backendStatic = path.resolve(process.cwd(), "../../static")
  if (backendStatic !== STATIC_DIR) {
    dirs.push(backendStatic)
  }
  const envDir = process.env.MEDUSA_STATIC_DIR?.trim()
  if (envDir) {
    const resolved = path.resolve(envDir)
    if (!dirs.includes(resolved)) {
      dirs.push(resolved)
    }
  }
  return dirs
}

/** Tìm file media theo đường dẫn tương đối trong các thư mục nguồn backup. */
export function resolveStaticFilePath(rel: string): string {
  for (const root of resolveStaticSourceDirs()) {
    const abs = path.join(root, rel)
    try {
      if (fs.existsSync(abs)) {
        return abs
      }
    } catch {
      // ignore
    }
  }
  return path.join(STATIC_DIR, rel)
}

// Tên file backup do hệ thống sinh ra / người dùng chọn khi thao tác qua API
export const BACKUP_NAME_RE = /^[A-Za-z0-9][A-Za-z0-9._-]*\.(zip|json)$/

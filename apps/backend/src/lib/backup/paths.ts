import path from "node:path"

// cwd là apps/backend khi chạy `medusa develop` và .medusa/server khi chạy
// `medusa start` (prod) — cả hai trường hợp static/.backups đều nằm ngay dưới
// cwd, khớp với upload_dir="static" của file-local provider và volume
// backend_static/backend_backups trong docker-compose prod.
// Tên bắt đầu bằng dấu chấm là bắt buộc: file watcher của `medusa develop`
// bỏ qua dot-path (cùng danh sách với node_modules/static/.medusa...) — nếu
// không, mỗi file zip tạo ra sẽ làm dev server tự restart và giết chính job
// backup/restore đang chạy.
export const BACKUP_DIR = path.resolve(process.cwd(), ".backups")
export const STATIC_DIR = path.resolve(process.cwd(), "static")
export const TMP_DIR = path.join(BACKUP_DIR, ".tmp")

// Tên file backup do hệ thống sinh ra / người dùng chọn khi thao tác qua API
export const BACKUP_NAME_RE = /^[A-Za-z0-9][A-Za-z0-9._-]*\.zip$/

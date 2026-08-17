#!/bin/bash

set -e

# =============================================================================
# Database Backup & Restore Script
# Hỗ trợ export/import PostgreSQL dumps và transfer qua SSH
# =============================================================================

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
DUMPS_DIR="${PROJECT_ROOT}/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DB_CONTAINER="tlcv-postgres"

# Load environment
if [ -f "${PROJECT_ROOT}/.env.dev" ]; then
  set -a
  source "${PROJECT_ROOT}/.env.dev"
  set +a
fi

# Database credentials (defaults from docker-compose)
POSTGRES_USER="${POSTGRES_USER:-postgres}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-postgres}"
POSTGRES_DB="${POSTGRES_DB:-medusa}"
POSTGRES_HOST="${POSTGRES_HOST:-postgres}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"

# =============================================================================
# Utility Functions
# =============================================================================

print_header() {
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}$1${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

print_success() {
  echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
  echo -e "${RED}✗ $1${NC}"
}

print_warning() {
  echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
  echo -e "${BLUE}ℹ $1${NC}"
}

ensure_dumps_dir() {
  mkdir -p "$DUMPS_DIR"
  print_success "Đảm bảo thư mục backups tồn tại: $DUMPS_DIR"
}

# =============================================================================
# Export Functions
# =============================================================================

export_dump() {
  local dump_file="$DUMPS_DIR/dump_${POSTGRES_DB}_${TIMESTAMP}.sql"

  print_header "EXPORT DATABASE DUMP"

  ensure_dumps_dir

  print_info "Exporting database: $POSTGRES_DB"
  print_info "Output file: $dump_file"

  # Export from Docker container
  if docker ps | grep -q "$DB_CONTAINER"; then
    print_info "Using Docker container: $DB_CONTAINER"
    docker exec -it "$DB_CONTAINER" pg_dump \
      -U "$POSTGRES_USER" \
      -d "$POSTGRES_DB" \
      --no-password > "$dump_file"
  else
    # Fall back to direct connection
    print_warning "Docker container not found, connecting directly to PostgreSQL"
    PGPASSWORD="$POSTGRES_PASSWORD" pg_dump \
      -h "$POSTGRES_HOST" \
      -U "$POSTGRES_USER" \
      -d "$POSTGRES_DB" \
      -p "$POSTGRES_PORT" > "$dump_file"
  fi

  # Compress if file is large (> 10MB)
  if [ -f "$dump_file" ]; then
    local file_size=$(stat -f%z "$dump_file" 2>/dev/null || stat -c%s "$dump_file" 2>/dev/null)
    if [ "$file_size" -gt 10485760 ]; then
      print_info "File lớn ($((file_size / 1024 / 1024))MB), đang nén..."
      gzip "$dump_file"
      dump_file="${dump_file}.gz"
    fi

    print_success "Export thành công!"
    print_info "Đường dẫn: $dump_file"
    print_info "Kích thước: $(du -h "$dump_file" | cut -f1)"
    echo "$dump_file"
  else
    print_error "Export thất bại!"
    return 1
  fi
}

export_dump_compressed() {
  local dump_file="$DUMPS_DIR/dump_${POSTGRES_DB}_${TIMESTAMP}.sql.gz"

  print_header "EXPORT DATABASE DUMP (COMPRESSED)"

  ensure_dumps_dir

  print_info "Exporting database: $POSTGRES_DB (compressed)"
  print_info "Output file: $dump_file"

  if docker ps | grep -q "$DB_CONTAINER"; then
    print_info "Using Docker container: $DB_CONTAINER"
    docker exec "$DB_CONTAINER" pg_dump \
      -U "$POSTGRES_USER" \
      -d "$POSTGRES_DB" \
      --no-password | gzip > "$dump_file"
  else
    print_warning "Docker container not found, connecting directly to PostgreSQL"
    PGPASSWORD="$POSTGRES_PASSWORD" pg_dump \
      -h "$POSTGRES_HOST" \
      -U "$POSTGRES_USER" \
      -d "$POSTGRES_DB" \
      -p "$POSTGRES_PORT" | gzip > "$dump_file"
  fi

  if [ -f "$dump_file" ]; then
    print_success "Export thành công!"
    print_info "Đường dẫn: $dump_file"
    print_info "Kích thước: $(du -h "$dump_file" | cut -f1)"
    echo "$dump_file"
  else
    print_error "Export thất bại!"
    return 1
  fi
}

# =============================================================================
# Import Functions
# =============================================================================

import_dump() {
  local dump_file="$1"

  if [ -z "$dump_file" ] || [ ! -f "$dump_file" ]; then
    print_error "Dump file không tồn tại: $dump_file"
    return 1
  fi

  print_header "IMPORT DATABASE DUMP"
  print_info "Importing from: $dump_file"

  # Decompress if needed
  local temp_file="$dump_file"
  if [[ "$dump_file" == *.gz ]]; then
    temp_file="${dump_file%.gz}"
    if [ ! -f "$temp_file" ]; then
      print_info "Đang giải nén file..."
      gunzip -c "$dump_file" > "$temp_file"
    fi
  fi

  # Import to Docker container
  if docker ps | grep -q "$DB_CONTAINER"; then
    print_info "Importing vào Docker container: $DB_CONTAINER"
    cat "$temp_file" | docker exec -i "$DB_CONTAINER" psql \
      -U "$POSTGRES_USER" \
      -d "$POSTGRES_DB" \
      --no-password
  else
    # Fall back to direct connection
    print_warning "Docker container not found, connecting directly to PostgreSQL"
    PGPASSWORD="$POSTGRES_PASSWORD" psql \
      -h "$POSTGRES_HOST" \
      -U "$POSTGRES_USER" \
      -d "$POSTGRES_DB" \
      -p "$POSTGRES_PORT" < "$temp_file"
  fi

  if [ $? -eq 0 ]; then
    print_success "Import thành công!"
    [ "$temp_file" != "$dump_file" ] && rm -f "$temp_file"
  else
    print_error "Import thất bại!"
    [ "$temp_file" != "$dump_file" ] && rm -f "$temp_file"
    return 1
  fi
}

# =============================================================================
# SSH Transfer Functions
# =============================================================================

push_dump_ssh() {
  local dump_file="$1"
  local remote_host="$2"
  local remote_path="${3:-.}"

  if [ -z "$dump_file" ] || [ ! -f "$dump_file" ]; then
    print_error "Dump file không tồn tại: $dump_file"
    return 1
  fi

  if [ -z "$remote_host" ]; then
    print_error "Remote host không được chỉ định"
    echo "Cách dùng: $0 push-ssh <dump-file> <user@host> [remote-path]"
    return 1
  fi

  print_header "PUSH DUMP TO REMOTE HOST"
  print_info "Source: $dump_file"
  print_info "Destination: $remote_host:$remote_path"
  print_info "File size: $(du -h "$dump_file" | cut -f1)"

  scp -P 22 "$dump_file" "$remote_host:$remote_path/"

  if [ $? -eq 0 ]; then
    print_success "Upload thành công!"
    print_info "Remote file: $remote_host:$remote_path/$(basename "$dump_file")"
  else
    print_error "Upload thất bại!"
    return 1
  fi
}

pull_dump_ssh() {
  local remote_host="$1"
  local remote_file="$2"

  if [ -z "$remote_host" ] || [ -z "$remote_file" ]; then
    print_error "Remote host hoặc file không được chỉ định"
    echo "Cách dùng: $0 pull-ssh <user@host> <remote-file>"
    return 1
  fi

  local local_file="$DUMPS_DIR/$(basename "$remote_file")"

  print_header "PULL DUMP FROM REMOTE HOST"
  print_info "Source: $remote_host:$remote_file"
  print_info "Destination: $local_file"

  ensure_dumps_dir

  scp -P 22 "$remote_host:$remote_file" "$local_file"

  if [ $? -eq 0 ]; then
    print_success "Download thành công!"
    print_info "Local file: $local_file"
    echo "$local_file"
  else
    print_error "Download thất bại!"
    return 1
  fi
}

# =============================================================================
# Advanced Transfer Functions
# =============================================================================

export_and_push() {
  local remote_host="$1"
  local remote_path="${2:-.}"

  if [ -z "$remote_host" ]; then
    print_error "Remote host không được chỉ định"
    echo "Cách dùng: $0 export-push <user@host> [remote-path]"
    return 1
  fi

  print_header "EXPORT VÀ PUSH DUMP"

  local dump_file=$(export_dump_compressed)

  if [ -z "$dump_file" ]; then
    print_error "Export thất bại!"
    return 1
  fi

  echo ""
  push_dump_ssh "$dump_file" "$remote_host" "$remote_path"
}

pull_and_import() {
  local remote_host="$1"
  local remote_file="$2"

  if [ -z "$remote_host" ] || [ -z "$remote_file" ]; then
    print_error "Remote host hoặc file không được chỉ định"
    echo "Cách dùng: $0 pull-import <user@host> <remote-file>"
    return 1
  fi

  print_header "PULL DUMP VÀ IMPORT"

  local local_file=$(pull_dump_ssh "$remote_host" "$remote_file")

  if [ -z "$local_file" ]; then
    print_error "Pull thất bại!"
    return 1
  fi

  echo ""
  import_dump "$local_file"
}

# =============================================================================
# Listing Functions
# =============================================================================

list_dumps() {
  print_header "DANH SÁCH LOCAL DUMPS"

  ensure_dumps_dir

  if [ ! -d "$DUMPS_DIR" ] || [ -z "$(ls -A "$DUMPS_DIR")" ]; then
    print_warning "Không có dump nào"
    return 0
  fi

  ls -lh "$DUMPS_DIR" | tail -n +2 | awk '{print $9, "(" $5 ")"}'
}

list_remote_dumps() {
  local remote_host="$1"
  local remote_path="${2:-.}"

  if [ -z "$remote_host" ]; then
    print_error "Remote host không được chỉ định"
    echo "Cách dùng: $0 list-remote <user@host> [remote-path]"
    return 1
  fi

  print_header "DANH SÁCH REMOTE DUMPS"
  print_info "Host: $remote_host"
  print_info "Path: $remote_path"

  ssh "$remote_host" "ls -lh $remote_path/*.sql* 2>/dev/null || echo 'Không có dump nào'"
}

# =============================================================================
# Restoration Functions
# =============================================================================

restore_from_dump() {
  local dump_file="$1"

  if [ -z "$dump_file" ] || [ ! -f "$dump_file" ]; then
    print_error "Dump file không tồn tại: $dump_file"
    return 1
  fi

  print_header "RESTORE DATABASE"
  print_warning "Cảnh báo: Thao tác này sẽ ghi đè dữ liệu hiện tại!"

  read -p "Bạn có chắc chắn muốn tiếp tục? (yes/no): " confirm

  if [ "$confirm" != "yes" ]; then
    print_warning "Đã hủy"
    return 1
  fi

  import_dump "$dump_file"
}

# =============================================================================
# Cleanup Functions
# =============================================================================

cleanup_old_dumps() {
  local days="${1:-7}"

  print_header "CLEANUP OLD DUMPS"
  print_info "Xóa dumps cũ hơn $days ngày"

  ensure_dumps_dir

  find "$DUMPS_DIR" -maxdepth 1 -name "dump_*" -mtime "+$days" -type f -delete

  print_success "Cleanup hoàn tất!"
}

# =============================================================================
# Help
# =============================================================================

show_help() {
  cat <<EOF
${BLUE}Database Backup & Restore Script${NC}

${YELLOW}CÁCH DÙNG:${NC}
  $0 <command> [options]

${YELLOW}COMMANDS:${NC}
  export              Export database dump (uncompressed)
  export-gz           Export database dump (compressed with gzip)
  import <file>       Import từ dump file

  push-ssh <file> <user@host> [path]     Push dump đến remote server qua SSH
  pull-ssh <user@host> <file>            Pull dump từ remote server qua SSH

  export-push <user@host> [path]         Export & push to remote (one command)
  pull-import <user@host> <file>         Pull & import from remote (one command)

  list                Danh sách local dumps
  list-remote <user@host> [path]         Danh sách remote dumps

  restore <file>      Restore database từ dump (có confirm)
  cleanup [days]      Xóa dumps cũ hơn N ngày (default: 7)

  help                Hiển thị help

${YELLOW}VÍ DỤ:${NC}
  # Export uncompressed
  $0 export

  # Export compressed
  $0 export-gz

  # Import
  $0 import ./backups/dump_medusa_20240101_120000.sql

  # Push đến remote server
  $0 push-ssh ./backups/dump_medusa_20240101_120000.sql.gz user@example.com /backups

  # Pull từ remote server
  $0 pull-ssh user@example.com /backups/dump_medusa_20240101_120000.sql.gz

  # Export và push cùng lúc
  $0 export-push user@example.com /backups

  # Pull và import cùng lúc
  $0 pull-import user@example.com /backups/dump_medusa_20240101_120000.sql.gz

  # Danh sách dumps
  $0 list
  $0 list-remote user@example.com /backups

  # Cleanup dumps cũ hơn 30 ngày
  $0 cleanup 30

${YELLOW}CÁCH CẤU HÌNH SSH:${NC}
  1. Đảm bảo bạn có SSH key hoặc password authentication
  2. Thêm vào ~/.ssh/config nếu cần:
     Host example.com
         User your-username
         IdentityFile ~/.ssh/id_rsa

${YELLOW}ENVIRONMENT VARIABLES:${NC}
  POSTGRES_USER       (default: postgres)
  POSTGRES_PASSWORD   (default: postgres)
  POSTGRES_DB         (default: medusa)
  POSTGRES_HOST       (default: postgres)
  POSTGRES_PORT       (default: 5432)

EOF
}

# =============================================================================
# Main
# =============================================================================

main() {
  local command="$1"

  case "$command" in
    export)
      export_dump
      ;;
    export-gz)
      export_dump_compressed
      ;;
    import)
      import_dump "$2"
      ;;
    push-ssh)
      push_dump_ssh "$2" "$3" "$4"
      ;;
    pull-ssh)
      pull_dump_ssh "$2" "$3"
      ;;
    export-push)
      export_and_push "$2" "$3"
      ;;
    pull-import)
      pull_and_import "$2" "$3"
      ;;
    list)
      list_dumps
      ;;
    list-remote)
      list_remote_dumps "$2" "$3"
      ;;
    restore)
      restore_from_dump "$2"
      ;;
    cleanup)
      cleanup_old_dumps "$2"
      ;;
    help)
      show_help
      ;;
    *)
      print_error "Lệnh không hợp lệ: $command"
      echo ""
      show_help
      exit 1
      ;;
  esac
}

# Run main function with all arguments
main "$@"

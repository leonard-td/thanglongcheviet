# Script-bk
#!/usr/bin/env bash

# Cách dùng
# Bước 1: Export dữ liệu từ prod
# Chạy trên server prod, ở thư mục repo:
# ```bash
# ./scripts/sync-prod-to-local.sh export /tmp/tlcv-prod-sync.tar.gz
# ```

# Bước 2: Sync dữ liệu với local
# Chạy trên server local, ở thư mục repo:
# ```bash
# ./scripts/sync-prod-to-local.sh import /tmp/tlcv-prod-sync.tar.gz
# ``` 

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

MODE="${1:-help}"
ARCHIVE_PATH="${2:-}"

LOCAL_DOCKER_COMPOSE_FILE="${LOCAL_DOCKER_COMPOSE_FILE:-infra/docker-compose.prod.yml}"
LOCAL_ENV_FILE="${LOCAL_ENV_FILE:-.env}"
LOCAL_DB_NAME="${LOCAL_DB_NAME:-medusa}"
LOCAL_DB_USER="${LOCAL_DB_USER:-postgres}"
LOCAL_DB_PASSWORD="${LOCAL_DB_PASSWORD:-postgres}"

EXPORT_ARCHIVE_PATH="${EXPORT_ARCHIVE_PATH:-}"
SYNC_PATHS="${SYNC_PATHS:-apps/backend/static apps/backend/.backups}"
ALLOW_ACCOUNT_DATA="${ALLOW_ACCOUNT_DATA:-0}"
ACCOUNT_EXCLUDED_TABLES=(
  public.auth_users
  public.auth_user
  public.auth_provider
  public.customer
  public.customer_address
  public.customer_group
  public.customer_group_customer
  public.user
  public.users
  public.user_password
  public.user_token
  public.user_auth
)

load_env_file() {
  local env_file="$1"
  if [[ -f "$env_file" ]]; then
    set -a
    # shellcheck disable=SC1090
    source "$env_file"
    set +a
  fi
}

load_env_file "$REPO_ROOT/.env.prod"
load_env_file "$REPO_ROOT/$LOCAL_ENV_FILE"

LOCAL_DB_NAME="${LOCAL_DB_NAME:-${POSTGRES_DB:-medusa}}"
LOCAL_DB_USER="${LOCAL_DB_USER:-${POSTGRES_USER:-postgres}}"
LOCAL_DB_PASSWORD="${LOCAL_DB_PASSWORD:-${POSTGRES_PASSWORD:-postgres}}"

compose_local() {
  local compose_file="$REPO_ROOT/$LOCAL_DOCKER_COMPOSE_FILE"
  local env_file="$REPO_ROOT/$LOCAL_ENV_FILE"

  if [[ -f "$env_file" ]]; then
    docker compose -f "$compose_file" --env-file "$env_file" "$@"
  else
    docker compose -f "$compose_file" "$@"
  fi
}

compose_prod() {
  local compose_file="$REPO_ROOT/infra/docker-compose.prod.yml"
  local env_file="$REPO_ROOT/.env.prod"

  if [[ -f "$env_file" ]]; then
    docker compose -f "$compose_file" --env-file "$env_file" "$@"
  else
    docker compose -f "$compose_file" "$@"
  fi
}

print_help() {
  cat <<'EOF'
Usage:
  ./scripts/sync-prod-to-local.sh export [archive-path]
    Export DB + configured folders (default: apps/backend/static and apps/backend/.backups) from the CURRENT production environment into a single archive.

  ./scripts/sync-prod-to-local.sh import [archive-path]
    Import the exported archive into the local dockerized database and restore the configured folders.

Examples:
  ./scripts/sync-prod-to-local.sh export /tmp/tlcv-prod-sync.tar.gz
  ./scripts/sync-prod-to-local.sh import /tmp/tlcv-prod-sync.tar.gz
  SYNC_PATHS='apps/backend/static apps/backend/.backups apps/backend/another-folder' ./scripts/sync-prod-to-local.sh export /tmp/tlcv-prod-sync.tar.gz
  ALLOW_ACCOUNT_DATA=1 ./scripts/sync-prod-to-local.sh export /tmp/tlcv-prod-sync.tar.gz

Notes:
  - Step 1 should be run on the production server where the prod stack is running.
  - Step 2 should be run on the local machine where the repo is checked out.
  - Account-related data is excluded by default for security.
  - The archive contains: a sanitized database dump and any configured folders such as static, .backups, or custom directories.
EOF
}

export_data() {
  if ! command -v docker >/dev/null 2>&1; then
    echo "ERROR: docker is required" >&2
    exit 1
  fi

  local target_archive="${1:-}"
  if [[ -z "$target_archive" ]]; then
    target_archive="$REPO_ROOT/.tmp/prod-sync-$(date +%Y%m%d-%H%M%S).tar.gz"
  fi

  if [[ "$target_archive" != /* ]]; then
    target_archive="$REPO_ROOT/$target_archive"
  fi

  mkdir -p "$(dirname "$target_archive")"

  local tmp_dir
  tmp_dir="$(mktemp -d)"
  trap 'rm -rf "$tmp_dir"' RETURN

  echo "==> Step 1/2: exporting production database"
  local dump_cmd=(exec -T postgres pg_dump -U "${POSTGRES_USER:-postgres}" -d "${POSTGRES_DB:-medusa}" --no-owner --no-privileges)
  if [[ "$ALLOW_ACCOUNT_DATA" != "1" ]]; then
    for table in "${ACCOUNT_EXCLUDED_TABLES[@]}"; do
      dump_cmd+=(--exclude-table-data="$table")
    done
  fi
  compose_prod "${dump_cmd[@]}" > "$tmp_dir/db.sql"

  echo "==> Step 1/2: collecting configured folders"
  mkdir -p "$tmp_dir/files"
  local raw_sync_paths="$SYNC_PATHS"
  raw_sync_paths="${raw_sync_paths//,/ }"
  read -r -a sync_paths <<< "$raw_sync_paths"

  for rel_path in "${sync_paths[@]}"; do
    rel_path="${rel_path#./}"
    if [[ -z "$rel_path" ]]; then
      continue
    fi

    local abs_path="$REPO_ROOT/$rel_path"
    if [[ ! -e "$abs_path" ]]; then
      echo "Skipping missing path: $rel_path" >&2
      continue
    fi

    local dest_path="$tmp_dir/files/$rel_path"
    mkdir -p "$(dirname "$dest_path")"
    rm -rf "$dest_path"
    cp -a "$abs_path" "$dest_path"
  done

  local json_sync_paths=""
  for rel_path in "${sync_paths[@]}"; do
    if [[ -n "$json_sync_paths" ]]; then
      json_sync_paths+=', '
    fi
    json_sync_paths+="\"$rel_path\""
  done

  cat > "$tmp_dir/manifest.json" <<EOF
{
  "exported_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "db_name": "${POSTGRES_DB:-medusa}",
  "sync_paths": [$json_sync_paths],
  "account_data_excluded": "$( [[ "$ALLOW_ACCOUNT_DATA" == "1" ]] && echo false || echo true )"
}
EOF

  echo "==> Step 1/2: packaging archive"
  tar -czf "$target_archive" -C "$tmp_dir" .

  echo "Export successful. Archive created at: $target_archive"
}

import_data() {
  if ! command -v docker >/dev/null 2>&1; then
    echo "ERROR: docker is required" >&2
    exit 1
  fi

  local archive_path="${1:-}"
  if [[ -z "$archive_path" ]]; then
    echo "ERROR: provide an archive path" >&2
    exit 1
  fi

  if [[ "$archive_path" != /* ]]; then
    archive_path="$REPO_ROOT/$archive_path"
  fi

  if [[ ! -f "$archive_path" ]]; then
    echo "ERROR: archive not found: $archive_path" >&2
    exit 1
  fi

  local tmp_dir
  tmp_dir="$(mktemp -d)"
  trap 'rm -rf "$tmp_dir"' RETURN

  echo "==> Step 2/2: extracting archive"
  tar -xzf "$archive_path" -C "$tmp_dir"

  local db_dump="$tmp_dir/db.sql"
  if [[ ! -f "$db_dump" ]]; then
    echo "ERROR: archive does not contain db.sql" >&2
    exit 1
  fi

  echo "==> Step 2/2: starting local postgres"
  compose_local up -d postgres

  echo "==> Step 2/2: resetting local database"
  compose_local exec -T postgres sh -c 'dropdb -U "$POSTGRES_USER" --if-exists "$POSTGRES_DB" || true; createdb -U "$POSTGRES_USER" "$POSTGRES_DB"'

  echo "==> Step 2/2: restoring database"
  cat "$db_dump" | compose_local exec -T -e PGPASSWORD="$LOCAL_DB_PASSWORD" postgres psql -U "$LOCAL_DB_USER" -d "$LOCAL_DB_NAME"

  echo "==> Step 2/2: restoring configured folders"
  local raw_sync_paths="$SYNC_PATHS"
  raw_sync_paths="${raw_sync_paths//,/ }"
  read -r -a sync_paths <<< "$raw_sync_paths"

  for rel_path in "${sync_paths[@]}"; do
    rel_path="${rel_path#./}"
    if [[ -z "$rel_path" ]]; then
      continue
    fi

    local src_path="$tmp_dir/files/$rel_path"
    local dest_path="$REPO_ROOT/$rel_path"
    if [[ ! -e "$src_path" ]]; then
      echo "Skipping missing archived path: $rel_path" >&2
      continue
    fi

    mkdir -p "$(dirname "$dest_path")"
    rm -rf "$dest_path"
    cp -a "$src_path" "$dest_path"
  done

  echo "Import successful."
  echo "- Database restored into: $LOCAL_DB_NAME"
  echo "- Configured folders restored from archive"
}

case "$MODE" in
  export)
    export_data "$ARCHIVE_PATH"
    ;;
  import)
    import_data "$ARCHIVE_PATH"
    ;;
  help|-h|--help)
    print_help
    ;;
  *)
    echo "Unknown command: $MODE" >&2
    print_help >&2
    exit 1
    ;;
esac

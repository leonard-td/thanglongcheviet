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

LOCAL_DOCKER_COMPOSE_FILE="${LOCAL_DOCKER_COMPOSE_FILE:-infra/docker-compose.yml}"
LOCAL_ENV_FILE="${LOCAL_ENV_FILE:-.env}"
LOCAL_DB_NAME="${LOCAL_DB_NAME:-medusa}"
LOCAL_DB_USER="${LOCAL_DB_USER:-postgres}"
LOCAL_DB_PASSWORD="${LOCAL_DB_PASSWORD:-postgres}"

EXPORT_ARCHIVE_PATH="${EXPORT_ARCHIVE_PATH:-}"

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
    Export DB + static + backups from the CURRENT production environment into a single archive.

  ./scripts/sync-prod-to-local.sh import [archive-path]
    Import the exported archive into the local dockerized database and sync static files.

Examples:
  ./scripts/sync-prod-to-local.sh export /tmp/tlcv-prod-sync.tar.gz
  ./scripts/sync-prod-to-local.sh import /tmp/tlcv-prod-sync.tar.gz

Notes:
  - Step 1 should be run on the production server where the prod stack is running.
  - Step 2 should be run on the local machine where the repo is checked out.
  - The archive contains: database dump, uploaded media/static, and .backups.
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
  compose_prod exec -T postgres sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --no-owner --no-privileges' > "$tmp_dir/db.sql"

  echo "==> Step 1/2: collecting static files and backups"
  mkdir -p "$tmp_dir/static" "$tmp_dir/.backups"
  local prod_static="$REPO_ROOT/apps/backend/.medusa/server/static"
  local prod_backups="$REPO_ROOT/apps/backend/.medusa/server/.backups"

  if [[ -d "$prod_static" ]]; then
    cp -a "$prod_static/." "$tmp_dir/static/"
  fi

  if [[ -d "$prod_backups" ]]; then
    cp -a "$prod_backups/." "$tmp_dir/.backups/"
  fi

  cat > "$tmp_dir/manifest.json" <<EOF
{
  "exported_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "db_name": "${POSTGRES_DB:-medusa}",
  "static_dir": "apps/backend/.medusa/server/static",
  "backups_dir": "apps/backend/.medusa/server/.backups"
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

  echo "==> Step 2/2: syncing static files"
  local local_static_dir="$REPO_ROOT/apps/backend/static"
  local local_backups_dir="$REPO_ROOT/apps/backend/.backups"
  rm -rf "$local_static_dir"
  mkdir -p "$local_static_dir" "$local_backups_dir"
  if [[ -d "$tmp_dir/static" ]]; then
    cp -a "$tmp_dir/static/." "$local_static_dir/"
  fi
  if [[ -d "$tmp_dir/.backups" ]]; then
    cp -a "$tmp_dir/.backups/." "$local_backups_dir/"
  fi

  echo "Import successful."
  echo "- Database restored into: $LOCAL_DB_NAME"
  echo "- Static files synced to: $local_static_dir"
  echo "- Backups synced to: $local_backups_dir"
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

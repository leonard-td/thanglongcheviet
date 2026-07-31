#!/bin/sh
# =============================================================================
# Restic DB Backup — Dump PostgreSQL → Restic repository
# =============================================================================
# Usage:
#   ./backup.sh              # manual run
#   Called by cron inside the restic-backup container every BACKUP_CRON interval
#
# Environment variables (set in .env.prod or docker-compose):
#   POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB, POSTGRES_HOST
#   RESTIC_REPOSITORY    — e.g. /backups, s3:s3.amazonaws.com/bucket-name, sftp:user@host:/path
#   RESTIC_PASSWORD      — encryption password for the Restic repo
#   AWS_ACCESS_KEY_ID    — (optional, for S3 backend)
#   AWS_SECRET_ACCESS_KEY — (optional, for S3 backend)
#   BACKUP_KEEP_DAILY    — retention: daily snapshots to keep (default: 7)
#   BACKUP_KEEP_WEEKLY   — retention: weekly snapshots to keep (default: 4)
#   BACKUP_KEEP_MONTHLY  — retention: monthly snapshots to keep (default: 6)
# =============================================================================

set -eu

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DUMP_DIR="/tmp/db-dumps"
DUMP_FILE="${DUMP_DIR}/${POSTGRES_DB:-medusa}_${TIMESTAMP}.sql.gz"

BACKUP_KEEP_DAILY="${BACKUP_KEEP_DAILY:-7}"
BACKUP_KEEP_WEEKLY="${BACKUP_KEEP_WEEKLY:-4}"
BACKUP_KEEP_MONTHLY="${BACKUP_KEEP_MONTHLY:-6}"

echo "=== [$(date)] Starting backup ==="

# --- 1. Init restic repo if it doesn't exist ---------------------------------
restic snapshots > /dev/null 2>&1 || {
  echo "Initializing Restic repository at ${RESTIC_REPOSITORY}..."
  restic init
}

# --- 2. Dump PostgreSQL -------------------------------------------------------
mkdir -p "${DUMP_DIR}"
echo "Dumping database '${POSTGRES_DB:-medusa}' from ${POSTGRES_HOST:-postgres}..."

PGPASSWORD="${POSTGRES_PASSWORD}" pg_dump \
  -h "${POSTGRES_HOST:-postgres}" \
  -p "${POSTGRES_PORT:-5432}" \
  -U "${POSTGRES_USER:-postgres}" \
  -d "${POSTGRES_DB:-medusa}" \
  --no-owner \
  --no-acl \
  --clean \
  --if-exists \
  -Fc \
  | gzip > "${DUMP_FILE}"

DUMP_SIZE=$(du -h "${DUMP_FILE}" | cut -f1)
echo "Dump complete: ${DUMP_FILE} (${DUMP_SIZE})"

# --- 3. Backup dump file to Restic repo ----------------------------------------
echo "Backing up to Restic repository..."
restic backup "${DUMP_FILE}" \
  --tag "postgres" \
  --tag "${POSTGRES_DB:-medusa}" \
  --tag "${TIMESTAMP}"

echo "Backup snapshot created successfully."

# --- 4. Prune old snapshots (retention policy) --------------------------------
echo "Applying retention policy (daily=${BACKUP_KEEP_DAILY}, weekly=${BACKUP_KEEP_WEEKLY}, monthly=${BACKUP_KEEP_MONTHLY})..."
restic forget \
  --keep-daily "${BACKUP_KEEP_DAILY}" \
  --keep-weekly "${BACKUP_KEEP_WEEKLY}" \
  --keep-monthly "${BACKUP_KEEP_MONTHLY}" \
  --prune

# --- 5. Cleanup temp dump -----------------------------------------------------
rm -f "${DUMP_FILE}"

echo "=== [$(date)] Backup completed ==="

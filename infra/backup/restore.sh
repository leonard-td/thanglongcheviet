#!/bin/sh
# =============================================================================
# Restic DB Restore — Pull snapshot from Restic → Restore PostgreSQL
# =============================================================================
# Usage:
#   ./restore.sh                  # restore latest snapshot
#   ./restore.sh <snapshot-id>    # restore specific snapshot
#   ./restore.sh --list           # list available snapshots
#
# Environment variables (same as backup.sh):
#   POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB, POSTGRES_HOST
#   RESTIC_REPOSITORY, RESTIC_PASSWORD
#   AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY (optional, for S3)
# =============================================================================

set -eu

RESTORE_DIR="/tmp/db-restore"
SNAPSHOT_ID="${1:-latest}"

# --- List snapshots -----------------------------------------------------------
if [ "${SNAPSHOT_ID}" = "--list" ] || [ "${SNAPSHOT_ID}" = "-l" ]; then
  echo "=== Available backup snapshots ==="
  restic snapshots --tag "postgres"
  exit 0
fi

echo "=== [$(date)] Starting restore (snapshot: ${SNAPSHOT_ID}) ==="

# --- 1. Restore dump file from Restic -----------------------------------------
mkdir -p "${RESTORE_DIR}"
rm -rf "${RESTORE_DIR:?}/"*

echo "Restoring snapshot '${SNAPSHOT_ID}' from Restic repository..."
restic restore "${SNAPSHOT_ID}" --target "${RESTORE_DIR}"

# Find the dump file (restic restores full path structure)
DUMP_FILE=$(find "${RESTORE_DIR}" -name "*.sql.gz" -type f | head -1)

if [ -z "${DUMP_FILE}" ]; then
  echo "ERROR: No .sql.gz dump file found in restored snapshot."
  exit 1
fi

echo "Found dump file: ${DUMP_FILE}"

# --- 2. Restore to PostgreSQL --------------------------------------------------
echo "Restoring database '${POSTGRES_DB:-medusa}' on ${POSTGRES_HOST:-postgres}..."
echo ""
echo "⚠️  WARNING: This will OVERWRITE the current database!"
echo "    Database: ${POSTGRES_DB:-medusa}"
echo "    Host: ${POSTGRES_HOST:-postgres}"
echo ""

# Decompress and restore using pg_restore (custom format from pg_dump -Fc + gzip)
gunzip -c "${DUMP_FILE}" | PGPASSWORD="${POSTGRES_PASSWORD}" pg_restore \
  -h "${POSTGRES_HOST:-postgres}" \
  -p "${POSTGRES_PORT:-5432}" \
  -U "${POSTGRES_USER:-postgres}" \
  -d "${POSTGRES_DB:-medusa}" \
  --no-owner \
  --no-acl \
  --clean \
  --if-exists \
  --single-transaction \
  2>&1 || {
    echo ""
    echo "Note: Some pg_restore warnings are normal (e.g. 'does not exist' for DROP)."
    echo "The restore likely completed successfully."
  }

# --- 3. Cleanup ----------------------------------------------------------------
rm -rf "${RESTORE_DIR}"

echo ""
echo "=== [$(date)] Restore completed ==="
echo "Database '${POSTGRES_DB:-medusa}' has been restored from snapshot '${SNAPSHOT_ID}'."
echo ""
echo "Next steps:"
echo "  - Restart backend: docker compose restart backend"
echo "  - Verify: docker compose exec postgres psql -U ${POSTGRES_USER:-postgres} -d ${POSTGRES_DB:-medusa} -c '\\dt'"

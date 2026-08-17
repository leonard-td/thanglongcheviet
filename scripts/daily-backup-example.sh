#!/bin/bash

# =============================================================================
# Daily Database Backup & Upload Script
# Configure and save as: scripts/daily-backup.sh
# Add to crontab: crontab -e
# 0 2 * * * /path/to/project/scripts/daily-backup.sh
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
LOG_FILE="${PROJECT_ROOT}/backups/daily-backup-$(date +%Y-%m-%d).log"
BACKUP_SCRIPT="${PROJECT_ROOT}/scripts/db-backup.sh"

# Configuration - EDIT THESE VARIABLES
# =============================================================================
# SSH server details for backup upload
BACKUP_SERVER="backupuser@backup.example.com"
REMOTE_BACKUP_PATH="/backups/medusa-production"

# Notification (optional)
NOTIFY_EMAIL="admin@example.com"
KEEP_LOCAL_DAYS=7
KEEP_REMOTE_DAYS=30

# =============================================================================

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Setup logging
{
  echo "========================================="
  echo "🔄 Daily Database Backup"
  echo "========================================="
  echo "Started at: $(date '+%Y-%m-%d %H:%M:%S')"
  echo "Server: $(hostname)"
  echo ""

  # Step 1: Export database
  echo "[1/4] Exporting database..."
  if DUMP_FILE=$(cd "$PROJECT_ROOT" && ./scripts/db-backup.sh export-gz 2>&1); then
    echo "✓ Export successful: $DUMP_FILE"
  else
    echo "✗ Export failed!"
    exit 1
  fi

  echo ""

  # Step 2: Upload to backup server
  echo "[2/4] Uploading to backup server ($BACKUP_SERVER)..."
  if cd "$PROJECT_ROOT" && ./scripts/db-backup.sh push-ssh "$DUMP_FILE" "$BACKUP_SERVER" "$REMOTE_BACKUP_PATH" 2>&1; then
    echo "✓ Upload successful"
  else
    echo "✗ Upload failed!"
    exit 1
  fi

  echo ""

  # Step 3: Cleanup local old backups
  echo "[3/4] Cleaning up local backups (older than $KEEP_LOCAL_DAYS days)..."
  cd "$PROJECT_ROOT"
  ./scripts/db-backup.sh cleanup "$KEEP_LOCAL_DAYS" 2>&1
  echo "✓ Local cleanup complete"

  echo ""

  # Step 4: Cleanup remote old backups (manual for safety)
  echo "[4/4] Remote backup status..."
  echo "To cleanup remote backups older than $KEEP_REMOTE_DAYS days, run manually:"
  echo "  ssh $BACKUP_SERVER 'find $REMOTE_BACKUP_PATH -name \"dump_*\" -mtime +$KEEP_REMOTE_DAYS -delete'"
  echo ""

  # Summary
  echo "========================================="
  echo "✅ Backup completed successfully"
  echo "========================================="
  echo "Ended at: $(date '+%Y-%m-%d %H:%M:%S')"
  echo ""
  echo "Backup file: $DUMP_FILE"
  echo "Remote: $BACKUP_SERVER:$REMOTE_BACKUP_PATH/$(basename "$DUMP_FILE")"
  echo "Local retention: $KEEP_LOCAL_DAYS days"
  echo "Remote retention: $KEEP_REMOTE_DAYS days"

} | tee -a "$LOG_FILE"

# Optional: Send email notification on failure
# Uncomment and configure to enable
#
# if [ $? -ne 0 ]; then
#   echo "Database backup failed on $(hostname)" | \
#   mail -s "❌ Backup Alert: $(hostname)" "$NOTIFY_EMAIL"
# fi

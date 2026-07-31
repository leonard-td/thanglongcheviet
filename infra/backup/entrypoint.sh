#!/bin/sh
# =============================================================================
# Restic backup container entrypoint — runs backup on schedule via cron
# =============================================================================
# BACKUP_CRON: cron expression (default: "0 2 * * *" = 2:00 AM daily)
# =============================================================================

set -eu

BACKUP_CRON="${BACKUP_CRON:-0 2 * * *}"

echo "=== Restic Backup Service ==="
echo "Repository: ${RESTIC_REPOSITORY}"
echo "Schedule:   ${BACKUP_CRON}"
echo "Retention:  daily=${BACKUP_KEEP_DAILY:-7}, weekly=${BACKUP_KEEP_WEEKLY:-4}, monthly=${BACKUP_KEEP_MONTHLY:-6}"
echo ""

# Export all env vars so cron job inherits them
env | grep -E '^(POSTGRES_|RESTIC_|AWS_|BACKUP_|PATH=)' > /etc/environment
echo "PATH=/usr/local/bin:/usr/bin:/bin" >> /etc/environment

# Create cron job
echo "${BACKUP_CRON} . /etc/environment && /scripts/backup.sh >> /var/log/backup.log 2>&1" \
  > /etc/crontabs/root

# Run initial backup on startup (optional — comment out if not desired)
echo "Running initial backup..."
/scripts/backup.sh

# Start cron in foreground
echo "Starting cron scheduler..."
exec crond -f -l 2

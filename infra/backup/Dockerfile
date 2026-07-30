# =============================================================================
# Restic backup container — Alpine + restic + pg_dump (PostgreSQL client)
# =============================================================================

FROM alpine:3.20

# Install restic + PostgreSQL client (for pg_dump/pg_restore)
RUN apk add --no-cache \
    restic \
    postgresql16-client \
    gzip \
    curl \
    tzdata

# Set timezone (adjust as needed)
ENV TZ=Asia/Ho_Chi_Minh

# Copy scripts
COPY backup.sh /scripts/backup.sh
COPY restore.sh /scripts/restore.sh
COPY entrypoint.sh /scripts/entrypoint.sh
RUN chmod +x /scripts/*.sh

# Create log directory
RUN mkdir -p /var/log && touch /var/log/backup.log

# Default: run entrypoint (cron scheduler).
# Override with: docker run <image> /scripts/backup.sh (or any other command)
ENTRYPOINT []
CMD ["/scripts/entrypoint.sh"]

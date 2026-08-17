# Database Backup & Restore Guide

Script quản lý backup/restore PostgreSQL database và transfer qua SSH.

## Cài đặt

Script được lưu tại: `./scripts/db-backup.sh`

```bash
# Làm cho script có quyền execute (nếu cần)
chmod +x ./scripts/db-backup.sh
chmod +x ./scripts/quick-backup.sh
```

## Các Lệnh Cơ Bản

### 1. Export Database

#### Export không nén (uncompressed)
```bash
./scripts/db-backup.sh export
```
- Output: `backups/dump_medusa_YYYYMMDD_HHMMSS.sql`
- Tự động nén nếu file > 10MB

#### Export có nén (compressed)
```bash
./scripts/db-backup.sh export-gz
```
- Output: `backups/dump_medusa_YYYYMMDD_HHMMSS.sql.gz`
- Luôn nén với gzip

#### Quick backup
```bash
./scripts/quick-backup.sh
```
- Shortcut cho `export-gz`

### 2. Import Database

```bash
# Import từ file
./scripts/db-backup.sh import ./backups/dump_medusa_20240101_120000.sql

# Import từ file nén (tự động decompress)
./scripts/db-backup.sh import ./backups/dump_medusa_20240101_120000.sql.gz
```

### 3. SSH Transfer

#### Push dump lên remote server
```bash
# Syntax: push-ssh <local-file> <user@host> [remote-path]
./scripts/db-backup.sh push-ssh ./backups/dump_medusa_20240101_120000.sql.gz user@example.com /backups

# Mặc định lưu tại home directory nếu không chỉ định path
./scripts/db-backup.sh push-ssh ./backups/dump_medusa_20240101_120000.sql.gz user@example.com
```

#### Pull dump từ remote server
```bash
# Syntax: pull-ssh <user@host> <remote-file>
./scripts/db-backup.sh pull-ssh user@example.com /backups/dump_medusa_20240101_120000.sql.gz

# File được lưu tại: backups/dump_medusa_20240101_120000.sql.gz
```

### 4. Export & Push (Combined)

```bash
# Export database và push lên remote cùng lúc
# Syntax: export-push <user@host> [remote-path]
./scripts/db-backup.sh export-push user@example.com /backups

# Mặc định push vào home directory
./scripts/db-backup.sh export-push user@example.com
```

### 5. Pull & Import (Combined)

```bash
# Pull database từ remote và import cùng lúc
# Syntax: pull-import <user@host> <remote-file>
./scripts/db-backup.sh pull-import user@example.com /backups/dump_medusa_20240101_120000.sql.gz
```

### 6. Danh Sách Dumps

#### Liệt kê local dumps
```bash
./scripts/db-backup.sh list
```

#### Liệt kê remote dumps
```bash
# Syntax: list-remote <user@host> [remote-path]
./scripts/db-backup.sh list-remote user@example.com /backups

# Mặc định kiểm tra home directory
./scripts/db-backup.sh list-remote user@example.com
```

### 7. Restore Database

```bash
# Restore với xác nhận
./scripts/db-backup.sh restore ./backups/dump_medusa_20240101_120000.sql

# Sẽ hỏi xác nhận trước khi ghi đè dữ liệu
```

### 8. Cleanup

```bash
# Xóa dumps cũ hơn 7 ngày (mặc định)
./scripts/db-backup.sh cleanup

# Xóa dumps cũ hơn 30 ngày
./scripts/db-backup.sh cleanup 30
```

## Cách Cấu Hình SSH

### Option 1: SSH Key (Recommended)

#### Tạo SSH key (nếu chưa có)
```bash
ssh-keygen -t ed25519 -C "your-email@example.com"
# Hoặc sử dụng RSA (older systems)
ssh-keygen -t rsa -b 4096 -C "your-email@example.com"
```

#### Copy public key lên server
```bash
ssh-copy-id -i ~/.ssh/id_ed25519.pub user@example.com
# Hoặc copy thủ công
cat ~/.ssh/id_ed25519.pub | ssh user@example.com "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys"
```

### Option 2: SSH Config

Thêm vào `~/.ssh/config`:
```
Host myserver
    HostName example.com
    User your-username
    IdentityFile ~/.ssh/id_ed25519
    Port 22
```

Sau đó dùng ngắn gọn:
```bash
./scripts/db-backup.sh push-ssh ./backups/dump_*.sql.gz myserver /backups
./scripts/db-backup.sh list-remote myserver /backups
```

### Option 3: Password Authentication

Nếu không có SSH key, script sẽ prompt password (cần `sshpass` installed):

```bash
# Install sshpass (optional)
# macOS
brew install sshpass

# Ubuntu/Debian
sudo apt-get install sshpass

# Sau đó dùng bình thường
./scripts/db-backup.sh push-ssh ./backups/dump_*.sql.gz user@example.com /backups
```

## Các Tình Huống Thường Gặp

### Backup Database Định Kỳ

#### Daily backup script (`scripts/daily-backup.sh`)
```bash
#!/bin/bash
cd "$(dirname "$0")/.."
./scripts/db-backup.sh export-gz

# Push to backup server
LATEST=$(ls -t backups/dump_* | head -1)
./scripts/db-backup.sh push-ssh "$LATEST" backupuser@backup.example.com /backups/medusa
```

Cron schedule (chạy hàng ngày lúc 2 AM):
```bash
# Edit crontab
crontab -e

# Thêm dòng
0 2 * * * /path/to/project/scripts/daily-backup.sh
```

### Backup & Archive to Remote

```bash
#!/bin/bash
PROJECT_ROOT="/home/tran/workplaces/www/thanglongcheviet"

cd "$PROJECT_ROOT"

# Export
echo "📦 Exporting database..."
DUMP_FILE=$(./scripts/db-backup.sh export-gz)

# Upload
echo "📤 Uploading to backup server..."
./scripts/db-backup.sh push-ssh "$DUMP_FILE" backupuser@backup.example.com /backups/daily

# Cleanup local old backups (keep last 3)
echo "🧹 Cleaning up old local backups..."
./scripts/db-backup.sh cleanup 7

echo "✅ Complete!"
```

### Sync Database Between Environments

```bash
#!/bin/bash

echo "🔄 Syncing database from production..."

# Pull production dump
echo "📥 Pulling from production..."
DUMP_FILE=$(./scripts/db-backup.sh pull-ssh produser@prod.example.com /backups/latest/dump.sql.gz)

# Import to local
echo "📦 Importing to local..."
./scripts/db-backup.sh import "$DUMP_FILE"

echo "✅ Sync complete!"
```

## Environment Variables

Script tự động load từ `.env.dev`, nhưng bạn có thể override:

```bash
# Set custom database credentials
export POSTGRES_USER=custom_user
export POSTGRES_PASSWORD=custom_pass
export POSTGRES_DB=custom_db
export POSTGRES_HOST=custom_host
export POSTGRES_PORT=5433

./scripts/db-backup.sh export
```

## Troubleshooting

### 1. Permission Denied cho SSH

```bash
# Kiểm tra SSH key permissions
chmod 600 ~/.ssh/id_ed25519
chmod 700 ~/.ssh

# Kiểm tra remote server authorized_keys
ssh user@host "chmod 700 ~/.ssh && chmod 600 ~/.ssh/authorized_keys"
```

### 2. Database Connection Error

```bash
# Kiểm tra Docker container
docker ps | grep postgres

# Kiểm tra database credentials
cat .env.dev | grep POSTGRES_

# Test connection
docker exec tlcv-postgres psql -U postgres -d medusa -c "SELECT 1"
```

### 3. SSH Timeout

```bash
# Thêm vào ~/.ssh/config
Host example.com
    ServerAliveInterval 60
    ServerAliveCountMax 10
```

### 4. File Quá Lớn

Nếu file dump quá lớn:
```bash
# Dump chỉ schema (không dữ liệu)
docker exec tlcv-postgres pg_dump -U postgres -d medusa --schema-only > schema.sql

# Dump chỉ dữ liệu (không schema)
docker exec tlcv-postgres pg_dump -U postgres -d medusa --data-only > data.sql

# Dump specific tables
docker exec tlcv-postgres pg_dump -U postgres -d medusa -t table_name > table.sql
```

## Best Practices

1. **Regular Backups**: Chạy backup hàng ngày
2. **Off-site Storage**: Lưu dumps trên server khác hoặc cloud storage
3. **Test Restore**: Định kỳ test restore dumps
4. **Encryption**: Encrypt dumps trước khi transfer
   ```bash
   # Encrypt with gpg
   gpg --symmetric backups/dump_*.sql.gz
   
   # Decrypt
   gpg -d backups/dump_*.sql.gz.gpg > dump.sql.gz
   ```
5. **Monitoring**: Log backup process
   ```bash
   ./scripts/db-backup.sh export >> backups/backup.log 2>&1
   ```

## Advanced Usage

### Restore only specific tables

```bash
# Dump specific table
docker exec tlcv-postgres pg_dump -U postgres -d medusa -t table_name > table.sql

# Restore specific table
./scripts/db-backup.sh import table.sql
```

### Parallel backups

```bash
#!/bin/bash
# Backup multiple environments
./scripts/db-backup.sh export-push devuser@dev.example.com /backups &
./scripts/db-backup.sh export-push stageuser@stage.example.com /backups &
wait
echo "✅ All backups complete"
```

### Incremental backups with compression levels

```bash
# Maximum compression (slower)
docker exec tlcv-postgres pg_dump -U postgres -d medusa | gzip -9 > dump.sql.gz

# Standard compression (faster)
docker exec tlcv-postgres pg_dump -U postgres -d medusa | gzip > dump.sql.gz

# Custom compression
docker exec tlcv-postgres pg_dump -U postgres -d medusa | gzip -6 > dump.sql.gz
```

## Security Considerations

1. **Don't commit dumps** to git - add to `.gitignore`:
   ```
   backups/
   *.sql
   *.sql.gz
   ```

2. **Restrict backups directory**:
   ```bash
   chmod 700 backups/
   ```

3. **Secure remote backups**:
   - Sử dụng SSH key authentication
   - Restrict SSH access với IP whitelist
   - Encrypt dumps với GPG hoặc other tools

4. **Monitor disk space**:
   ```bash
   # Check backup directory size
   du -sh backups/
   
   # Alert if using > 10GB
   ```

## Monitoring & Logging

Thêm logging vào daily backup script:

```bash
#!/bin/bash
LOG_FILE="backups/backup_$(date +%Y-%m-%d).log"

{
  echo "========================================="
  echo "Backup started at $(date)"
  echo "========================================="
  
  ./scripts/db-backup.sh export-gz 2>&1
  
  echo "========================================="
  echo "Backup ended at $(date)"
  echo "========================================="
} | tee -a "$LOG_FILE"
```

## References

- [PostgreSQL pg_dump Documentation](https://www.postgresql.org/docs/current/app-pgdump.html)
- [SSH Public Key Authentication](https://man.openbsd.org/ssh)
- [Docker Exec Command](https://docs.docker.com/engine/reference/commandline/exec/)

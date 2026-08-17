# Database Backup & SSH Transfer Setup

✅ Các script backup/restore database PostreSQL đã được thiết lập thành công!

## 📦 Files Created

### Main Scripts

1. **`scripts/db-backup.sh`** (15KB)
   - Main backup/restore script
   - 12 commands đầy đủ: export, import, push, pull, restore, cleanup, etc.
   - Hỗ trợ SSH transfer, compression, cleanup
   - Tự động nén file > 10MB

2. **`scripts/quick-backup.sh`** (shortcut)
   - Quick export với compression
   - Cách dùng: `./scripts/quick-backup.sh`

3. **`scripts/daily-backup-example.sh`** (template)
   - Template cho cron job định kỳ
   - Tự động upload lên remote server
   - Log & error handling

### Documentation

1. **`docs/DATABASE_BACKUP.md`** (comprehensive guide)
   - Chi tiết các commands
   - SSH configuration guide
   - Troubleshooting
   - Best practices
   - Advanced usage examples

2. **`scripts/README_BACKUP.md`** (quick reference)
   - Quick start guide
   - Commands table
   - Common workflows
   - Security tips

3. **`BACKUP_SETUP.md`** (file này)
   - Setup summary
   - Quick start

### Configuration Updates

- **`.gitignore`** updated
  - Added patterns: `backups/`, `*.sql`, `*.sql.gz`, etc.
  - Prevents committing dumps to git

## 🚀 Quick Start

### 1. Export (nhanh nhất)

```bash
# Compressed export (recommended)
./scripts/quick-backup.sh
# hoặc
./scripts/db-backup.sh export-gz

# Uncompressed export
./scripts/db-backup.sh export
```

### 2. Export & Push to Remote

```bash
# 1. Setup SSH key (one-time)
ssh-keygen -t ed25519 -C "you@example.com"
ssh-copy-id -i ~/.ssh/id_ed25519.pub user@backup.example.com

# 2. Export and push
./scripts/db-backup.sh export-push user@backup.example.com /backups
```

### 3. Pull & Import from Remote

```bash
./scripts/db-backup.sh pull-import user@backup.example.com /backups/dump_latest.sql.gz
```

### 4. Setup Daily Automated Backup

```bash
# 1. Copy and customize template
cp scripts/daily-backup-example.sh scripts/daily-backup.sh
vim scripts/daily-backup.sh  # Edit SSH server details

# 2. Add to crontab (runs daily at 2 AM)
crontab -e
# Add: 0 2 * * * /path/to/project/scripts/daily-backup.sh

# 3. Check logs
tail -f backups/daily-backup-*.log
```

## 📋 Commands Reference

| Purpose | Command |
|---------|---------|
| **Export** | `./db-backup.sh export-gz` |
| **Import** | `./db-backup.sh import backups/dump_*.sql.gz` |
| **Push to server** | `./db-backup.sh push-ssh backups/dump_*.sql.gz user@host /path` |
| **Pull from server** | `./db-backup.sh pull-ssh user@host /path/dump_*.sql.gz` |
| **Export & push** | `./db-backup.sh export-push user@host /path` |
| **Pull & import** | `./db-backup.sh pull-import user@host /path/dump_*.sql.gz` |
| **List local** | `./db-backup.sh list` |
| **List remote** | `./db-backup.sh list-remote user@host /path` |
| **Restore** | `./db-backup.sh restore backups/dump_*.sql` |
| **Cleanup old** | `./db-backup.sh cleanup 30` |
| **Show help** | `./db-backup.sh help` |

## 📊 Database Info

- **Type**: PostgreSQL 15
- **Container**: `tlcv-postgres`
- **Database**: `medusa` (from `.env.dev`)
- **User**: `postgres`
- **Port**: 5432
- **Backup folder**: `backups/`

## 🔐 SSH Setup

### Option 1: SSH Key (Recommended)

```bash
# Generate key (if needed)
ssh-keygen -t ed25519 -C "your-email@example.com"

# Copy to server
ssh-copy-id -i ~/.ssh/id_ed25519.pub user@backup.example.com

# Test
ssh user@backup.example.com "echo SSH works"
```

### Option 2: SSH Config

Add to `~/.ssh/config`:
```
Host backup-server
    HostName backup.example.com
    User backupuser
    IdentityFile ~/.ssh/id_ed25519
```

Then use: `./db-backup.sh export-push backup-server /backups`

## 🎯 Common Workflows

### Daily Backup with Rotation

```bash
#!/bin/bash
# scripts/daily-backup.sh (simplified)
cd "$(dirname "$0")/.."

# Export with timestamp
DUMP=$(./scripts/db-backup.sh export-gz)

# Upload to remote
./scripts/db-backup.sh push-ssh "$DUMP" user@backup.example.com /backups

# Cleanup old (keep last 7 days)
./scripts/db-backup.sh cleanup 7

# Cleanup remote (keep last 30 days)
ssh user@backup.example.com "find /backups -name 'dump_*' -mtime +30 -delete"
```

Add to crontab:
```bash
crontab -e
0 2 * * * /path/to/project/scripts/daily-backup.sh
```

### Sync Dev with Production

```bash
#!/bin/bash
echo "🔄 Syncing dev database from production..."
DUMP=$(./scripts/db-backup.sh pull-ssh produser@prod.example.com /backups/daily.sql.gz)
./scripts/db-backup.sh import "$DUMP"
echo "✅ Complete!"
```

### Backup Multiple Servers (Parallel)

```bash
#!/bin/bash
./scripts/db-backup.sh export-push user@server1.com /backups &
./scripts/db-backup.sh export-push user@server2.com /backups &
wait
echo "✅ All backups done"
```

## 🔒 Security Tips

1. **Don't commit dumps**: Already added to `.gitignore`
2. **Use SSH keys**: More secure, enables automation
3. **Restrict permissions**: `chmod 700 backups/`
4. **Monitor disk space**: `du -sh backups/`
5. **Test restores**: Regularly verify dumps work

## 🐛 Troubleshooting

### SSH Connection Issues

```bash
# Test SSH
ssh -v user@example.com

# Fix key permissions
chmod 600 ~/.ssh/id_ed25519
chmod 700 ~/.ssh

# Fix remote permissions
ssh user@example.com "chmod 700 ~/.ssh && chmod 600 ~/.ssh/authorized_keys"
```

### Database Connection Issues

```bash
# Check Docker container
docker ps | grep postgres

# Test connection
docker exec tlcv-postgres psql -U postgres -d medusa -c "SELECT 1"

# Check credentials
cat .env.dev | grep POSTGRES_
```

### File Size Issues

Script auto-compresses large files. For very large databases:

```bash
# Dump only schema
docker exec tlcv-postgres pg_dump -U postgres -d medusa --schema-only > schema.sql

# Dump only data
docker exec tlcv-postgres pg_dump -U postgres -d medusa --data-only > data.sql

# Dump specific table
docker exec tlcv-postgres pg_dump -U postgres -d medusa -t table_name > table.sql
```

## 📚 Documentation

- Full guide: `docs/DATABASE_BACKUP.md`
- Script reference: `scripts/README_BACKUP.md`
- Built-in help: `./scripts/db-backup.sh help`

## ✅ Verification

Test the scripts work:

```bash
# Show help
./scripts/db-backup.sh help

# List current backups
./scripts/db-backup.sh list

# Test export (dry run)
./scripts/db-backup.sh export-gz
```

## 🎓 Next Steps

1. ✅ Scripts installed
2. Setup SSH keys (if using remote backup)
3. Create first backup: `./scripts/quick-backup.sh`
4. Setup daily backup via cron (optional)
5. Test restore: `./scripts/db-backup.sh restore <file>`
6. Monitor backups: `./scripts/db-backup.sh list`

## 📞 Support

- SSH issues: See `docs/DATABASE_BACKUP.md` section "Cách Cấu Hình SSH"
- Database issues: Check "Troubleshooting" section above
- Commands help: Run `./scripts/db-backup.sh help`

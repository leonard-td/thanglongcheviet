# Database Backup Scripts

Tập hợp các script để quản lý backup/restore PostgreSQL database và transfer qua SSH.

## 📁 File Structure

```
scripts/
├── db-backup.sh                    # Main backup script (chính)
├── quick-backup.sh                 # Quick export (shortcut)
├── daily-backup-example.sh         # Daily cron job example
└── README_BACKUP.md                # File này
```

## 🚀 Quick Start

### 1. Backup Database (nhanh nhất)

```bash
./scripts/quick-backup.sh
```

### 2. Export & Push to Server

```bash
./scripts/db-backup.sh export-push user@example.com /backups
```

### 3. Pull & Import from Server

```bash
./scripts/db-backup.sh pull-import user@example.com /backups/dump_latest.sql.gz
```

## 📖 Detailed Usage

### db-backup.sh (Main Script)

Comprehensive backup management tool với 12 commands.

#### Commands List

| Command | Usage | Description |
|---------|-------|-------------|
| `export` | `./db-backup.sh export` | Export uncompressed dump |
| `export-gz` | `./db-backup.sh export-gz` | Export compressed dump (gzip) |
| `import` | `./db-backup.sh import <file>` | Import from dump file |
| `push-ssh` | `./db-backup.sh push-ssh <file> <user@host> [path]` | Upload dump to server |
| `pull-ssh` | `./db-backup.sh pull-ssh <user@host> <file>` | Download dump from server |
| `export-push` | `./db-backup.sh export-push <user@host> [path]` | Export & upload (1 command) |
| `pull-import` | `./db-backup.sh pull-import <user@host> <file>` | Download & import (1 command) |
| `list` | `./db-backup.sh list` | List local dumps |
| `list-remote` | `./db-backup.sh list-remote <user@host> [path]` | List remote dumps |
| `restore` | `./db-backup.sh restore <file>` | Restore with confirmation |
| `cleanup` | `./db-backup.sh cleanup [days]` | Delete old dumps (default: 7 days) |
| `help` | `./db-backup.sh help` | Show help message |

#### Examples

```bash
# Basic export
./db-backup.sh export

# Export with compression
./db-backup.sh export-gz

# Import
./db-backup.sh import backups/dump_medusa_20240101_120000.sql

# SSH transfer
./db-backup.sh push-ssh backups/dump_*.sql.gz user@example.com /backups
./db-backup.sh pull-ssh user@example.com /backups/dump_latest.sql.gz

# Combined operations
./db-backup.sh export-push user@example.com /backups
./db-backup.sh pull-import user@example.com /backups/dump_latest.sql.gz

# List
./db-backup.sh list
./db-backup.sh list-remote user@example.com /backups

# Cleanup
./db-backup.sh cleanup 30  # Remove dumps older than 30 days
```

### quick-backup.sh (Quick Backup)

Simple shortcut for `export-gz` command.

```bash
./quick-backup.sh
# Same as: ./db-backup.sh export-gz
```

### daily-backup-example.sh (Scheduled Backup)

Template for daily automated backups.

#### Setup

1. Copy and customize:
```bash
cp scripts/daily-backup-example.sh scripts/daily-backup.sh
vim scripts/daily-backup.sh
```

2. Configure variables:
```bash
# Edit these in daily-backup.sh
BACKUP_SERVER="backupuser@backup.example.com"
REMOTE_BACKUP_PATH="/backups/medusa-production"
KEEP_LOCAL_DAYS=7
KEEP_REMOTE_DAYS=30
NOTIFY_EMAIL="admin@example.com"
```

3. Add to crontab:
```bash
crontab -e
# Add line (runs daily at 2 AM):
0 2 * * * /path/to/project/scripts/daily-backup.sh
```

4. View cron logs:
```bash
tail -f backups/daily-backup-$(date +%Y-%m-%d).log
```

## 🔐 SSH Configuration

### SSH Key Setup (Recommended)

```bash
# 1. Generate SSH key (if not exists)
ssh-keygen -t ed25519 -C "you@example.com"

# 2. Copy to remote server
ssh-copy-id -i ~/.ssh/id_ed25519.pub user@example.com

# 3. Test
ssh user@example.com "echo 'SSH works!'"
```

### SSH Config (Optional)

Add to `~/.ssh/config`:
```
Host backup-server
    HostName backup.example.com
    User backupuser
    IdentityFile ~/.ssh/id_ed25519
    Port 22
```

Then use shortened names:
```bash
./db-backup.sh export-push backup-server /backups
```

## 📊 Database Information

**Type:** PostgreSQL 15  
**Container:** `tlcv-postgres`  
**Default User:** `postgres`  
**Default DB:** `medusa`  
**Port:** 5432

Credentials loaded from `.env.dev`:
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `POSTGRES_DB`
- `POSTGRES_HOST`
- `POSTGRES_PORT`

## 💾 Backup Locations

### Local
```
project_root/
└── backups/
    ├── dump_medusa_20240116_093045.sql
    ├── dump_medusa_20240116_100000.sql.gz
    ├── backup.log
    └── daily-backup-2024-01-16.log
```

### Remote (configured in scripts)
```
/backups/medusa-production/
├── dump_medusa_20240116_093045.sql.gz
├── dump_medusa_20240116_100000.sql.gz
└── ...
```

## 🐛 Troubleshooting

### SSH Connection Failed

```bash
# Test SSH connection
ssh -v user@example.com

# Check SSH key permissions
chmod 600 ~/.ssh/id_ed25519
chmod 700 ~/.ssh

# Check remote server permissions
ssh user@example.com "chmod 700 ~/.ssh && chmod 600 ~/.ssh/authorized_keys"
```

### Database Connection Error

```bash
# Check if Docker container is running
docker ps | grep postgres

# Test database connection
docker exec tlcv-postgres psql -U postgres -d medusa -c "SELECT 1"

# Check .env.dev credentials
cat .env.dev | grep POSTGRES_
```

### Large Dump File

Script automatically compresses files > 10MB. To manually compress:

```bash
# Compress a dump
gzip backups/dump_medusa_*.sql

# Decompress
gunzip backups/dump_medusa_*.sql.gz

# Using custom compression level
gzip -6 backups/dump_medusa_*.sql
```

## 🔒 Security Best Practices

1. **Never commit dumps to git**
   - Already added to `.gitignore`
   - Check with: `git status backups/`

2. **Restrict backup directory**
   ```bash
   chmod 700 backups/
   ```

3. **Use SSH keys** instead of passwords
   - More secure and enables automation
   - See SSH Configuration section

4. **Encrypt sensitive dumps**
   ```bash
   # Encrypt with GPG
   gpg --symmetric backups/dump_*.sql.gz
   
   # Decrypt
   gpg -d backups/dump_*.sql.gz.gpg > dump.sql.gz
   ```

5. **Monitor disk usage**
   ```bash
   du -sh backups/
   df -h backups/
   ```

## 📋 Common Workflows

### Daily Backup to Remote Server

1. Setup ssh key authentication
2. Customize `scripts/daily-backup.sh`
3. Add to crontab:
   ```bash
   0 2 * * * /path/to/project/scripts/daily-backup.sh >> /var/log/medusa-backup.log 2>&1
   ```

### Sync Dev Database with Production

```bash
#!/bin/bash
echo "Syncing dev database from production..."
DUMP=$(./scripts/db-backup.sh pull-ssh produser@prod.example.com /backups/latest.sql.gz)
./scripts/db-backup.sh import "$DUMP"
echo "✅ Sync complete!"
```

### Backup Multiple Databases

```bash
#!/bin/bash
# Backup to multiple locations in parallel
./scripts/db-backup.sh export-push user@server1.com /backups &
./scripts/db-backup.sh export-push user@server2.com /backups &
wait
echo "✅ All backups complete"
```

### Archive Old Backups

```bash
#!/bin/bash
# Create monthly archive
MONTH=$(date +%Y-%m)
tar -czf backups/archive_$MONTH.tar.gz backups/dump_*_${MONTH}*
rm backups/dump_*_${MONTH}*
```

## 📚 Additional Resources

- [PostgreSQL pg_dump Docs](https://www.postgresql.org/docs/15/app-pgdump.html)
- [SSH Public Key Auth](https://man.openbsd.org/ssh)
- [Docker Exec](https://docs.docker.com/engine/reference/commandline/exec/)
- [Cron Expression Reference](https://crontab.guru/)

## 💬 Support

For detailed documentation, see: [`docs/DATABASE_BACKUP.md`](../docs/DATABASE_BACKUP.md)

For issues with SSH setup, see: [SSH Configuration section](#-ssh-configuration)

For Docker database issues, see: [Database Information section](#-database-information)

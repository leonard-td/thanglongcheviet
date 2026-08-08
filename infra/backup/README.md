# PostgreSQL Backup & Restore với Restic

## Mục lục

1. [Tổng quan](#tổng-quan)
2. [Kiến trúc](#kiến-trúc)
3. [Cài đặt & Cấu hình](#cài-đặt--cấu-hình)
4. [Vận hành hàng ngày](#vận-hành-hàng-ngày)
5. [Restore (Khôi phục)](#restore-khôi-phục)
6. [Storage Backends](#storage-backends)
7. [Monitoring & Alerting](#monitoring--alerting)
8. [Disaster Recovery Playbook](#disaster-recovery-playbook)
9. [Troubleshooting](#troubleshooting)
10. [FAQ](#faq)

---

## Tổng quan

### Restic là gì?

Restic là công cụ backup hiện đại với các đặc điểm:

- **Incremental/Deduplication** — chỉ lưu phần thay đổi, tiết kiệm dung lượng
- **Encryption (AES-256)** — mọi data đều được mã hóa trước khi lưu
- **Integrity verification** — tự kiểm tra tính toàn vẹn dữ liệu
- **Multi-backend** — hỗ trợ local, S3, SFTP, Azure, GCS, Backblaze B2
- **Snapshots** — mỗi bản backup là 1 snapshot, có thể browse/restore riêng lẻ

### Luồng hoạt động trong dự án

```
┌─────────────┐    pg_dump     ┌──────────────┐    restic backup    ┌─────────────────┐
│  PostgreSQL  │ ─────────────▶ │  .sql.gz file │ ─────────────────▶ │  Restic Repo    │
│  (container) │               │  (temp)       │                    │  (encrypted)    │
└─────────────┘               └──────────────┘                    └─────────────────┘
                                                                          │
                                                                          │ S3 / SFTP / Local
                                                                          ▼
                                                                   ┌─────────────────┐
                                                                   │  Remote Storage  │
                                                                   └─────────────────┘
```

**Cron schedule (mặc định):** 2:00 AM hàng ngày (Asia/Ho_Chi_Minh)

---

## Kiến trúc

### Docker service

```yaml
# infra/docker-compose.prod.yml
backup:
  build: ./backup
  depends_on:
    postgres: { condition: service_healthy }
  environment:
    RESTIC_REPOSITORY: /backups # hoặc s3:..., sftp:...
    RESTIC_PASSWORD: <encryption-key>
  volumes:
    - restic_repo:/backups
```

### File structure

```
infra/backup/
├── Dockerfile       # Alpine 3.20 + restic + postgresql16-client
├── entrypoint.sh    # Cron scheduler + initial backup on startup
├── backup.sh        # pg_dump → gzip → restic backup → prune
├── restore.sh       # restic restore → gunzip → pg_restore
└── README.md        # (file này)
```

### Container image

- Base: `alpine:3.20` (~5MB)
- Packages: `restic`, `postgresql16-client`, `gzip`, `curl`, `tzdata`
- Timezone: `Asia/Ho_Chi_Minh`

---

## Cài đặt & Cấu hình

### Bước 1: Cấu hình biến môi trường

Mở `.env.prod` và điền các giá trị:

```bash
# --- Restic DB Backup --------------------------------------------------------

# 1. Chọn repository backend (xem mục "Storage Backends" bên dưới)
RESTIC_REPOSITORY=/backups

# 2. Mật khẩu mã hóa — ĐÂY LÀ KEY DUY NHẤT ĐỂ GIẢI MÃ BACKUP
#    ⚠️  MẤT MẬT KHẨU = MẤT TOÀN BỘ BACKUP! Lưu ở nơi an toàn (password manager, vault)
RESTIC_PASSWORD=my-super-strong-password-here

# 3. S3 credentials (chỉ cần nếu dùng S3)
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=

# 4. Lịch backup (cron format)
#    Ví dụ:
#      0 2 * * *     = 2:00 AM hàng ngày
#      0 */6 * * *   = mỗi 6 tiếng
#      0 2 * * 1-5   = 2:00 AM thứ 2-6 (weekdays)
#      */30 * * * *  = mỗi 30 phút (dev/testing)
BACKUP_CRON="0 2 * * *"

# 5. Retention policy — giữ lại bao nhiêu snapshot
BACKUP_KEEP_DAILY=7        # 7 ngày gần nhất
BACKUP_KEEP_WEEKLY=4       # 4 tuần gần nhất
BACKUP_KEEP_MONTHLY=6      # 6 tháng gần nhất
```

### Bước 2: Build và start service

```bash
# Từ thư mục root của project
cd /path/to/thanglongcheviet

# Build backup image
docker compose -f infra/docker-compose.prod.yml build backup

# Start (backup service sẽ tự chạy lần đầu khi khởi động)
docker compose -f infra/docker-compose.prod.yml up -d backup

# Kiểm tra logs
docker compose -f infra/docker-compose.prod.yml logs backup
```

### Bước 3: Xác nhận hoạt động

```bash
# Xem snapshot đầu tiên đã tạo chưa
docker compose -f infra/docker-compose.prod.yml exec backup restic snapshots

# Output mong đợi:
# ID        Time                 Host        Tags
# ────────────────────────────────────────────────────
# a1b2c3d4  2024-01-15 02:00:05  abc123      postgres,medusa,20240115_020001
```

---

## Vận hành hàng ngày

### Backup thủ công (ngay lập tức)

```bash
docker compose -f infra/docker-compose.prod.yml exec backup /scripts/backup.sh
```

Output:

```
=== [Thu Jan 15 14:30:01 ICT 2025] Starting backup ===
Dumping database 'medusa' from postgres...
Dump complete: /tmp/db-dumps/medusa_20250115_143001.sql.gz (12M)
Backing up to Restic repository...
Backup snapshot created successfully.
Applying retention policy (daily=7, weekly=4, monthly=6)...
=== [Thu Jan 15 14:30:08 ICT 2025] Backup completed ===
```

### Xem danh sách snapshots

```bash
docker compose -f infra/docker-compose.prod.yml exec backup /scripts/restore.sh --list
```

Output:

```
=== Available backup snapshots ===
ID        Time                 Host        Tags
────────────────────────────────────────────────────────────────
a1b2c3d4  2025-01-15 02:00:05  backup-ctr  postgres,medusa
b2c3d4e5  2025-01-14 02:00:03  backup-ctr  postgres,medusa
c3d4e5f6  2025-01-13 02:00:04  backup-ctr  postgres,medusa
...
```

### Xem chi tiết 1 snapshot

```bash
docker compose -f infra/docker-compose.prod.yml exec backup restic ls a1b2c3d4
```

### Xem dung lượng repository

```bash
# Tổng quan
docker compose -f infra/docker-compose.prod.yml exec backup restic stats

# Chi tiết theo snapshot
docker compose -f infra/docker-compose.prod.yml exec backup restic stats --mode raw-data
```

### Kiểm tra tính toàn vẹn repository

```bash
# Kiểm tra nhanh (metadata only)
docker compose -f infra/docker-compose.prod.yml exec backup restic check

# Kiểm tra đầy đủ (đọc toàn bộ data — chậm nhưng thorough)
docker compose -f infra/docker-compose.prod.yml exec backup restic check --read-data
```

### Xem log backup tự động

```bash
# Log của container
docker compose -f infra/docker-compose.prod.yml logs backup --tail 100

# Log chi tiết bên trong container
docker compose -f infra/docker-compose.prod.yml exec backup cat /var/log/backup.log
```

---

## Restore (Khôi phục)

### ⚠️ CẢNH BÁO QUAN TRỌNG

> Restore sẽ **GHI ĐÈ TOÀN BỘ** database hiện tại. Hãy chắc chắn:
>
> 1. Bạn đã backup bản hiện tại trước khi restore
> 2. Bạn hiểu rõ snapshot nào đang restore
> 3. Backend service sẽ cần restart sau restore

### Restore snapshot mới nhất

```bash
# 1. (Khuyến nghị) Backup bản hiện tại trước
docker compose -f infra/docker-compose.prod.yml exec backup /scripts/backup.sh

# 2. Restore
docker compose -f infra/docker-compose.prod.yml exec backup /scripts/restore.sh

# 3. Restart backend để reconnect database
docker compose -f infra/docker-compose.prod.yml restart backend
```

### Restore snapshot cụ thể (theo ID)

```bash
# 1. Tìm snapshot ID cần restore
docker compose -f infra/docker-compose.prod.yml exec backup /scripts/restore.sh --list

# 2. Restore snapshot cụ thể
docker compose -f infra/docker-compose.prod.yml exec backup /scripts/restore.sh a1b2c3d4

# 3. Restart backend
docker compose -f infra/docker-compose.prod.yml restart backend
```

### Restore vào database khác (testing)

Nếu muốn restore vào 1 database test trước khi apply vào production:

```bash
# 1. Tạo database test
docker compose -f infra/docker-compose.prod.yml exec postgres \
  psql -U postgres -c "CREATE DATABASE medusa_restore_test;"

# 2. Restore snapshot vào database test
docker compose -f infra/docker-compose.prod.yml exec backup sh -c '
  POSTGRES_DB=medusa_restore_test /scripts/restore.sh a1b2c3d4
'

# 3. Kiểm tra data trong database test
docker compose -f infra/docker-compose.prod.yml exec postgres \
  psql -U postgres -d medusa_restore_test -c "\dt"

# 4. Nếu OK, xóa database test
docker compose -f infra/docker-compose.prod.yml exec postgres \
  psql -U postgres -c "DROP DATABASE medusa_restore_test;"
```

### Restore file dump ra ngoài (không restore trực tiếp)

Nếu chỉ muốn lấy file dump ra mà không restore:

```bash
# Extract dump file từ snapshot vào /tmp bên trong container
docker compose -f infra/docker-compose.prod.yml exec backup sh -c '
  mkdir -p /tmp/extracted
  restic restore latest --target /tmp/extracted
  ls -la /tmp/extracted/tmp/db-dumps/
'

# Copy file dump ra host
docker cp tlcv_backup_prod:/tmp/extracted/tmp/db-dumps/ ./my-dumps/
```

---

## Storage Backends

### 1. Local Volume (mặc định — dev/staging)

```bash
RESTIC_REPOSITORY=/backups
```

Backup lưu trong Docker named volume `restic_repo`. Phù hợp cho development.

**Ưu điểm:** Nhanh, không cần credentials, zero config.
**Nhược điểm:** Nếu server/disk hỏng thì mất cả backup lẫn data.

**Mount host directory (khuyến nghị hơn volume):**

Sửa `docker-compose.prod.yml`:

```yaml
backup:
  volumes:
    - /mnt/backup-disk/tlcv-backups:/backups # external disk
```

### 2. AWS S3 (khuyến nghị cho production)

```bash
RESTIC_REPOSITORY=s3:s3.ap-southeast-1.amazonaws.com/tlcv-db-backups
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
```

**Tạo S3 bucket:**

```bash
# AWS CLI
aws s3 mb s3://tlcv-db-backups --region ap-southeast-1

# IAM Policy cần thiết (least privilege):
```

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:ListBucket",
        "s3:GetBucketLocation"
      ],
      "Resource": [
        "arn:aws:s3:::tlcv-db-backups",
        "arn:aws:s3:::tlcv-db-backups/*"
      ]
    }
  ]
}
```

**S3 Lifecycle (tiết kiệm chi phí):**

- Chuyển sang S3 Glacier sau 90 ngày (Restic xử lý retention riêng, nhưng S3 lifecycle là lớp bảo vệ thêm)

### 3. S3-Compatible (MinIO, DigitalOcean Spaces, Cloudflare R2)

```bash
# MinIO
RESTIC_REPOSITORY=s3:http://minio.example.com:9000/tlcv-backups

# DigitalOcean Spaces
RESTIC_REPOSITORY=s3:sgp1.digitaloceanspaces.com/tlcv-backups

# Cloudflare R2
RESTIC_REPOSITORY=s3:https://<account-id>.r2.cloudflarestorage.com/tlcv-backups
```

### 4. SFTP (remote server)

```bash
RESTIC_REPOSITORY=sftp:backup-user@backup.example.com:/data/tlcv-backups
```

**Setup SSH key:**

```bash
# 1. Tạo SSH key (trên máy local hoặc server)
ssh-keygen -t ed25519 -f ./backup_key -N ""

# 2. Copy public key sang backup server
ssh-copy-id -i ./backup_key.pub backup-user@backup.example.com

# 3. Mount key vào container (sửa docker-compose.prod.yml):
```

```yaml
backup:
  volumes:
    - ./backup_key:/root/.ssh/id_ed25519:ro
    - ./known_hosts:/root/.ssh/known_hosts:ro
```

### 5. Backblaze B2

```bash
RESTIC_REPOSITORY=b2:tlcv-db-backups:
B2_ACCOUNT_ID=your-account-id
B2_ACCOUNT_KEY=your-account-key
```

Thêm env vars vào docker-compose:

```yaml
environment:
  B2_ACCOUNT_ID: ${B2_ACCOUNT_ID:-}
  B2_ACCOUNT_KEY: ${B2_ACCOUNT_KEY:-}
```

---

## Monitoring & Alerting

### Healthcheck đơn giản (kiểm tra backup gần nhất)

Thêm script kiểm tra tuổi snapshot mới nhất:

```bash
# Chạy từ cron hoặc monitoring system
docker compose -f infra/docker-compose.prod.yml exec backup sh -c '
  LATEST=$(restic snapshots --json --last | grep -o "\"time\":\"[^\"]*\"" | head -1)
  echo "Latest backup: $LATEST"
'
```

### Tích hợp notification (Telegram)

Thêm vào cuối `backup.sh` nếu muốn thông báo qua Telegram:

```bash
# Gửi notification sau backup thành công
if [ -n "${TELEGRAM_BOT_TOKEN:-}" ] && [ -n "${TELEGRAM_CHAT_ID:-}" ]; then
  MSG="✅ DB Backup OK | $(date '+%Y-%m-%d %H:%M') | Size: ${DUMP_SIZE}"
  curl -s "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
    -d "chat_id=${TELEGRAM_CHAT_ID}" \
    -d "text=${MSG}" > /dev/null
fi
```

### Log rotation

Log backup được ghi vào `/var/log/backup.log` bên trong container. Container restart sẽ reset log. Nếu cần persist:

```yaml
backup:
  volumes:
    - backup_logs:/var/log
```

---

## Disaster Recovery Playbook

### Scenario 1: Database bị corrupt / lỗi migration

```bash
# 1. Stop backend ngay
docker compose -f infra/docker-compose.prod.yml stop backend

# 2. Xem danh sách snapshots, chọn bản trước khi lỗi
docker compose -f infra/docker-compose.prod.yml exec backup /scripts/restore.sh --list

# 3. Restore snapshot trước thời điểm lỗi
docker compose -f infra/docker-compose.prod.yml exec backup /scripts/restore.sh <snapshot-id>

# 4. Start lại backend
docker compose -f infra/docker-compose.prod.yml start backend

# 5. Kiểm tra health
curl http://localhost:8800/health
```

### Scenario 2: Server hỏng hoàn toàn (cần server mới)

```bash
# 1. Trên server MỚI — clone repo + copy .env.prod
git clone <repo-url> thanglongcheviet
cp /secure-location/.env.prod thanglongcheviet/.env.prod

# 2. Start postgres trước
docker compose -f infra/docker-compose.prod.yml up -d postgres
# Đợi healthy
docker compose -f infra/docker-compose.prod.yml exec postgres pg_isready

# 3. Start backup service (nó sẽ connect tới Restic repo — cần cùng RESTIC_PASSWORD)
docker compose -f infra/docker-compose.prod.yml up -d backup

# 4. Restore snapshot mới nhất
docker compose -f infra/docker-compose.prod.yml exec backup /scripts/restore.sh

# 5. Start toàn bộ stack
docker compose -f infra/docker-compose.prod.yml up -d
```

### Scenario 3: Xóa nhầm data (soft recovery)

```bash
# 1. Backup bản hiện tại (phòng trường hợp)
docker compose -f infra/docker-compose.prod.yml exec backup /scripts/backup.sh

# 2. Restore bản trước khi xóa nhầm
docker compose -f infra/docker-compose.prod.yml exec backup /scripts/restore.sh <snapshot-before-delete>

# 3. Restart
docker compose -f infra/docker-compose.prod.yml restart backend
```

### Scenario 4: Muốn migrate sang server khác

```bash
# Server CŨ: Backup lần cuối
docker compose -f infra/docker-compose.prod.yml exec backup /scripts/backup.sh

# Server MỚI: Cùng RESTIC_REPOSITORY + RESTIC_PASSWORD → restic sẽ thấy tất cả snapshots
# Sau đó restore như Scenario 2
```

---

## Troubleshooting

### Lỗi: "Fatal: unable to open config file"

**Nguyên nhân:** Restic repository chưa được init.

**Fix:** Backup script tự init nếu chưa có. Hoặc init thủ công:

```bash
docker compose -f infra/docker-compose.prod.yml exec backup restic init
```

### Lỗi: "Fatal: wrong password or no key found"

**Nguyên nhân:** `RESTIC_PASSWORD` không khớp với password lúc tạo repo.

**Fix:** Kiểm tra lại `.env.prod`, đảm bảo giá trị `RESTIC_PASSWORD` giống lúc init repo lần đầu.

### Lỗi: "pg_dump: connection refused"

**Nguyên nhân:** Postgres chưa ready hoặc credentials sai.

**Fix:**

```bash
# Kiểm tra postgres đang chạy
docker compose -f infra/docker-compose.prod.yml ps postgres

# Test connection từ backup container
docker compose -f infra/docker-compose.prod.yml exec backup sh -c '
  PGPASSWORD=$POSTGRES_PASSWORD pg_isready -h postgres -U $POSTGRES_USER
'
```

### Lỗi: "Fatal: unable to save snapshot: ... permission denied"

**Nguyên nhân:** Không có quyền ghi vào repository (S3 IAM, SFTP permission).

**Fix:** Kiểm tra IAM policy (S3) hoặc file permission (SFTP/local).

### Lỗi restore: "pg_restore: error: could not execute query: table does not exist"

**Nguyên nhân:** Bình thường — `--clean --if-exists` cố DROP trước khi CREATE. Nếu table chưa tồn tại, pg_restore in warning nhưng vẫn tạo table mới.

**Không cần fix** — đây là behavior mong đợi.

### Backup quá lớn / tốn dung lượng

```bash
# Kiểm tra dung lượng thực (sau dedup)
docker compose -f infra/docker-compose.prod.yml exec backup restic stats

# Force prune (xóa data không còn reference)
docker compose -f infra/docker-compose.prod.yml exec backup restic prune

# Giảm retention nếu cần
# Sửa .env.prod: BACKUP_KEEP_DAILY=3, BACKUP_KEEP_WEEKLY=2, BACKUP_KEEP_MONTHLY=3
```

### Container backup restart loop

```bash
# Xem logs
docker compose -f infra/docker-compose.prod.yml logs backup --tail 50

# Thường do: postgres chưa healthy, hoặc RESTIC_PASSWORD rỗng
# Fix: đảm bảo postgres healthy trước, set RESTIC_PASSWORD
```

---

## FAQ

### Q: Backup tốn bao nhiêu dung lượng?

Restic dùng deduplication — nếu DB 100MB và thay đổi 5% mỗi ngày:

- Lần đầu: ~100MB
- Mỗi ngày sau: ~5-10MB (chỉ lưu diff)
- 1 tháng (30 snapshots): ~250-350MB thay vì 3GB

### Q: Backup có ảnh hưởng performance DB không?

`pg_dump` tạo consistent snapshot mà KHÔNG lock table (MVCC). Impact rất nhỏ — chỉ tăng disk I/O tạm thời lúc dump.

### Q: Tôi có thể restore 1 table thay vì toàn bộ DB không?

Có, nhưng cần thao tác thủ công:

```bash
# 1. Extract dump file
docker compose -f infra/docker-compose.prod.yml exec backup sh -c '
  mkdir -p /tmp/extract && restic restore latest --target /tmp/extract
'

# 2. List tables trong dump
docker compose -f infra/docker-compose.prod.yml exec backup sh -c '
  gunzip -c /tmp/extract/tmp/db-dumps/*.sql.gz | pg_restore -l | head -50
'

# 3. Restore 1 table cụ thể
docker compose -f infra/docker-compose.prod.yml exec backup sh -c '
  gunzip -c /tmp/extract/tmp/db-dumps/*.sql.gz | pg_restore \
    -h postgres -U postgres -d medusa \
    --no-owner --data-only --table=customers
'
```

### Q: Nếu mất RESTIC_PASSWORD thì sao?

**Không thể recover.** Restic dùng AES-256 encryption — không có backdoor. Password là thứ duy nhất giải mã được data.

**Khuyến nghị:** Lưu RESTIC_PASSWORD ở ít nhất 2 nơi:

1. Password manager (1Password, Bitwarden)
2. Sealed envelope trong safe vật lý

### Q: Có nên backup thêm uploaded files (media) không?

Có. Hiện tại chỉ backup DB. Media files (`backend_static` volume) nên được backup riêng:

```bash
# Thêm static volume vào backup container
backup:
  volumes:
    - restic_repo:/backups
    - backend_static:/data/static:ro  # mount read-only

# Sửa backup.sh để backup thêm /data/static
restic backup "${DUMP_FILE}" /data/static \
  --tag "postgres" --tag "media" --tag "${TIMESTAMP}"
```

### Q: Tôi muốn test restore trên máy local, không phải production?

```bash
# 1. Copy restic repo (hoặc dùng cùng S3 bucket) về local
# 2. Chạy restic trực tiếp (không cần Docker):

brew install restic  # macOS

export RESTIC_REPOSITORY=/path/to/repo  # hoặc s3:...
export RESTIC_PASSWORD=your-password

restic snapshots
restic restore latest --target ./restored/

# 3. Restore vào local postgres
gunzip -c ./restored/tmp/db-dumps/*.sql.gz | pg_restore \
  -h localhost -U postgres -d medusa_test --no-owner --clean --if-exists
```

### Q: Encryption có chậm backup không?

Không đáng kể. AES-256 được hardware-accelerated trên mọi CPU hiện đại (AES-NI). Bottleneck luôn là disk I/O hoặc network, không phải encryption.

---

## Tham khảo

- [Restic Documentation](https://restic.readthedocs.io/)
- [Restic - Preparing a new repository](https://restic.readthedocs.io/en/latest/030_preparing_a_new_repo.html)
- [Restic - Backing up](https://restic.readthedocs.io/en/latest/040_backup.html)
- [Restic - Restoring from backup](https://restic.readthedocs.io/en/latest/050_restore.html)
- [Restic - Removing snapshots](https://restic.readthedocs.io/en/latest/060_forget.html)
- [PostgreSQL pg_dump documentation](https://www.postgresql.org/docs/16/app-pgdump.html)

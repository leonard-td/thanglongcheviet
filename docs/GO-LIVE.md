# Go-Live Guide — Thăng Long Chè Việt

> **Trạng thái:** Hướng dẫn vận hành production  
> **Stack:** Nuxt 3 storefront · Medusa 2 · Docker Compose · Nginx  
> **Cập nhật:** 2026-08-09  
> **Nhánh Ask:** `feat/ask-messages` (merge trước khi deploy nếu cần Ask)

Tài liệu này mô tả **toàn bộ** bước đưa TLCV lên production và giữ chạy ổn định: môi trường, build/deploy, publishable key, Ask Messages, CSKH, HTTPS, backup, smoke và rollback.

Chi tiết Ask riêng: [`docs/ASK-MESSAGES.md`](./ASK-MESSAGES.md).

---

## 0. Kết luận nhanh

| Bước | Việc |
|------|------|
| 1 | Merge code (Ask + hotfix) vào nhánh deploy |
| 2 | Chuẩn bị `.env.prod` (secret, domain, Ask/Typesense/Cohere, Telegram) |
| 3 | Server: Docker + Compose v2 + SSH key |
| 4 | `./deploy.sh` (build local → ship → `run-prod-stack.sh`) |
| 5 | Admin user + care-channel + catalog published + **`ask:reindex`** |
| 6 | Smoke Store/Ask/escalate + hard-refresh browser |
| 7 | HTTPS front + backup Restic |

**Luật vàng publishable key:** mọi lần `setup-web-integration` ghi key vào `.env.*` **phải recreate container `web`**. Prod (`provisioning.sh`) đã làm; dev (`start.dev.sh`) cũng đã recreate web/nginx.

---

## 1. Kiến trúc production (tóm tắt)

```text
Internet / LAN
      │
      ▼
[Optional: reverse proxy TLS — nginx/Caddy trên host]
      │  :443 → :HTTP_PORT (default 8800)
      ▼
tlcv_nginx_prod          ← entry duy nhất của stack
  ├─ /           → Nuxt (tlcv_web_prod :3000)
  ├─ /store|/auth|/admin|/app|/static → Medusa (backend :9000)
  └─ /health     → backend health
      │
      ├── tlcv_web_prod        Nitro .output (prebuilt)
      ├── tlcv_backend_prod    Medusa .medusa/server (prebuilt + runtime npm)
      ├── tlcv_typesense_prod  Ask catalog BM25 (:8108 internal)
      └── postgres
```

- **Build chỉ chạy trên máy build (local)** (`build-local.sh`). Server **không** compile source.
- Payload ship: `.medusa/server`, `.output`, `infra/`, script ops — **không** ship `node_modules` / `src/`.
- Sau deploy / import catalog: **`ask:reindex`** (xem [`ASK-MESSAGES.md`](./ASK-MESSAGES.md) §5). Typesense data nằm volume `typesense_data`.

---

## 2. Điều kiện trước khi go-live

### 2.1 Máy build (local)

- Node.js **≥ 20**, npm
- `bash`, `ssh`, `rsync` (hoặc tar fallback)
- SSH key tới server (`./setup-ssh.sh user@host` nếu chưa)

### 2.2 Server

- Docker + Compose **v2**
- User được chạy `docker`
- Port host `HTTP_PORT` (mặc định **8800**) mở (hoặc chỉ localhost nếu có reverse proxy TLS phía trước)
- Disk đủ cho image + volume Postgres + uploads + backup

### 2.3 Code

```bash
# Ví dụ: Ask phải có trên nhánh bạn deploy
git checkout feat/ask-messages   # hoặc sau khi merge vào dev/base / main
git pull
```

Xác nhận có:

- `apps/backend/src/modules/ask/` (+ `search/typesense/`)
- `infra/docker-compose.prod.yml` có service `typesense` + `ASK_*` / `TYPESENSE_*` / `COHERE_*`
- `docs/ASK-MESSAGES.md` (SSOT Ask)

---

## 3. Chuẩn bị `.env.prod`

```bash
cp .env.example .env.prod
# chỉnh .env.prod — KHÔNG commit file này
```

### 3.1 Bắt buộc

| Biến | Gợi ý production |
|------|------------------|
| `HTTP_PORT` | `8800` (hoặc `80` nếu nginx stack là entry công khai) |
| `DOMAIN` | Domain thật, ví dụ `thanglongcheviet.com` |
| `MEDUSA_BACKEND_URL` | `https://thanglongcheviet.com` (origin công khai; dùng cho URL upload) |
| `JWT_SECRET` | Chuỗi dài random |
| `COOKIE_SECRET` | Chuỗi dài random |
| `POSTGRES_PASSWORD` | Mạnh, khác default |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Tài khoản admin lần đầu |
| `STORE_CORS` / `ADMIN_CORS` / `AUTH_CORS` | `/.*/` OK nếu chỉ vào qua nginx same-origin; thu hẹp nếu cần |
| `COOKIE_SECURE` | **Xóa / để trống** trên HTTPS thật. Chỉ `false` khi test HTTP LAN |

### 3.2 Storefront (Nuxt)

| Biến | Ghi chú |
|------|---------|
| `NUXT_PUBLIC_MEDUSA_BACKEND_URL` | **Để trống** — browser gọi cùng origin (nginx proxy `/store`) |
| `NUXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` | Để trống lần đầu; `provisioning.sh` / `setup-web-integration` ghi lại |
| `NUXT_PUBLIC_MEDUSA_REGION_ID` | Tương tự |
| `NUXT_PUBLIC_MEDUSA_NAVIGATION_ID` | Menu header (seed navigation) |

### 3.3 Ask Messages + Typesense (nên bật cho chất lượng tốt)

```bash
ASK_NLU_PROVIDER=rule
SEARCH_SOURCE=typesense
TYPESENSE_HOST=typesense
TYPESENSE_PORT=8108
TYPESENSE_PROTOCOL=http
TYPESENSE_API_KEY=<strong-key>
TYPESENSE_HYBRID=0
SEARCH_REINDEX_TOKEN=<ops-token>
COHERE_API_KEY=<key server-only>
COHERE_RERANK=1
```

- Compose prod/dev đã có service `typesense` + env trên backend.
- **Sau** seed/import catalog (hoặc volume Typesense mới): `npm run ask:reindex` (trong container backend hoặc host với cùng env).
- **Không** đưa `COHERE_API_KEY` vào `NUXT_PUBLIC_*`.
- Không có Cohere key → BM25 vẫn chạy; `COHERE_RERANK=1` + key → xếp sản phẩm tốt hơn (fail-soft).
- `TYPESENSE_HYBRID=1` chỉ bật sau khi smoke BM25 PASS (tốn embed cost).
- Typesense down → Ask vẫn trả lời qua lib keyword (fail-soft).

### 3.4 Care-channel (escalate Ask / liên hệ)

```bash
TELEGRAM_BOT_TOKEN=...
TELEGRAM_CHAT_ID=...
TELEGRAM_CHANNEL_NAME=Telegram CSKH
# TELEGRAM_SEED_SEND_TEST=1   # chỉ khi muốn seed gửi tin thử
```

Credentials sau seed cũng nằm trong Admin → Kênh CSKH.

### 3.5 Backup (khuyến nghị)

```bash
RESTIC_REPOSITORY=/backups          # hoặc s3:...
RESTIC_PASSWORD=<mạnh>
BACKUP_CRON=0 2 * * *
BACKUP_KEEP_DAILY=7
```

Chi tiết: `infra/backup/README.md`.

### 3.6 Cảnh báo

```bash
REBUILD_ALL=false
```

`REBUILD_ALL=true` **xóa toàn bộ volume Postgres** lần start tiếp theo. Chỉ dùng khi cố ý reset DB.

---

## 4. Deploy lên server (cách chuẩn)

Từ **root repo** trên máy build:

### 4.1 Lần đầu (đẩy `.env.prod` + domain)

```bash
PUSH_ENV=1 \
DEPLOY_DOMAIN=thanglongcheviet.com \
./deploy.sh user@SERVER_IP www/thanglongcheviet
```

Hoặc:

```bash
DEPLOY_SERVER=user@SERVER_IP \
DEPLOY_DIR=www/thanglongcheviet \
PUSH_ENV=1 \
DEPLOY_DOMAIN=thanglongcheviet.com \
./deploy.sh
```

### 4.2 Redeploy code (giữ `.env.prod` trên server)

```bash
./deploy.sh user@SERVER_IP www/thanglongcheviet
# không set PUSH_ENV → không ghi đè secret trên server
```

### 4.3 Chỉ đổi env trên server

1. Sửa `.env.prod` trên server **hoặc** local + `PUSH_ENV=1`
2. Trên server:

```bash
cd www/thanglongcheviet   # hoặc DEPLOY_DIR
bash ./run-prod-stack.sh
```

### 4.4 Deploy làm gì bên trong

```text
deploy.sh
  → build-local.sh          # medusa build + nuxt build
  → copy-to-server.sh       # rsync/tar artifacts + infra + scripts
  → ssh: run-prod-stack.sh
        → compose up -d --force-recreate
        → wait backend healthy
        → provisioning.sh
              → setup-web-integration.mjs (ghi key/region vào .env.prod)
              → force-recreate web
        → smoke GET /store/site-settings + POST /store/ask
```

### 4.5 Tạo admin (lần đầu)

```bash
ssh user@SERVER_IP 'cd www/thanglongcheviet && bash ./create-admin.sh --prod'
```

---

## 5. Go-live trên chính máy này (không remote)

```bash
cp .env.example .env.prod   # nếu chưa có
# điền secret / Ask / Telegram...
./start.prod.sh
```

Script sẽ `down` stack **dev** trước (tránh tranh port), build local, rồi `run-prod-stack.sh`.

URL mặc định: `http://localhost:8800` (theo `HTTP_PORT`).

---

## 6. HTTPS / domain thật

Stack Docker publish **HTTP** trên `HTTP_PORT`. TLS nên để **reverse proxy host** (nginx/Caddy) phía trước:

1. DNS A/AAAA → server
2. Proxy `https://domain` → `http://127.0.0.1:8800`
3. Trong `.env.prod`:
   - `DOMAIN=your.domain`
   - `MEDUSA_BACKEND_URL=https://your.domain`
   - **Không** set `COOKIE_SECURE=false`
4. Redeploy / recreate backend+web sau khi đổi URL
5. Kiểm tra cookie admin login qua HTTPS

---

## 7. Checklist nội dung & CSKH (trước mở traffic)

### 7.1 Catalog

- [ ] Sản phẩm **published**
- [ ] Giá **VND** trên variant
- [ ] Title/description có từ khóa thật (chè, sen, nhài, quà doanh nghiệp…)
- [ ] Ảnh sản phẩm (Ask card không trống)
- [ ] Category / navigation header đúng

### 7.2 Ask

- [ ] `ASK_NLU_PROVIDER=rule` trong env backend container  
  (`docker exec tlcv_backend_prod printenv ASK_NLU_PROVIDER`)
- [ ] Typesense service healthy + `SEARCH_SOURCE=typesense`
- [ ] Đã chạy `npm run ask:reindex` sau seed/import catalog
- [ ] `COHERE_RERANK=1` + key nếu muốn chất lượng ranking tốt nhất
- [ ] `TYPESENSE_HYBRID=0` cho đến khi BM25 smoke PASS
- [ ] FAQ copy trong `modules/ask/config/knowledge-base.ts` khớp chính sách thật (ship / đổi trả / bảo hành)

### 7.3 Escalate / CSKH

- [ ] Telegram care-channel seed hoặc cấu hình Admin
- [ ] Gửi tin thử từ Admin / escalate Ask form
- [ ] Inquiry xuất hiện với `source: ask-messages`

### 7.4 Publishable key

- [ ] `NUXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` không rỗng trong `.env.prod`
- [ ] HTML trang chủ có `medusaPublishableKey:"pk_..."`
- [ ] Không còn lỗi *A valid publishable key is required*

Nếu key lỗi sau khi đổi DB: trên server chạy lại `bash ./provisioning.sh` (hoặc full `run-prod-stack.sh`).

---

## 8. Smoke test sau deploy (bắt buộc)

Thay `BASE` và `PK`:

```bash
BASE=https://your.domain   # hoặc http://IP:8800
PK=$(grep '^NUXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=' .env.prod | cut -d= -f2-)

curl -s -o /dev/null -w 'home:%{http_code}\n' "$BASE/"
curl -s -o /dev/null -w 'health:%{http_code}\n' "$BASE/health"
curl -s -o /dev/null -w 'store:%{http_code}\n' \
  -H "x-publishable-api-key: $PK" "$BASE/store/site-settings"

curl -s "$BASE/store/ask" \
  -H "content-type: application/json" \
  -H "x-publishable-api-key: $PK" \
  -d '{"message":"xin chào"}'

curl -s "$BASE/store/ask" \
  -H "content-type: application/json" \
  -H "x-publishable-api-key: $PK" \
  -d '{"message":"ship bao lâu?"}'

curl -s "$BASE/store/ask" \
  -H "content-type: application/json" \
  -H "x-publishable-api-key: $PK" \
  -d '{"message":"chè tôm"}'
```

### Browser

1. Hard refresh (Cmd+Shift+R)
2. FAB Ask (góc phải) — không double FAB
3. Chào → FAQ ship → sản phẩm → `hàng bị hỏng` → form escalate (SĐT/email)
4. Admin: `/app` login · inquiry · sản phẩm

Kỳ vọng trả lời: [`ASK-MESSAGES.md` §8–§9](./ASK-MESSAGES.md).

---

## 9. Vận hành sau go-live

| Việc | Tần suất | Ghi chú |
|------|----------|---------|
| Redeploy code | Khi merge | `./deploy.sh` (không `PUSH_ENV` trừ khi đổi env) |
| Đổi secret/Ask key | Theo nhu cầu | Sửa `.env.prod` → `run-prod-stack.sh` |
| Backup DB/media | Daily cron | Restic — xem `infra/backup/README.md` |
| Xem escalate Ask | Daily | Inquiry `ask-messages` + Telegram |
| Catalog edit | Liên tục | Title/mô tả → subscriber upsert Typesense; full heal = `ask:reindex` |
| Restart Medusa | Ít | **Xóa session Ask in-memory** — inquiry vẫn còn; Typesense data giữ trong volume |

### Lệnh hữu ích trên server

```bash
cd www/thanglongcheviet
docker compose -f infra/docker-compose.prod.yml --env-file .env.prod ps
docker compose -f infra/docker-compose.prod.yml --env-file .env.prod logs -f backend web nginx
docker exec tlcv_backend_prod printenv ASK_NLU_PROVIDER COHERE_RERANK SEARCH_SOURCE TYPESENSE_HYBRID
# Full reindex after catalog import / empty Typesense:
docker exec -w /workspace/apps/backend/.medusa/server tlcv_backend_prod \
  npx medusa exec ./src/scripts/ask-reindex.js
# (dev compose: npm run ask:reindex -w @dtc/backend inside tlcv_backend)
docker exec tlcv_web_prod printenv NUXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY | cut -c1-20
```

---

## 10. Rollback nhanh

1. Giữ build cũ trên máy deploy (hoặc tag git + build lại commit trước).
2. `SKIP_BUILD=1 ./deploy.sh ...` nếu artifact cũ còn trên máy, **hoặc** checkout commit cũ → `./deploy.sh`.
3. **Không** bật `REBUILD_ALL` khi rollback — tránh mất DB.
4. `.env.prod` trên server giữ nguyên trừ khi bản cũ bắt buộc đổi schema env.

---

## 11. Troubleshooting

| Triệu chứng | Nguyên nhân thường gặp | Cách xử lý |
|-------------|------------------------|------------|
| *A valid publishable key is required* | Web chưa recreate sau khi ghi key | `provisioning.sh` hoặc recreate `web` với `--env-file .env.prod` |
| Ask 404 | Module ask chưa có trong build đang chạy | Deploy lại nhánh có `modules/ask` |
| Ask không product / rỗng | Typesense chưa reindex hoặc `SEARCH_SOURCE` sai | `ask:reindex` + `printenv SEARCH_SOURCE` |
| Ask không rerank | Thiếu `COHERE_*` trên **prod** compose/env | Kiểm tra `docker-compose.prod.yml` + `printenv` trong backend |
| Escalate không về Telegram | Chưa seed / sai chat id | Admin Kênh CSKH + seed script |
| Admin cookie / 401 trên HTTPS | `COOKIE_SECURE=false` còn sót hoặc URL sai | Xóa `COOKIE_SECURE`, set `MEDUSA_BACKEND_URL=https://...` |
| `/health` OK nhưng web trống | Nuxt chưa ready / sai proxy | `logs web`, kiểm tra nginx conf |
| Sản phẩm Ask lệch | Title catalog yếu / thiếu published | Sửa catalog, không patch regex từng câu |

---

## 12. Checklist go-live một trang

**Trước**

- [ ] Code Ask (+ Typesense) đã merge / có trên artifact
- [ ] `.env.prod` đủ secret, domain, Ask/Typesense/Cohere, Telegram, backup
- [ ] Service `typesense` healthy + đã `ask:reindex`
- [ ] `REBUILD_ALL=false`
- [ ] Server Docker OK, SSH OK

**Deploy**

- [ ] `PUSH_ENV=1 DEPLOY_DOMAIN=... ./deploy.sh ...` (lần đầu)
- [ ] `create-admin.sh --prod`
- [ ] Smoke curl Store + Ask = 200
- [ ] Browser hard-refresh + Ask FAB + escalate

**Sau**

- [ ] HTTPS proxy
- [ ] Backup cron
- [ ] CSKH biết kênh inquiry Ask
- [ ] Ghi nhận giới hạn: session Ask không durable; ranking “bán chạy” = featured

---

## 13. Tài liệu liên quan

| File | Nội dung |
|------|----------|
| [`docs/ASK-MESSAGES.md`](./ASK-MESSAGES.md) | Kiến trúc + API + FAQ Ask |
| [`deploy.sh`](../deploy.sh) | Orchestrate build → copy → run |
| [`run-prod-stack.sh`](../run-prod-stack.sh) | Compose prod + provision + smoke |
| [`provisioning.sh`](../provisioning.sh) | Publishable key + recreate web |
| [`infra/docker-compose.prod.yml`](../infra/docker-compose.prod.yml) | Runtime prod |
| [`infra/backup/README.md`](../infra/backup/README.md) | Restic backup |
| [`docs/MEDUSA-ADMIN-RBAC.md`](./MEDUSA-ADMIN-RBAC.md) | Phân quyền admin (nếu bật) |

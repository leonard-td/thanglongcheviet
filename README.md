# Thăng Long Chè Việt

Monorepo thương mại điện tử: **Medusa** (backend/admin) + **Nuxt 3** (website khách hàng), chạy qua Docker + nginx.

## Stack

| Layer | Tech |
|-------|------|
| Customer site | Nuxt 3 (`apps/web`) |
| Commerce / Admin | Medusa 2 (`apps/backend`) |
| DB | PostgreSQL 15 |
| Entrypoint | nginx — `http://localhost:8800` |

> Lưu ý: starter Medusa DTC có nhắc Next.js storefront; trong repo này **không dùng** `apps/storefront`. Site công khai là Nuxt.

## Yêu cầu

- Node.js 20+
- Docker Desktop (khuyến nghị cho full stack)
- npm (workspace root dùng `packageManager: npm`)

## Chạy bằng Docker (khuyến nghị)

```bash
# 1. Env
cp .env.example .env.dev
# chỉnh ADMIN_*, JWT_SECRET, COOKIE_SECRET nếu cần

# 2. Start (Git Bash / WSL)
./start.dev.sh

# hoặc PowerShell / CMD:
docker compose -f infra/docker-compose.yml --env-file .env.dev up -d
node scripts/setup-web-integration.mjs
```

### URLs

| Service | URL |
|---------|-----|
| Website (Nuxt) | http://localhost:8800/ |
| Medusa Admin | http://localhost:8800/app |
| Medusa API | http://localhost:9000 |

**Admin mặc định (dev):** `admin@medusa.local` / `supersecret123`

### Provision Store API (publishable key + VN region)

```bash
node scripts/setup-web-integration.mjs
# rồi recreate web để nhận env mới:
docker compose -f infra/docker-compose.yml --env-file .env.dev up -d web
```

## Chạy Nuxt độc lập (không Medusa)

Chỉ UI tĩnh / không cart:

```bash
cd apps/web
npm install
npm run dev
```

Cart/checkout/auth cần Medusa backend đang chạy và các biến `NUXT_PUBLIC_MEDUSA_*`.

## Production

```bash
cp .env.example .env.prod
# BẮT BUỘC đổi JWT_SECRET + COOKIE_SECRET (compose sẽ từ chối nếu còn "supersecret")
./start.prod.sh
```

## Cấu trúc chính

```
apps/web/          Nuxt storefront
apps/backend/      Medusa API + admin
infra/             docker-compose + nginx
scripts/           setup-web-integration.mjs, watchers
.env.dev / .env.prod
QUALITY-PASS.md    Ghi chú các bản sửa chất lượng
```

## Tài khoản khách hàng (website)

- URL: `/tai-khoan` (EN: `/en/account`)
- Đăng nhập bằng **số điện thoại** + mật khẩu
- Sau login, giỏ khách được gắn vào tài khoản (`POST /store/carts/:id/customer`)

## Thanh toán

Hiện chỉ hỗ trợ **COD / thanh toán thủ công** (`pp_system_default`). VNPay/Stripe UI đã ẩn cho đến khi gateway được nối.

## Quality branch

Các bản sửa gần đây nằm trên nhánh `fix/tlcv-quality-pass` — xem `QUALITY-PASS.md`.

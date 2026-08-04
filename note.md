# Nhánh `fix/tlcv-quality-pass` — nhật ký thay đổi

**Nhánh gốc:** `dev/be_medusajs_merge`  
**Commit mới nhất (đã commit):** `8593b852` — Pass 6: hiệu năng backend, Redis, đồng thời hóa, củng cố storefront  
**Trạng thái:** chỉ có trên máy local (chưa push)

Hướng dẫn chạy ứng dụng: **[run.md](./run.md)**

---

## Tổng quan

Bảy lượt quality pass đã commit, cộng thêm các sửa lỗi trong phiên làm việc trên stack Medusa + Nuxt Thăng Long Chè Việt. Mục tiêu: sửa lỗi sau merge, căn storefront theo thương hiệu trà/quà tặng, củng cố checkout/auth/cookie, cải thiện hiệu năng backend, thêm kiểm soát đồng thời bằng Redis, và sửa bootstrap dev (catalog demo, tồn kho, ảnh).

**Khác biệt đã commit so với nhánh gốc:** 85 file, ~2.265 dòng thêm, ~849 dòng xóa.

**Chưa commit (WIP local):**

| File | Mục đích |
|------|----------|
| `infra/docker-compose.yml` | Mở rộng pipeline seed trong `backend-init` |
| `infra/docker-compose.prod.yml` | Cùng hook init cho prod |
| `apps/backend/src/scripts/remove-medusa-demo-catalog.ts` | Xóa sản phẩm demo Medusa + danh mục |
| `apps/backend/src/scripts/seed-product-inventory.ts` | Gán tồn kho cho sản phẩm đã seed |
| `.env.dev` | Key runtime do `setup-web-integration.mjs` ghi |

---

## Các commit (cũ → mới)

| Commit | Tóm tắt |
|--------|---------|
| `770dbcf8` | Sửa lỗi nghiêm trọng sau review merge Medusa |
| `c3cd4b9c` | Pass 2: chuyển giỏ hàng, sitemap, sanitize, trang lỗi |
| `dac6cdaf` | Pass 3: cờ tồn kho, UX COD, README, banner trà |
| `8ddaa82c` | Pass 4: sitemap i18n, lỗi giỏ hàng, cookie bảo mật |
| `f3198902` | Sửa `/en` 500: tạo site-settings, schema nav, `error.vue` |
| `9070b3c4` | Căn nav header, action và chuyển ngôn ngữ trên một trục |
| `8593b852` | Pass 6: hiệu năng backend, Redis, guard tồn kho, tách Docker init |

---

## Thay đổi frontend (`apps/web`)

So với `dev/be_medusajs_merge` — **37 file** thay đổi.

### Layout & điều hướng

| File | Thay đổi |
|------|----------|
| `components/layout/AppHeader.vue` | Nav + tài khoản + giỏ + chuyển ngôn ngữ trên một hàng; link tài khoản; aria-label menu i18n |
| `components/widgets/LangSwitch.vue` | Style biến thể header |
| `layouts/default.vue` | Bỏ chuyển ngôn ngữ trùng (chuyển lên header) |

### Trang chủ & section

| File | Thay đổi |
|------|----------|
| `components/sections/PromoBanner.vue` | Ảnh trà; CTA → sản phẩm |
| `components/sections/BlogSnippet.vue` | `NuxtImg` → `<img>` (sửa IPX 404 sau nginx) |
| `components/sections/ProductCatalog.vue` | `@error` thumbnail → ảnh dự phòng |
| `components/sections/GalleryFilter.vue` | Tinh chỉnh UX bộ lọc |
| `components/home/HomeNewsMarquee.vue` | Dọn code nhỏ |
| `pages/index.vue` | Meta SEO trang chủ |

### Sản phẩm, giỏ hàng, thanh toán

| File | Thay đổi |
|------|----------|
| `composables/useProducts.ts` | Field list gọn; field tồn kho trên variant; `metadata.featured` cho trang chủ |
| `utils/medusa.ts` | `variantInStock()` từ `manage_inventory` / `allow_backorder` / `inventory_quantity` |
| `composables/useCart.ts` | Cookie giỏ bảo mật; kiểm tra tồn kho trước khi thêm; validate trước checkout; chuyển giỏ → khách sau login; update/remove trả lỗi |
| `pages/gio-hang.vue` | Fetch giỏ khi mount; hiển thị lỗi giỏ |
| `pages/san-pham/[slug].vue` | Tinh chỉnh tồn kho/checkout |
| `pages/qua-tang-doanh-nghiep.vue` | Lọc quà doanh nghiệp + i18n |
| `composables/usePayment.ts` | Chỉ COD lúc checkout (ẩn VNPay/Stripe cho đến khi nối gateway) |
| `composables/useCustomerAuth.ts` | Chuyển giỏ sau login/đăng ký |

### Lấy dữ liệu & hiệu năng

| File | Thay đổi |
|------|----------|
| `composables/useSiteBundle.ts` | Một lần gọi `GET /store/storefront-bootstrap` (settings + nav) |
| `composables/useSiteSettings.ts` | Dùng lại cache bootstrap |
| `composables/useNavigation.ts` | Dùng lại state nav từ bootstrap |
| `composables/useMedusaApi.ts` | Sửa auth/header |
| `composables/useBlog.ts` | Căn API nhỏ |
| **Đã xóa** `composables/useApi.ts` | Bỏ proxy Laravel `:8000` không dùng |

### Nội dung, i18n, SEO

| File | Thay đổi |
|------|----------|
| **Đã xóa** `content/products.json` | Catalog chỉ từ Medusa |
| `content/blog.json` | Sửa URL thumbnail Unsplash |
| `locales/en.json`, `locales/vi.json` | Copy trà/quà; chuỗi tài khoản/giỏ/nav; route EN |
| `error.vue` *(mới)* | Trang lỗi tùy chỉnh không phụ thuộc i18n (sửa vòng lặp 500 `/en`) |
| `server/routes/sitemap.xml.ts` | Sản phẩm Medusa + bài campaign; đường dẫn EN |
| `server/routes/robots.txt.ts` | Chặn cart/account/admin |
| `utils/sanitizeHtml.ts` *(mới)* | `v-html` an toàn cho mô tả sản phẩm |
| `utils/storefront.ts` | `FALLBACK_PRODUCT_IMAGE`; kiểu sản phẩm |

### Cấu hình

| File | Thay đổi |
|------|----------|
| `nuxt.config.ts` | Domain ảnh; bỏ proxy Laravel; config public `cookieSecure` |
| `package.json` | Bỏ `vue-router` không dùng |

### Khác biệt dễ thấy so với `dev/be_medusajs_merge` (cùng DB)

- Header có icon tài khoản + chuyển ngôn ngữ inline
- Nút thêm/mua tôn trọng tồn kho (`inStock`)
- Giỏ hiển thị lỗi; kiểm tra tồn kho trước khi thêm
- Checkout chỉ hiện COD
- Ảnh blog tải không qua IPX
- Lỗi `/en` hiện trang tùy chỉnh thay vì 500 dây chuyền
- Một API bootstrap thay vì gọi settings + nav riêng

---

## Thay đổi backend (`apps/backend`)

### Route Store API mới

- `GET /store/storefront-bootstrap` — settings + navigation (có cache)
- `POST /store/carts/:id/validate-inventory` — kiểm tra tồn kho trước checkout
- `GET /store/variants/:id/availability` — tồn kho variant khi thêm giỏ

### Thư viện mới

| File | Mục đích |
|------|----------|
| `lib/redis.ts` | Client ioredis |
| `lib/rate-limit.ts` | Rate limit Redis (+ fallback in-memory) |
| `lib/store-cache.ts` | Cache Store API in-memory + invalidate |
| `lib/store-dto.ts` | DTO list gọn |
| `lib/pg-query.ts` | Helper SQL + `pg_advisory_lock` |
| `lib/idempotency.ts` | Key idempotency Redis |
| `lib/inventory-check.ts` | Validate tồn kho giỏ/variant |
| `api/utils/store-rate-limit.ts` | Wrapper rate limit cho store routes |
| `api/middlewares/inventory-guard.ts` | Chặn checkout khi hết hàng |

### Cập nhật route & module

- Cache store routes: nav, settings, cards, bootstrap, danh sách campaign topics/posts
- Rate limit: contact, bookings, events, order-lookup
- Booking/event: advisory lock; `my-bookings` lọc DB theo phone/email
- Webhook: idempotency Zalo/Telegram; chữ ký Zalo khi có cấu hình
- Sửa route admin nav/site-settings
- Migration: `navigation_item` phẳng, unique index care-message, `hero_images` site-settings

### Script (đã commit)

| Script | Mục đích |
|--------|----------|
| `scripts/fix-product-images.ts` | Thay thumbnail Unsplash sản phẩm bị hỏng |

### Script (WIP chưa commit)

| Script | Mục đích |
|--------|----------|
| `scripts/remove-medusa-demo-catalog.ts` | Xóa Medusa Sweatshirt/T-Shirt/Shorts/Sweatpants + danh mục Shirts/Sweatshirts/Pants/Merch |
| `scripts/seed-product-inventory.ts` | Tạo/cập nhật tồn kho (1000 đơn vị) để nút thêm giỏ không bị disable |

### Script có sẵn dùng trong bootstrap (không mới, đã gắn vào init)

| Script | Mục đích |
|--------|----------|
| `seed-base.ts` | Region, VND, shipping, publishable key |
| `seed-cards.ts` | Thẻ pillar trang chủ |
| `seed-navigation.ts` | Menu header |
| `seed-gifts.ts` | 2 sản phẩm quà doanh nghiệp |
| `seed-more-gifts.ts` | 6 sản phẩm quà trà có ảnh |
| `seed-campaign-topics.ts` | Chủ đề blog (chạy tay) |
| `seed-campaign-posts.ts` | Bài campaign mẫu (chạy tay) |

### Dependency

- **Thêm:** `ioredis`
- **Xóa:** `@medusajs/caching`, `@medusajs/draft-order`, `dnd-kit-sortable-tree`

---

## Hạ tầng (`infra/`)

### Đã commit (Pass 6)

- Service **Redis** (`redis:7-alpine`)
- **`backend-init`** one-shot: migrate + seed (tách khỏi `backend`)
- **`backend`** chỉ chạy `medusa develop` (restart nhanh hơn)
- **nginx** phục vụ `/static/` từ disk (cache 7 ngày)
- **`COOKIE_SECURE=false`** để admin login qua HTTP trong dev
- Compose prod: từ chối JWT/COOKIE secret mặc định

### WIP chưa commit — pipeline `backend-init`

Trên DB mới, `backend-init` chạy theo thứ tự:

1. `medusa db:migrate`
2. `seed-base.ts`
3. `seed-cards.ts`
4. `seed-navigation.ts`
5. **`remove-medusa-demo-catalog.ts`** — xóa sản phẩm/danh mục demo Medusa do migrate seed tạo
6. **`seed-gifts.ts`**
7. **`seed-more-gifts.ts`**
8. **`seed-product-inventory.ts`** — gán tồn kho để nút storefront hoạt động
9. Tạo user admin

---

## Biến môi trường (`.env.dev`)

| Biến | Mục đích |
|------|----------|
| `HTTP_PORT=8800` | Cổng vào duy nhất qua nginx |
| `REDIS_URL=redis://redis:6379` | Redis cấp ứng dụng |
| `COOKIE_SECURE=false` | Cookie admin qua HTTP (chỉ dev) |
| `NUXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` | Do `setup-web-integration.mjs` ghi |
| `NUXT_PUBLIC_MEDUSA_REGION_ID` | Do `setup-web-integration.mjs` ghi |
| `NUXT_PUBLIC_MEDUSA_NAVIGATION_ID` | Do `setup-web-integration.mjs` ghi |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Admin mặc định (`admin@medusa.local` / `supersecret123`) |

> Module Redis lõi Medusa (`event-bus-redis`, v.v.) vẫn **tắt** — treo khi boot trong WSL2/Docker. Redis qua `ioredis` là lớp riêng.

---

## Sửa lỗi trong phiên làm việc (ngữ cảnh)

Đã áp dụng khi test local, chưa hết commit:

1. **Nút giỏ/MUA NGAY bị xám** — sản phẩm seed có `manage_inventory: true` và `inventory_quantity: 0`. Sửa bằng `seed-product-inventory.ts`.
2. **Merch demo Medusa trên DB mới** — migrate seed Sweatshirt/T-Shirt/v.v. Xóa bằng `remove-medusa-demo-catalog.ts`.
3. **Publishable key `not_allowed`** — `.env.dev` lệch DB. Sửa bằng chạy lại `setup-web-integration.mjs` + restart `web`.
4. **Admin login qua HTTP** — cần `COOKIE_SECURE=false` trong compose env.
5. **Ảnh blog/sản phẩm 404** — URL `blog.json` + sửa IPX `BlogSnippet` + `fix-product-images.ts`.
6. **Đổi nhánh giữ nguyên DB** — checkout nhánh, chạy `setup-web-integration.mjs`, `docker compose up -d` **không** dùng `-v`.

---

## Việc còn lại

- Redirect cổng thanh toán online (VNPay/Stripe)
- Đồng bộ tồn kho đầy đủ từ stock location trong admin
- Module Redis lõi Medusa cho prod nhiều instance
- Commit WIP chưa commit (xóa demo, seed tồn kho, compose init)
- Push nhánh lên remote

---

## Lệnh Git

```bash
git checkout fix/tlcv-quality-pass
git log dev/be_medusajs_merge..fix/tlcv-quality-pass --oneline
git diff dev/be_medusajs_merge..fix/tlcv-quality-pass --stat
```

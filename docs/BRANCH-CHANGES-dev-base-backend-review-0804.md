# Branch Change Log — `dev_base_backend_review_0804`

**Created:** 2026-08-04  
**Base branch:** `dev/base` @ `7849b7af`  
**Integration branch:** `dev_base_backend_review_0804`  
**Languages:** English + Tiếng Việt (summary sections)

This document lists **every change integrated on this branch**, including work merged from two source branches, manual conflict resolutions, integration-test fixes, and items still uncommitted locally.

---

## Table of contents

1. [Executive summary](#1-executive-summary)
2. [Source branches and merge commits](#2-source-branches-and-merge-commits)
3. [Merge strategy and conflict resolution](#3-merge-strategy-and-conflict-resolution)
4. [Security changes](#4-security-changes)
5. [Backend API and middleware](#5-backend-api-and-middleware)
6. [Performance, Redis, and concurrency](#6-performance-redis-and-concurrency)
7. [Database migrations and constraints](#7-database-migrations-and-constraints)
8. [Admin dashboard (Medusa extensions)](#8-admin-dashboard-medusa-extensions)
9. [Storefront (Nuxt / apps/web)](#9-storefront-nuxt-appsweb)
10. [Infrastructure and DevOps](#10-infrastructure-and-devops)
11. [Scripts, seeds, and bootstrap](#11-scripts-seeds-and-bootstrap)
12. [Documentation added or updated](#12-documentation-added-or-updated)
13. [Dependencies and tooling](#13-dependencies-and-tooling)
14. [Complete file inventory (172 files vs dev/base)](#14-complete-file-inventory-172-files-vs-devbase)
15. [Integration and E2E testing (2026-08-04 session)](#15-integration-and-e2e-testing-2026-08-04-session)
16. [Uncommitted local changes](#16-uncommitted-local-changes)
17. [How to run and verify](#17-how-to-run-and-verify)
18. [Related documents](#18-related-documents)

---

## 1. Executive summary

### English

This branch combines **three lines of work** into one clean integration on top of `dev/base`:

| Source | Focus |
|--------|--------|
| **`dev/base`** (kept) | Navigation v2 (menu templates, drag-drop), employees admin, RBAC policies, Medusa 2.17 zod-validator port |
| **`dev/be_medusajs_merge_review0729`** | Security hardening, customer inquiries admin, sidebar badges, admin polish, storefront cart/checkout fixes |
| **`feat/tlcv-post-merge-quality-pass`** | Storefront performance (bootstrap endpoint), Redis cache, inventory guards, Docker `backend-init`, sitemap/i18n, error page |

**Stats vs `dev/base`:** 172 files changed, **+8,215 / −1,469** lines (committed).

**Post-merge session work:** Stack restart, RBAC migration, lint fix blocking backend boot, E2E smoke test script, improved sidebar badge polling.

### Tiếng Việt

Nhánh này gộp **ba luồng công việc** lên `dev/base`:

- **Giữ từ `dev/base`:** Navigation v2, quản lý nhân viên, RBAC, zod-validator Medusa 2.17  
- **Từ review0729:** Bảo mật, inquiries khách hàng, badge sidebar, polish admin, sửa giỏ hàng/checkout  
- **Từ quality-pass:** Hiệu năng storefront, Redis, guard tồn kho, Docker init, sitemap/i18n, trang lỗi  

**Thống kê so với `dev/base`:** 172 file, **+8.215 / −1.469** dòng (đã commit).

---

## 2. Source branches and merge commits

### Merge timeline

| Order | Commit | Description |
|-------|--------|-------------|
| 0 | `7849b7af` | Base: `dev/base` (PR #13 employees + navigation menus) |
| 1 | `490da95e` | **Merge** `origin/dev/be_medusajs_merge_review0729` |
| 2 | `d6200a79` | **Merge** `origin/feat/tlcv-post-merge-quality-pass` |

### All commits on branch (newest first)

Includes individual commits brought in via merges (29 commits total on branch):

| Hash | Message |
|------|---------|
| `d6200a79` | Merge feat/tlcv-post-merge-quality-pass |
| `490da95e` | merge: integrate dev/be_medusajs_merge_review0729 |
| `9e0f792f` | fix(admin): same-origin backend URL for dashboard login |
| `a3aca14e` | docs: expand bilingual changelog |
| `9a08699f` | fix(storefront): preserve cart region_id for checkout |
| `7fbcbda0` | docs: extend changelog commits 10–13 |
| `381e4311` | docs: bilingual changelog for admin/storefront |
| `e07e49fb` | fix(storefront): cart promo handling + solid cart header |
| `101797de` | feat(admin): sidebar notification badges |
| `2dcef990` | fix(storefront): blog fallback images + article SEO |
| `5b0aa88b` | chore(deps): add ts-node dev dependency |
| `e3629ea8` | fix(storefront): Medusa v2 promotions API for cart |
| `4e8d40b5` | feat(storefront): Medusa inventory on product pages |
| `8d14d5de` | fix(admin): store info, backup, TipTap, media polish |
| `89973c2f` | fix(admin): navigation page rewrite + API hardening |
| `6a886ad4` | feat(admin): customer inquiries UI and API |
| `8cc386b7` | fix(backend): admin API validation and payloads |
| `a4007357` | fix(security): redact care channel secrets |
| `00715693` | fix(security): auth for private order export downloads |
| `9f84fb37` | docs: soften review0729 wording |
| `edbadc7f` | fix(backend): harden APIs, webhooks, DB constraints |
| `30558f67` | Polish dev bootstrap, seeds, image resilience |
| `b10d2ef9` | Bootstrap: remove demo catalog, seed inventory, docs |
| `8593b852` | Pass 6: backend perf, Redis, storefront hardening |
| `9070b3c4` | Align header nav, actions, language switcher |
| `f3198902` | Fix /en 500: site-settings, nav schema, error.vue |
| `8ddaa82c` | Pass 4: sitemap i18n, cart errors, secure cookies |
| `dac6cdaf` | Pass 3: inventory flags, COD UX, README, tea promo |
| `c3cd4b9c` | Pass 2: cart transfer, sitemap, sanitize, error page |
| `770dbcf8` | Fix critical quality issues from Medusa merge review |

---

## 3. Merge strategy and conflict resolution

When both source branches touched the same files, these decisions were applied:

| Area | Decision | Rationale |
|------|----------|-----------|
| **Navigation admin UI** | Keep **`dev/base` v2** (menu templates, tree, drag-drop) | PR #13 feature set; review0729 had a flat-table rewrite |
| **Admin navigations API** | Keep **`dev/base`** (`menu_id`, validation) | Compatible with navigation v2 |
| **`seed-navigation.ts`** | Keep **`dev/base`** (menu-based seed) | Matches navigation v2 schema |
| **`setup-web-integration.mjs`** | Keep **`dev/base`** (navigation-menus API) | Seeds `storefront-header` menu correctly |
| **Employees + RBAC middleware** | Keep **`dev/base`** | PR #13 + PR #8 policies |
| **`zod-validator.ts`** | Keep **`dev/base`** full Medusa 2.17 port | Required for admin route validation |
| **Store API routes** | Take **quality-pass** | Slim DTOs, caching, rate limits |
| **`useCart.ts`** | **Combine both** | review0729: `region_id`, promotions v2; quality-pass: cart transfer, inventory check, secure cookies |
| **`middlewares.ts`** | **Merge both** | RBAC guards + private export migration + rate limits + inventory guard |
| **`docker-compose.yml`** | **Merge both** | Redis, `backend-init`, shipping-profile fix; CORS default `/.*/` for LAN |
| **Module services** (`event`, `inquiry`, `care-channel`) | Use **`pg-query.ts`** helpers | quality-pass SQL performance + review0729 business logic |
| **`store/navigations/route.ts`** | quality-pass cache + **dev/base** active menu tree | Best of both |
| **`.env.dev`** | Never commit | Local runtime keys from setup script |
| **`.env.example`** | quality-pass | Updated compose/env documentation |

---

## 4. Security changes

### 4.1 Private order export authentication (`00715693`)

| Item | Detail |
|------|--------|
| **Problem** | Medusa order-export CSVs with PII were served from public `static/` without auth |
| **Fix** | Files moved to private storage; served via `GET /static/[filename]` with session/bearer auth |
| **Migration** | `migratePrivateExportsFromStaticSync()` runs on boot |
| **Files** | `lib/private-exports/*`, `api/static/[filename]/route.ts`, `middlewares.ts`, `medusa-config.ts`, `infra/docker-compose.prod.yml`, `scripts/check-order-export.sh` |

### 4.2 Care channel secret redaction (`a4007357`)

| Item | Detail |
|------|--------|
| **Problem** | Bot tokens / Zalo access tokens returned in admin list responses |
| **Fix** | `api/admin/care-channels/redact.ts` masks secrets on GET |
| **Also** | zodValidator on create/update payloads |

### 4.3 Webhook hardening (`edbadc7f`, quality-pass)

- **Zalo webhook:** signature required when credentials configured  
- **Telegram webhook:** idempotency + validation improvements  
- **Rate limits** on store contact, bookings, event-registrations, order-lookup  

### 4.4 Backup zip safety

- New `lib/backup/zip-safety.ts` — path traversal / zip-slip checks  
- Unit tests in `lib/backup/__tests__/zip-safety.unit.spec.ts`  
- Restore flow hardened in `lib/backup/restore.ts`

### 4.5 Production compose secrets

- Prod compose refuses default JWT/COOKIE secrets (quality-pass pass 2)

---

## 5. Backend API and middleware

### 5.1 New store endpoints

| Route | Purpose |
|-------|---------|
| `GET /store/storefront-bootstrap` | Single SSR call: settings + navigations + cards (cached) |
| `GET /store/variants/:id/availability` | Lightweight stock probe before add-to-cart |
| `POST /store/carts/:id/validate-inventory` | Pre-checkout inventory validation |
| `GET /static/[filename]` | Authenticated private export downloads |

### 5.2 Admin API improvements

| Area | Changes |
|------|---------|
| **Inquiries** | List + detail pages; GET/PATCH `/admin/inquiries`; zod filters; RBAC `inquiry` resource |
| **Events** | `registered_seats` on PATCH; nested event on registration PATCH |
| **Campaign posts** | Description copied on duplicate |
| **Media** | Paginated list; extended usage types in `[id]/usage` |
| **Site settings** | Email validated as empty-or-valid |
| **Care messages** | Status filter for sidebar badge counts |
| **Navigations** | `validation.ts` for create/update; orphan children before delete |

### 5.3 Middleware (`middlewares.ts`)

Added or merged:

- `rejectBlockedAdminUser` for blocked admin metadata  
- RBAC guards for all custom admin resources (events, inquiries, navigation-menus, care-channels, backup, media, …)  
- **Rate limits:** contact (10/15min), bookings (10/15min), event-registrations (15/15min), order-lookup (30/15min)  
- **`inventoryGuardMiddleware`** on `POST /store/carts/*/complete`  
- **`migratePrivateExportsFromStaticSync()`** on boot  
- Authenticated access for `/static/private-*`  

### 5.4 Shared utilities (new)

| File | Purpose |
|------|---------|
| `api/utils/date.ts` | Date parsing/formatting helpers |
| `api/utils/pagination.ts` | Consistent list pagination |
| `api/utils/store-rate-limit.ts` | Store route rate-limit wrapper |
| `api/utils/zod-validator.ts` | Local port of Medusa zodValidator (from dev/base) |

---

## 6. Performance, Redis, and concurrency

### 6.1 Redis and caching (quality-pass)

| File | Purpose |
|------|---------|
| `lib/redis.ts` | ioredis client (app-level; Medusa core modules stay in-memory) |
| `lib/store-cache.ts` | In-memory + Redis cache for store responses |
| `lib/rate-limit.ts` | Redis-backed rate limiting |
| `lib/idempotency.ts` | Webhook idempotency keys |

**Docker:** `tlcv-redis` service added to `infra/docker-compose.yml`.

### 6.2 SQL performance

| File | Purpose |
|------|---------|
| `lib/pg-query.ts` | Raw SQL helpers for aggregates (topic counts, event seats, booking slots) |
| `lib/database-lock.ts` | PostgreSQL advisory locks |
| `lib/inventory-check.ts` | Variant quantity validation |

**Module services updated:** `event/service.ts`, `inquiry/service.ts`, `care-channel/service.ts`, `site-settings/service.ts` — use pg-query instead of loading full row sets.

### 6.3 Concurrency controls

- **Event registration:** capacity enforced under concurrent POSTs (verified: 2/5 accepted when capacity=2)  
- **Bookings:** advisory lock on slot registration  
- **Store DTOs:** `lib/store-dto.ts` — slim list payloads (campaign posts omit TipTap content)

### 6.4 Storefront bootstrap

`GET /store/storefront-bootstrap` replaces multiple SSR round-trips:

- Site settings (trimmed DTO)  
- Active navigation menu tree  
- Public cache headers + cache invalidation on admin writes  

---

## 7. Database migrations and constraints

New migrations added on this branch:

| Migration | Module | Purpose |
|-----------|--------|---------|
| `Migration20260729130000` | inquiry | DB constraints |
| `Migration20260729131000` | care-channel | Message/channel constraints |
| `Migration20260729132000` | site-settings | Schema fixes |
| `Migration20260729133000` | event | Capacity/seat constraints |
| `Migration20260729134000` | campaign | Post constraints |
| `Migration20260729135000` | card | Card constraints |
| `Migration20260722143000` | navigation | Flat navigation_item schema |
| `Migration20260729140000` | navigation | Additional nav constraints |
| `Migration20260722200000` | care-channel | Channel schema update |

**Note:** Fresh stack requires `backend-init` (`npx medusa db:migrate`) — RBAC tables (`rbac_role`, etc.) come from Medusa RBAC module migrations on `dev/base`.

---

## 8. Admin dashboard (Medusa extensions)

### 8.1 New features

| Feature | Files |
|---------|-------|
| **Customer Inquiries** | `routes/inquiries/page.tsx`, `[id]/page.tsx`, `types/inquiry.ts`, API routes |
| **Sidebar notification badges** | `lib/sidebar-badges.ts`, `components/sidebar-badges/index.tsx`, `widgets/sidebar-badges.tsx` |

**Badge behaviour:**

- Polls counts every 30s for: inquiries (status=new), event-registrations (new), care-messages (failed)  
- Clears badge when admin visits that section  
- Persistent polling across widget zones (expanded zone list mirroring language-switcher)  
- Path normalization for `/app/inquiries` vs `/inquiries`  
- Scoped DOM search within `<aside>`  

### 8.2 Admin login fix (`9e0f792f`)

| File | Change |
|------|--------|
| `medusa-config.ts` | `admin.backendUrl: ""` — same-origin API |
| `admin/lib/sdk.ts` | `baseUrl: ""` — fixes "Failed to fetch" on LAN/Ubuntu |

### 8.3 Admin polish (`8d14d5de`)

- Store info form no longer clobbers after save  
- Backup download via authenticated blob fetch  
- TipTap toolbar uses modals instead of `window.prompt`  
- Media folder i18n labels restored  
- React Query invalidation fixes on list pages (campaign-posts, events, cards, …)

### 8.4 i18n

- `admin/i18n/json/en.json` and `vi.json` — inquiries, badges, navigation, backup strings

### 8.5 Preserved from dev/base (not overwritten)

- Navigation v2 editor (`routes/navigation/page.tsx`)  
- Employees admin routes  
- Navigation-menus API (`/admin/navigation-menus`)  
- RBAC policy definitions in `policies/custom`

---

## 9. Storefront (Nuxt / apps/web)

### 9.1 Cart and checkout

| Change | Detail |
|--------|--------|
| **region_id** | Included in `CART_FIELDS`; fallback to runtime config (`9a08699f`) |
| **Promotions v2** | POST/DELETE `/store/carts/:id/promotions` instead of legacy promo_codes |
| **Cart transfer** | Guest cart linked after login (`POST /store/carts/:id/customer`) |
| **Inventory** | Validate before checkout; disable buy buttons when out of stock |
| **Secure cookies** | `cookieSecure` from runtime config / `COOKIE_SECURE` env |
| **Cart page** | Solid header (no scroll-under-nav); fetch cart on mount; promo error UX |

### 9.2 Product pages (`san-pham/[slug].vue`)

- Fetch variant inventory fields  
- `inStock` / `quickAddInStock` derived from `manage_inventory`, `allow_backorder`, `inventory_quantity`  
- Out-of-stock messaging on list and detail  
- Product description sanitized via `sanitizeHtml.ts`

### 9.3 Site bundle and performance

| File | Change |
|------|--------|
| `useSiteBundle.ts` | Uses `/store/storefront-bootstrap` for SSR |
| `useProducts.ts` | Slim list fields; region_id on product queries |
| `useNavigation.ts` | Active menu from bootstrap |
| `useSiteSettings.ts` | Trimmed DTO; fixed async-data key collision |
| **Deleted** | `composables/useApi.ts` — dead Laravel proxy |
| **Deleted** | `content/products.json` — catalog from Medusa only |

### 9.4 Layout and UX

| File | Change |
|------|--------|
| `AppHeader.vue` | Account icon, aligned nav/actions/lang switcher, tea brand copy |
| `LangSwitch.vue` | Axis alignment with header actions |
| `HomeNewsMarquee.vue` | Campaign posts from Medusa |
| `gio-hang.vue` | Cart errors, promo UI, solid header |
| `error.vue` | **New** — custom error page (no i18n crash on /en) |
| `nuxt.config.ts` | Image domains, cookie config, removed Laravel proxy |

### 9.5 SEO and content

- `sitemap.xml.ts` — Medusa products + campaign posts; EN i18n paths  
- `robots.txt.ts` — disallows cart, account, admin, /app  
- `useBlog.ts` / `blog.json` — local fallback images (no broken Unsplash)  
- `useSeoStructuredData.ts` — fix composable call during setup  
- Locales updated for tea/corporate-gifts copy (removed salon leftovers)

### 9.6 Payment

- `usePayment.ts` — COD only until VNPay/Stripe wired

---

## 10. Infrastructure and DevOps

### 10.1 Docker Compose (`infra/docker-compose.yml`)

| Change | Detail |
|--------|--------|
| **`redis` service** | `tlcv-redis` for app-level cache/rate limits |
| **`backend-init` service** | One-shot: migrate → seed-base → seeds → inventory → shipping profiles → admin user |
| **`backend` depends on init** | Backend only runs `medusa develop` after init completes |
| **CORS default** | `STORE_CORS: ${STORE_CORS:-/.*/}` — LAN IP access |
| **Volume mounts** | `/workspace` (not `/app`) to avoid Vite base path collision |
| **Named volumes** | node_modules caches for WSL/Windows performance |

**`backend-init` pipeline (in order):**

1. `medusa db:migrate`  
2. `seed-base.ts`  
3. `seed-cards.ts` (optional)  
4. `seed-navigation.ts` (optional)  
5. `remove-medusa-demo-catalog.ts` (optional)  
6. `seed-gifts.ts` / `seed-more-gifts.ts` (optional)  
7. `fix-product-images.ts` (optional)  
8. `seed-product-inventory.ts` (optional)  
9. **`fix-product-shipping-profiles.ts`** (optional) — links products to default shipping profile (fixes checkout shipping error)  
10. `seed-campaign-topics.ts` / `seed-campaign-posts.ts` (optional)  
11. `medusa user` admin create (optional if exists)  

### 10.2 Nginx (`infra/nginx/conf.d/default.conf`)

- `/webhooks/` routing  
- `/static/` served from disk with cache headers  
- Single port `:8800` for storefront + admin + store API  

### 10.3 Production compose (`infra/docker-compose.prod.yml`)

- Private export volume  
- Refuses default secrets  
- backend-init hooks aligned with dev  

### 10.4 Start scripts

| File | Purpose |
|------|---------|
| `start.dev.ps1` | **New** — Windows one-command stack start |
| `run.md` | **New** — how to run dev stack |
| `scripts/setup-web-integration.mjs` | Publishable key, VND region, shipping, navigation menu sync |

---

## 11. Scripts, seeds, and bootstrap

### 11.1 New backend scripts

| Script | Purpose |
|--------|---------|
| `remove-medusa-demo-catalog.ts` | Remove Medusa T-Shirt / Sweatshirt demo products |
| `seed-product-inventory.ts` | Assign stock to seeded products (enables MUA NGAY buttons) |
| `fix-product-images.ts` | Repair broken product thumbnail URLs |
| **`fix-product-shipping-profiles.ts`** | Link products missing shipping_profile to default profile |

### 11.2 Updated seeds

| Script | Changes |
|--------|---------|
| `seed-campaign-posts.ts` | Vietnamese tea content; idempotent create/update |
| `seed-more-gifts.ts` | Corporate gift products |
| `seed-care-channel-telegram.ts` | Safer defaults |

### 11.3 New tooling scripts

| Script | Purpose |
|--------|---------|
| `scripts/check-order-export.sh` | Verify private export auth |
| **`scripts/e2e-smoke-test.mjs`** | E2E smoke tests (session work — see §15) |

---

## 12. Documentation added or updated

| File | Description |
|------|-------------|
| `docs/CHANGELOG-ADMIN-STOREFRONT-2026-08-01.md` | Bilingual detailed changelog (review0729 commits 1–15) |
| `docs/BACKEND-CHANGES-REVIEW0729.md` | Backend-focused review notes |
| `QUALITY-PASS.md` | Quality pass 1–6 checklist |
| `note.md` | Vietnamese change journal (quality-pass branch) |
| `run.md` | Dev run guide |
| `README.md` | Rewritten for Medusa + Nuxt + Docker |
| `.env.example` | Expanded env documentation |
| **This file** | `docs/BRANCH-CHANGES-dev-base-backend-review-0804.md` |

---

## 13. Dependencies and tooling

### Root `package.json`

- Workspace scripts updated  
- Lockfile regenerated after quality-pass merge  

### `apps/backend/package.json`

- `ts-node` dev dependency (`5b0aa88b`)  
- Medusa 2.17.0 packages aligned  

### `apps/web/package.json`

- Removed unused deps  
- Nuxt config updates  

### ESLint

- `apps/backend/eslint.config.ts` — minor rule adjustments  

---

## 14. Complete file inventory (172 files vs dev/base)

Legend: **A** = added, **M** = modified, **D** = deleted

### Root and docs

```
M  .env.example
M  .gitignore
A  QUALITY-PASS.md
M  README.md
A  note.md
A  run.md
A  start.dev.ps1
M  package.json
M  package-lock.json
A  docs/BACKEND-CHANGES-REVIEW0729.md
A  docs/CHANGELOG-ADMIN-STOREFRONT-2026-08-01.md
A  scripts/check-order-export.sh
```

### apps/backend — config

```
M  apps/backend/.gitignore
M  apps/backend/eslint.config.ts
M  apps/backend/medusa-config.ts
M  apps/backend/package.json
M  apps/backend/scripts/docker-entrypoint.sh
```

### apps/backend — admin UI

```
M  apps/backend/src/admin/components/campaign-post-form/index.tsx
M  apps/backend/src/admin/components/image-picker/index.tsx
M  apps/backend/src/admin/components/media-picker-modal/index.tsx
M  apps/backend/src/admin/components/page-layout/index.tsx
A  apps/backend/src/admin/components/sidebar-badges/index.tsx
M  apps/backend/src/admin/components/storefront-links-table/index.tsx
M  apps/backend/src/admin/components/tiptap-editor/toolbar.tsx
M  apps/backend/src/admin/i18n/json/en.json
M  apps/backend/src/admin/i18n/json/vi.json
M  apps/backend/src/admin/lib/sdk.ts
A  apps/backend/src/admin/lib/sidebar-badges.ts
M  apps/backend/src/admin/routes/campaign-posts/[id]/page.tsx
M  apps/backend/src/admin/routes/campaign-posts/page.tsx
M  apps/backend/src/admin/routes/campaign-topics/[id]/page.tsx
M  apps/backend/src/admin/routes/campaign-topics/page.tsx
M  apps/backend/src/admin/routes/cards/[id]/page.tsx
M  apps/backend/src/admin/routes/cards/page.tsx
M  apps/backend/src/admin/routes/event-registrations/[id]/page.tsx
M  apps/backend/src/admin/routes/event-registrations/page.tsx
M  apps/backend/src/admin/routes/events/[id]/page.tsx
M  apps/backend/src/admin/routes/events/page.tsx
A  apps/backend/src/admin/routes/inquiries/[id]/page.tsx
A  apps/backend/src/admin/routes/inquiries/page.tsx
M  apps/backend/src/admin/routes/media/page.tsx
M  apps/backend/src/admin/routes/settings/backup/page.tsx
M  apps/backend/src/admin/routes/settings/store-info/page.tsx
A  apps/backend/src/admin/types/inquiry.ts
M  apps/backend/src/admin/types/media.ts
M  apps/backend/src/admin/widgets/category-related-collection.tsx
A  apps/backend/src/admin/widgets/sidebar-badges.tsx
```

### apps/backend — API routes

```
M  apps/backend/src/api/admin/campaign-posts/[id]/duplicate/route.ts
M  apps/backend/src/api/admin/campaign-topics/route.ts
M  apps/backend/src/api/admin/care-channels/[id]/route.ts
A  apps/backend/src/api/admin/care-channels/redact.ts
M  apps/backend/src/api/admin/care-channels/route.ts
M  apps/backend/src/api/admin/care-messages/route.ts
M  apps/backend/src/api/admin/event-registrations/[id]/route.ts
M  apps/backend/src/api/admin/event-registrations/route.ts
M  apps/backend/src/api/admin/events/[id]/route.ts
M  apps/backend/src/api/admin/events/route.ts
M  apps/backend/src/api/admin/inquiries/[id]/route.ts
M  apps/backend/src/api/admin/inquiries/route.ts
M  apps/backend/src/api/admin/media/[id]/usage/route.ts
M  apps/backend/src/api/admin/media/route.ts
A  apps/backend/src/api/admin/navigations/validation.ts
M  apps/backend/src/api/admin/site-settings/route.ts
M  apps/backend/src/api/middlewares.ts
A  apps/backend/src/api/middlewares/inventory-guard.ts
A  apps/backend/src/api/static/[filename]/route.ts
M  apps/backend/src/api/store/bookings/availability/route.ts
M  apps/backend/src/api/store/bookings/route.ts
M  apps/backend/src/api/store/campaign-posts/route.ts
M  apps/backend/src/api/store/campaign-topics/route.ts
M  apps/backend/src/api/store/cards/route.ts
A  apps/backend/src/api/store/carts/[id]/validate-inventory/route.ts
M  apps/backend/src/api/store/contact/route.ts
M  apps/backend/src/api/store/event-registrations/route.ts
M  apps/backend/src/api/store/events/route.ts
M  apps/backend/src/api/store/my-bookings/[id]/route.ts
M  apps/backend/src/api/store/my-bookings/route.ts
M  apps/backend/src/api/store/navigations/route.ts
M  apps/backend/src/api/store/order-lookup/route.ts
M  apps/backend/src/api/store/site-settings/route.ts
A  apps/backend/src/api/store/storefront-bootstrap/route.ts
A  apps/backend/src/api/store/variants/[id]/availability/route.ts
A  apps/backend/src/api/utils/__tests__/validation.unit.spec.ts
A  apps/backend/src/api/utils/date.ts
A  apps/backend/src/api/utils/pagination.ts
A  apps/backend/src/api/utils/store-rate-limit.ts
M  apps/backend/src/api/webhooks/telegram/[channel_id]/route.ts
M  apps/backend/src/api/webhooks/zalo/[channel_id]/route.ts
```

### apps/backend — lib and modules

```
A  apps/backend/src/lib/backup/__tests__/zip-safety.unit.spec.ts
M  apps/backend/src/lib/backup/fs-utils.ts
M  apps/backend/src/lib/backup/restore.ts
A  apps/backend/src/lib/backup/zip-safety.ts
A  apps/backend/src/lib/database-lock.ts
A  apps/backend/src/lib/idempotency.ts
A  apps/backend/src/lib/inventory-check.ts
A  apps/backend/src/lib/pg-query.ts
A  apps/backend/src/lib/private-exports/__tests__/paths.unit.spec.ts
A  apps/backend/src/lib/private-exports/migrate.ts
A  apps/backend/src/lib/private-exports/paths.ts
A  apps/backend/src/lib/rate-limit.ts
A  apps/backend/src/lib/redis.ts
A  apps/backend/src/lib/store-cache.ts
A  apps/backend/src/lib/store-dto.ts
(+ migrations and module service changes — see §7)
```

### apps/backend — scripts

```
A  apps/backend/src/scripts/fix-product-images.ts
A  apps/backend/src/scripts/fix-product-shipping-profiles.ts
A  apps/backend/src/scripts/remove-medusa-demo-catalog.ts
M  apps/backend/src/scripts/seed-campaign-posts.ts
M  apps/backend/src/scripts/seed-care-channel-telegram.ts
M  apps/backend/src/scripts/seed-more-gifts.ts
A  apps/backend/src/scripts/seed-product-inventory.ts
M  apps/backend/src/subscribers/order-placed.ts
```

### apps/web

```
M  apps/web/components/home/HomeNewsMarquee.vue
M  apps/web/components/home/HomePromotionsList.vue
M  apps/web/components/layout/AppHeader.vue
M  apps/web/components/sections/BlogSnippet.vue
M  apps/web/components/sections/GalleryFilter.vue
M  apps/web/components/sections/ProductCatalog.vue
M  apps/web/components/sections/ProductGroupShowcase.vue
M  apps/web/components/sections/PromoBanner.vue
M  apps/web/components/widgets/LangSwitch.vue
D  apps/web/composables/useApi.ts
M  apps/web/composables/useBlog.ts
M  apps/web/composables/useCart.ts
M  apps/web/composables/useCustomerAuth.ts
M  apps/web/composables/useMediaUrl.ts
M  apps/web/composables/useMedusaApi.ts
M  apps/web/composables/useNavigation.ts
M  apps/web/composables/usePayment.ts
M  apps/web/composables/useProducts.ts
M  apps/web/composables/useSeoStructuredData.ts
M  apps/web/composables/useServices.ts
M  apps/web/composables/useSettings.ts
M  apps/web/composables/useSiteBundle.ts
M  apps/web/composables/useSiteSettings.ts
M  apps/web/content/blog.json
D  apps/web/content/products.json
A  apps/web/error.vue
M  apps/web/layouts/default.vue
M  apps/web/locales/en.json
M  apps/web/locales/vi.json
M  apps/web/nuxt.config.ts
M  apps/web/package.json
M  apps/web/pages/gio-hang.vue
M  apps/web/pages/index.vue
M  apps/web/pages/qua-tang-doanh-nghiep.vue
M  apps/web/pages/san-pham/[slug].vue
M  apps/web/server/routes/robots.txt.ts
M  apps/web/server/routes/sitemap.xml.ts
M  apps/web/utils/medusa.ts
A  apps/web/utils/sanitizeHtml.ts
M  apps/web/utils/storefront.ts
```

### infra

```
M  infra/docker-compose.prod.yml
M  infra/docker-compose.yml
M  infra/nginx/conf.d/default.conf
```

---

## 15. Integration and E2E testing (2026-08-04 session)

Work performed after merges to validate the integrated branch.

### 15.1 Stack issues found and fixed

| Issue | Cause | Fix |
|-------|-------|-----|
| Backend **unhealthy** | Old stack missing RBAC migrations + Redis | Full `docker compose` restart with new compose |
| Backend **won't start** | Medusa dev lint fails on `zod-validator.ts` eslint-disable for missing rule | Removed bad disable; `Issue` → `Record<string, unknown>` |
| Cart E2E **500** | Test created cart without `region_id` | Fixed `e2e-smoke-test.mjs` to read region from `.env.dev` |

### 15.2 Unit tests — PASS

```text
docker exec tlcv_backend npm run test:unit
→ 5 suites passed, 20 tests passed, 2 skipped
```

Covers: care-channel format, telegram provider, zip-safety, validation, private-export paths.

### 15.3 E2E smoke tests — PASS (14/14)

Script: `node scripts/e2e-smoke-test.mjs`

| Test | Result |
|------|--------|
| GET /health | ✓ |
| GET /store/storefront-bootstrap | ✓ |
| GET /store/navigations | ✓ |
| GET /store/products (with region_id) | ✓ |
| GET /store/variants/:id/availability | ✓ |
| Cart create → add line item → validate-inventory | ✓ |
| POST /store/contact | ✓ |
| GET /store/order-lookup | ✓ |
| Admin login + GET /admin/inquiries | ✓ |
| Pages: /, /san-pham-list, /gio-hang, /app | ✓ |

### 15.4 Concurrency test — PASS

Event registration with `capacity=2`, 5 simultaneous POSTs:

- **2 × HTTP 201** (accepted)  
- **3 × HTTP 400** ("Not enough seats left")

---

## 16. Uncommitted local changes

These exist in the working tree as of 2026-08-04 but are **not** in git commits:

| File | Status | Notes |
|------|--------|-------|
| `apps/backend/src/api/utils/zod-validator.ts` | Modified | Lint boot fix (§15.1) — **should commit** |
| `scripts/e2e-smoke-test.mjs` | Untracked | E2E smoke test script — **should commit** |
| `.env.dev` | Modified | Runtime keys from setup script — **do not commit** |
| `package-lock.json` | Modified | From local `npm install` — review before commit |
| `apps/backend/static/private-*.jpg` | Deleted | Migrated to private-exports volume — expected |
| `.idea/` | Untracked | IDE config — do not commit |

---

## 17. How to run and verify

### Start stack

```powershell
cd D:\project_Dung\thanglongcheviet
git checkout dev_base_backend_review_0804
.\start.dev.ps1
```

### URLs

| Service | URL |
|---------|-----|
| Storefront | http://localhost:8800 |
| Admin | http://localhost:8800/app |
| Admin login | `admin@medusa.local` / `supersecret123` |

### Verify

```powershell
# E2E smoke tests
node scripts/e2e-smoke-test.mjs

# Unit tests
docker exec tlcv_backend npm run test:unit
```

### Stop

```powershell
docker compose -f infra/docker-compose.yml --env-file .env.dev down
```

---

## 18. Related documents

For even more detail on specific sub-areas:

| Document | Content |
|----------|---------|
| [CHANGELOG-ADMIN-STOREFRONT-2026-08-01.md](./CHANGELOG-ADMIN-STOREFRONT-2026-08-01.md) | Per-commit EN/VI changelog for review0729 (commits 1–15) |
| [BACKEND-CHANGES-REVIEW0729.md](./BACKEND-CHANGES-REVIEW0729.md) | Backend API/security deep dive |
| [../QUALITY-PASS.md](../QUALITY-PASS.md) | Quality pass 1–6 numbered checklist |
| [../note.md](../note.md) | Vietnamese session journal (quality-pass) |
| [../run.md](../run.md) | Dev run instructions |

---

*Generated for branch `dev_base_backend_review_0804` — integration of `dev/be_medusajs_merge_review0729` + `feat/tlcv-post-merge-quality-pass` on `dev/base`.*

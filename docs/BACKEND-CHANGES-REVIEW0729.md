# Backend changes — review branch `dev/be_medusajs_merge_review0729`

**Date:** 2026-07-29  
**Branch:** `dev/be_medusajs_merge_review0729` (from `dev/be_medusajs_merge`)  
**Status:** Local changes, not committed yet  

This document explains **what was wrong**, **what we fixed**, and **how to verify** — in plain language.

---

## How to use this document

1. Read **Quick summary** if you only need the big picture.
2. Use **Fixes by topic** when reviewing or testing a specific area.
3. Use **How to verify** before merging or deploying.
4. Use **New files & migrations** when applying the branch on another machine.

---

## Quick summary

We reviewed three recent commits by **cuongpm**, then audited the backend and fixed:

| Area | Result |
|------|--------|
| Broken admin saves (`zodValidator`) | Fixed — admin create/update works again |
| Telegram / Zalo care-channel bugs | Fixed — safer webhooks, seeds, order totals |
| Capacity races (events & bookings) | Fixed — locks prevent overselling |
| Store API validation | Fixed — bad dates/pagination return 400 |
| My Bookings missing records | Fixed — DB ownership filter + pagination |
| Security / ops gaps | Fixed — rate limits, FKs, backup size, ESLint |

**Bottom line:** The backend was not production-safe after the Telegram merge. These changes make it deployable and much safer. Capacity races and validation are the biggest behavioral improvements for end users.

---

## About Cuong’s commits

| Commit | What it did | Verdict |
|--------|-------------|---------|
| `bb66f792` | Remove unused npm packages | Fine — no fix needed |
| `8317ec92` | Remove unused Strapi CMS + old SRS docs | Fine — no fix needed |
| `27d0d7de` | Merge Telegram care-channel notifications | Useful feature, but shipped with **critical bugs** |

### What went wrong in the Telegram merge

1. Admin routes imported `zodValidator` from Medusa, but **Medusa 2.17 does not export it** → build failed and admin writes returned **500**.
2. Zalo webhooks could accept **unsigned** requests.
3. Telegram channels **without** a webhook secret accepted any inbound message.
4. Order totals could show as `[object Object]` in Telegram.
5. Startup seed could **overwrite** Telegram credentials edited in Admin.
6. Navigation seed called an **old API** that no longer exists (errors were hidden).

Those issues are fixed in this branch.

---

## Fixes by topic

### 1. Admin validation (release blocker)

**Problem:** Creating/updating cards, events, media, campaigns crashed.

**Fix:**

- Added local helper: `apps/backend/src/api/utils/zod-validator.ts`
- Pointed **17 admin routes** at that helper instead of `@medusajs/framework/zod`

**Result:**

- Valid create → **201**
- Invalid body → **400** (not 500)

---

### 2. Event & booking capacity (no more overselling)

**Problem:** Two people booking the last seat at the same time could both succeed.

**Fix:**

- Added `apps/backend/src/lib/database-lock.ts` (Postgres advisory lock)
- Event registration and booking creation recount capacity **inside the lock**
- Seat counts use SQL `SUM(...)` (not a truncated list of rows)

**Also:**

- Bookings now **require** a valid `preferred_time`
- Past / fake dates (e.g. `2026-99-99`) are rejected
- Admin cannot reactivate a cancelled registration if the event is full
- Admin cannot set capacity below currently reserved seats

**Verified:** 5 concurrent registrations with capacity 2 → only **2** succeeded, **3** rejected.

---

### 3. My Bookings truncation

**Problem (old behavior):**

1. Load the latest **200 bookings from everyone**
2. Filter in memory by phone/email
3. If your booking is older than those 200 global rows → **you see nothing**

**Fix:**

| Piece | Meaning |
|-------|---------|
| `normalized_phone` | Last 9 digits only (`090…`, `+84…` match) |
| `normalized_email` | Trimmed + lowercase |
| DB filter | Query only *this customer’s* bookings |
| Pagination | `limit` / `offset` / `count` |

**Files:**

- `apps/backend/src/api/store/my-bookings/route.ts`
- `apps/backend/src/modules/inquiry/models/inquiry.ts`
- Migration: `Migration20260729130000.ts`

---

### 4. Webhooks & notifications (Telegram / Zalo)

| Issue | Fix |
|-------|-----|
| Zalo missing signature accepted | Require signature when credentials exist → **401** if missing |
| Telegram with null secret accepted | Reject inbound when secret is missing |
| Duplicate inbound messages on retry | Unique DB index + conflict handling |
| Order notify sent twice on retry | Idempotency via `reference_id` |
| Order total as `[object Object]` | Format BigNumber-like totals correctly |
| Zalo token refresh race | Lock around token refresh |

---

### 5. Seeds & Docker startup

| Issue | Fix |
|-------|-----|
| Telegram seed overwrote Admin DB config every restart | Preserve DB credentials unless `TELEGRAM_SEED_FORCE_UPDATE=1` |
| Navigation seed used deleted APIs | Rewrote for `navigationModuleService` |
| Entrypoint called missing `patch-navigation-plugin.mjs` | Removed that call |
| Seed errors swallowed (`\|\| true`) | Navigation seed errors are no longer hidden |

**New env (optional):**

```env
TELEGRAM_SEED_FORCE_UPDATE=   # set to 1 only when you intentionally want env to overwrite DB
```

Documented in `.env.example` and wired in `infra/docker-compose.yml` + `docker-compose.prod.yml`.

---

### 6. Navigation admin

| Issue | Fix |
|-------|-----|
| PUT body could change a different item’s `id` | Always use URL `:id` after validation |
| No input validation | Zod schemas + parent/cycle checks |
| Raw `fetch` broke under JWT auth | Switched to `sdk.client.fetch` |

---

### 7. Media usage scan

**Problem:** Deleting an image only checked cards/campaigns. Hero / events / products could still reference it.

**Fix:** Usage scan now includes:

- Cards
- Campaign posts & topics
- Site settings (hero / about)
- Events
- Products

---

### 8. Backup restore upload size

**Problem:** Backend allowed up to 4 GB; nginx only allowed **20 MB** → restore uploads failed with 413.

**Fix:** Special nginx location:

```nginx
location = /admin/backup/restore {
    client_max_body_size 4g;
    ...
}
```

Also improved zip safety checks during restore.

---

### 9. Public API rate limiting

In-memory rate limits (per IP) on:

| Endpoint | Limit |
|----------|-------|
| `POST /store/contact` | 10 / 15 min |
| `POST /store/bookings` | 10 / 15 min |
| `POST /store/event-registrations` | 15 / 15 min |
| `GET /store/order-lookup` | 30 / 15 min |

Implemented in `apps/backend/src/api/middlewares.ts`.

---

### 10. Data integrity (foreign keys & singleton)

Migrations add:

| Constraint | Purpose |
|------------|---------|
| Event → registrations | Cascade / no orphan registrations |
| Campaign topic → posts | Invalid topic cleared on delete |
| Media folder → media | Invalid folder cleared on delete |
| Care channel → messages | Cascade |
| Navigation parent → child | Self/invalid parent cleaned |
| Site settings singleton index | Only one active settings row |

---

### 11. Pagination & store list APIs

Shared helper: `apps/backend/src/api/utils/pagination.ts`

- Negative `limit` / `offset` → **400** (was 500)
- Used by store events, campaign posts, admin list routes, my-bookings

---

### 12. ESLint

- Added `eslint` to backend package
- Fixed root `ajv` override conflict that crashed ESLint
- Simplified `eslint.config.ts`
- Lint errors from missing `@next/next` rules cleaned up

`npm run lint -w @dtc/backend` should run (warnings may remain; errors cleared).

---

## New files (important)

| File | Role |
|------|------|
| `apps/backend/src/api/utils/zod-validator.ts` | Admin body validation |
| `apps/backend/src/api/utils/date.ts` | VN calendar / past-date checks |
| `apps/backend/src/api/utils/pagination.ts` | Safe limit/offset parsing |
| `apps/backend/src/lib/database-lock.ts` | Capacity / token advisory locks |
| `apps/backend/src/lib/backup/zip-safety.ts` | Safer backup zip extraction |
| `apps/backend/src/api/admin/navigations/validation.ts` | Navigation Zod + parent checks |
| `apps/backend/src/modules/*/migrations/Migration20260729*.ts` | Schema integrity migrations |

---

## How to apply on another machine

```bash
# 1. Checkout the branch
git checkout dev/be_medusajs_merge_review0729

# 2. Install deps (from repo root)
npm install

# 3. Run migrations (Docker example)
docker exec tlcv_backend npx medusa db:migrate

# 4. Restart stack if needed
cd infra && docker compose up -d
```

---

## How to verify

### Automated

```bash
docker exec tlcv_backend npm run build
docker exec tlcv_backend npm run test:unit
docker exec -w /workspace/apps/backend tlcv_backend npm run lint
```

Expected (as of 2026-07-29):

- Build: **pass**
- Unit tests: **17 passed**, 2 skipped
- Lint: **0 errors** (warnings OK)

### Manual smoke checks

Use store publishable key header: `x-publishable-api-key: <key>`

| Check | Expected |
|-------|----------|
| `GET /store/bookings/availability?date=2026-99-99` | **400** |
| `GET /store/events?limit=-1` | **400** |
| `POST /store/bookings` without `preferred_time` | **400** |
| `POST /store/bookings` with past date | **400** |
| `POST /admin/cards` with valid body (admin auth) | **201** |
| `POST /admin/cards` with bad body | **400** |
| `POST /webhooks/zalo/:id` without signature (configured channel) | **401** |
| 5 concurrent event registrations, capacity 2 | exactly **2** succeed |

Admin login (local Docker): `admin@medusa.local` / `supersecret123`

---

## File change map (by area)

### Validation / utils
- `apps/backend/src/api/utils/*`
- All admin routes that previously imported `@medusajs/framework/zod`

### Storefront APIs
- `store/bookings/*`
- `store/event-registrations/*`
- `store/my-bookings/*`
- `store/events/route.ts`
- `store/contact/route.ts`
- `store/campaign-posts/route.ts`

### Care channel
- `modules/care-channel/**`
- `api/webhooks/**`
- `subscribers/order-placed.ts`
- `scripts/seed-care-channel-telegram.ts`

### Admin UI
- `admin/routes/navigation/page.tsx`
- `admin/routes/settings/backup/page.tsx`
- Media usage + navigation validation

### Infra
- `infra/nginx/conf.d/default.conf`
- `infra/docker-compose.yml`
- `infra/docker-compose.prod.yml`
- `.env.example`
- `apps/backend/scripts/docker-entrypoint.sh`
- Root `package.json` (ESLint / ajv)

---

## Suggested commit message (when you commit)

```text
fix(backend): harden validation, capacity locks, webhooks, and ownership queries

Replace broken Medusa zodValidator usage, prevent event/booking overselling,
fix My Bookings ownership filtering, tighten Telegram/Zalo webhook auth and
seeds, and add integrity migrations plus store rate limits.
```

---

## Still worth knowing

These are **done** for the listed audit items. Remaining product polish (not blockers from that list) may still include:

- Stronger distributed rate limiting if you scale to multiple backend replicas (current limits are in-memory per process)
- Richer admin UX for channel flags (`notify_orders` vs `receive_messages`)

---

## Checklist before merge

- [ ] `npm run build` in backend passes
- [ ] `npm run test:unit` passes
- [ ] Migrations applied on target DB
- [ ] Smoke checks above pass on staging
- [ ] Telegram env reviewed (`TELEGRAM_SEED_FORCE_UPDATE` left empty unless intentional)
- [ ] nginx config redeployed so backup restore 4g limit is active

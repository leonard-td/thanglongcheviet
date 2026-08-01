# Change Log — Admin, Backend & Storefront Improvements

**Branch:** `dev/be_medusajs_merge_review0729`  
**Date:** 2026-08-01  
**Commits:** 9 (`00715693` … `5b0aa88b`)  
**Languages:** English + Tiếng Việt

Each item uses:

| Field | Meaning |
|-------|---------|
| **Before / Trước** | What existed or was broken |
| **Changed / Đã sửa** | What was done |
| **After / Sau** | Resulting behaviour |

---

## Table of contents

1. [Commit summary](#commit-summary)
2. [Commit 1 — Private order export security](#commit-1--private-order-export-security)
3. [Commit 2 — Care channel secret redaction](#commit-2--care-channel-secret-redaction)
4. [Commit 3 — Backend API validation & responses](#commit-3--backend-api-validation--responses)
5. [Commit 4 — Customer inquiries admin UI](#commit-4--customer-inquiries-admin-ui)
6. [Commit 5 — Navigation admin rewrite](#commit-5--navigation-admin-rewrite)
7. [Commit 6 — Admin UI polish & React Query fixes](#commit-6--admin-ui-polish--react-query-fixes)
8. [Commit 7 — Storefront inventory stock](#commit-7--storefront-inventory-stock)
9. [Commit 8 — Storefront cart promotions](#commit-8--storefront-cart-promotions)
10. [Commit 9 — ts-node dependency](#commit-9--tsnode-dependency)
11. [Files not committed](#files-not-committed)
12. [Known remaining issues](#known-remaining-issues)

---

## Commit summary

| # | Hash | Message |
|---|------|---------|
| 1 | `00715693` | fix(security): require auth for private order export downloads |
| 2 | `a4007357` | fix(security): redact care channel secrets on admin list API |
| 3 | `8cc386b7` | fix(backend): improve admin API validation and response payloads |
| 4 | `6a886ad4` | feat(admin): add customer inquiries UI and API |
| 5 | `89973c2f` | fix(admin): rewrite navigation page and harden navigations API |
| 6 | `8d14d5de` | fix(admin): polish store info, backup download, editor, and media |
| 7 | `4e8d40b5` | feat(storefront): reflect Medusa inventory on product pages |
| 8 | `e3629ea8` | fix(storefront): apply cart promotions via Medusa v2 promotions API |
| 9 | `5b0aa88b` | chore(deps): add ts-node dev dependency |

---

## Commit 1 — Private order export security

**Commit:** `00715693`  
**Files:** `medusa-config.ts`, `middlewares.ts`, `api/static/[filename]/route.ts`, `lib/private-exports/*`, `lib/backup/fs-utils.ts`, `.gitignore`, `infra/docker-compose.prod.yml`, `scripts/check-order-export.sh`

### 1.1 Public CSV exposure (CRITICAL)

**English**

| | |
|---|---|
| **Before** | Medusa saved order-export CSV files as `private-*.csv` under the public `static/` folder. Anyone with the URL could download customer PII (names, emails, phones, addresses) without logging in. Legacy files could also be committed to git. |
| **Changed** | Private exports moved to `.private-exports/`. Added authenticated `GET /static/private-*` handling, startup migration from old `static/` paths, gitignore rules, backup walk skip, prod Docker volume, and a shell check script. |
| **After** | Unauthenticated requests → **401 Unauthorized**. Logged-in admin → **200** with file download. Public assets (e.g. favicon) under `/static/` still work. Customer PII is no longer world-readable. |

**Tiếng Việt**

| | |
|---|---|
| **Trước** | Medusa lưu file export đơn hàng dạng `private-*.csv` trong thư mục `static/` công khai. Ai có URL đều tải được PII khách hàng mà không cần đăng nhập. File cũ có thể bị commit vào git. |
| **Đã sửa** | Chuyển export riêng sang `.private-exports/`, thêm xử lý `GET /static/private-*` có auth, migration khi khởi động, gitignore, bỏ qua khi backup, volume Docker prod, script kiểm tra. |
| **Sau** | Không đăng nhập → **401**. Admin đăng nhập → **200** tải file. Asset public `/static/` vẫn hoạt động. PII không còn lộ công khai. |

---

### 1.2 `medusa-config.ts` — private upload directory

**English**

| **Before** | All uploads, including private order exports, went to `static/`. |
| **Changed** | Added `private_upload_dir: ".private-exports"`. |
| **After** | New private exports are written directly to `.private-exports/` instead of the public static tree. |

**Tiếng Việt**

| **Trước** | Mọi upload, kể cả export đơn hàng riêng, đều vào `static/`. |
| **Đã sửa** | Thêm `private_upload_dir: ".private-exports"`. |
| **Sau** | Export riêng mới ghi thẳng vào `.private-exports/`, không qua static công khai. |

---

### 1.3 `middlewares.ts` — authentication on boot migration

**English**

| **Before** | No authentication on `/static/private-*`; no migration for legacy files. |
| **Changed** | Runs `migratePrivateExportsFromStaticSync()` at startup. Adds `authenticate("user", ["session", "bearer"])` middleware on `GET /static/private-*`. |
| **After** | Legacy CSVs are moved out of `static/` once per process start. Private export URLs require a valid admin session or bearer token. |

**Tiếng Việt**

| **Trước** | Không auth cho `/static/private-*`; không migration file cũ. |
| **Đã sửa** | Chạy migration khi boot; thêm middleware `authenticate("user")` cho `GET /static/private-*`. |
| **Sau** | File CSV cũ được chuyển khỏi `static/` khi khởi động. URL export riêng bắt buộc session/token admin. |

---

### 1.4 New `api/static/[filename]/route.ts`

**English**

| **Before** | Express static middleware served everything under `static/` with no per-file auth. |
| **Changed** | Custom route handler for filenames matching `private-*`. Reads from `.private-exports/` with path traversal protection. |
| **After** | Authenticated admin receives `Content-Disposition: attachment` download. Invalid filenames → 400. Missing files → 404. |

**Tiếng Việt**

| **Trước** | Express static phục vụ mọi file trong `static/` không cần auth. |
| **Đã sửa** | Route tùy chỉnh cho tên `private-*`, đọc từ `.private-exports/`, chống path traversal. |
| **Sau** | Admin đã auth nhận file download. Tên không hợp lệ → 400. Không có file → 404. |

---

### 1.5 New `lib/private-exports/` module

**English**

| **Before** | No shared helper for resolving or migrating private export paths. |
| **Changed** | Added `paths.ts` (regex + safe resolve), `migrate.ts` (move legacy files sync on boot), `paths.unit.spec.ts` (unit tests). |
| **After** | Path resolution is tested and safe. Migration is idempotent per server process. |

**Tiếng Việt**

| **Trước** | Không có module helper cho đường dẫn export riêng. |
| **Đã sửa** | Thêm `paths.ts`, `migrate.ts`, unit test. |
| **Sau** | Resolve path an toàn, có test. Migration chạy một lần mỗi process, idempotent. |

---

### 1.6 `.gitignore` and backup walk

**English**

| **Before** | Private CSVs could be tracked in git. Backup zip walk included private export files. |
| **Changed** | Ignore `/static/private-*` and `/.private-exports`. `fs-utils.ts` skips filenames starting with `private-` during media backup walk. |
| **After** | Lower risk of PII in git history or backup archives. |

**Tiếng Việt**

| **Trước** | CSV riêng có thể bị commit; backup quét cả file export. |
| **Đã sửa** | Gitignore + bỏ qua `private-*` khi walk backup. |
| **Sau** | Giảm rủi ro lộ PII trong git hoặc file backup. |

---

### 1.7 `infra/docker-compose.prod.yml`

**English**

| **Before** | No dedicated volume for private exports in production. |
| **Changed** | Added `backend_private_exports` volume mounted into the backend container. |
| **After** | Order export files survive container restarts and redeploys in prod. |

**Tiếng Việt**

| **Trước** | Prod không có volume riêng cho export đơn hàng. |
| **Đã sửa** | Thêm volume `backend_private_exports`. |
| **Sau** | File export sống sót qua restart/redeploy prod. |

---

### 1.8 New `scripts/check-order-export.sh`

**English**

| **Before** | No scripted way to verify export URL auth behaviour. |
| **Changed** | Shell script to curl export URL without and with credentials. |
| **After** | DevOps can quickly confirm 401 vs 200 on private export endpoints. |

**Tiếng Việt**

| **Trước** | Không có script kiểm tra auth export. |
| **Đã sửa** | Script curl kiểm tra có/không credential. |
| **Sau** | Kiểm tra nhanh 401 vs 200 trên endpoint export riêng. |

---

## Commit 2 — Care channel secret redaction

**Commit:** `a4007357`  
**Files:** `api/admin/care-channels/redact.ts`, `route.ts`, `[id]/route.ts`

### 2.1 List API secret masking

**English**

| **Before** | `GET /admin/care-channels` returned full `bot_token`, `access_token`, and other secrets in JSON for every row in the list. |
| **Changed** | New `redactCareChannel()` helper masks sensitive string fields with `••••••••`. List endpoint maps all channels through redaction before responding. |
| **After** | Browser devtools and network logs on the list page no longer expose raw Telegram/Zalo tokens. **Note:** detail `GET` and `PATCH` still return full credentials (known open issue). |

**Tiếng Việt**

| **Trước** | `GET /admin/care-channels` trả token Telegram/Zalo thật trong danh sách. |
| **Đã sửa** | Helper `redactCareChannel()` che secret bằng `••••••••` trước khi trả JSON list. |
| **Sau** | Trang danh sách không còn lộ token thô. **Lưu ý:** trang chi tiết vẫn trả credential đầy đủ. |

---

### 2.2 zodValidator on care channel create/update

**English**

| **Before** | `CreateCareChannelSchema.parse()` and `UpdateCareChannelSchema.parse()` threw unhandled errors → generic 500 on bad input. |
| **Changed** | Replaced with `await zodValidator(...)` on POST and PATCH. |
| **After** | Invalid payloads return consistent validation errors instead of server crashes. |

**Tiếng Việt**

| **Trước** | `.parse()` gây lỗi 500 khi body không hợp lệ. |
| **Đã sửa** | Dùng `zodValidator` cho POST và PATCH. |
| **Sau** | Body sai trả lỗi validation rõ ràng, không crash 500. |

---

## Commit 3 — Backend API validation & responses

**Commit:** `8cc386b7`  
**Files:** campaign duplicate, care-messages, event-registrations, events, media, site-settings routes

### 3.1 zodValidator on care-messages POST

**English**

| **Before** | Direct `.parse()` on request body. |
| **Changed** | Uses `zodValidator`. |
| **After** | Cleaner error handling for invalid care message payloads. |

**Tiếng Việt**

| **Trước** | Dùng `.parse()` trực tiếp. |
| **Đã sửa** | Chuyển sang `zodValidator`. |
| **Sau** | Lỗi validation rõ ràng hơn cho care messages. |

---

### 3.2 Site settings email validation

**English**

| **Before** | Email field could fail validation when admin cleared it to empty string `""`. |
| **Changed** | Zod schema accepts `""` or a valid email, then transforms empty string to `null`. |
| **After** | Admin can clear the store email field and save successfully; stored value becomes `null`. |

**Tiếng Việt**

| **Trước** | Xóa email (để `""`) có thể fail validation. |
| **Đã sửa** | Schema cho phép `""` hoặc email hợp lệ, transform `""` → `null`. |
| **Sau** | Admin xóa email trên form lưu được; DB lưu `null`. |

---

### 3.3 Event PATCH returns `registered_seats`

**English**

| **Before** | After editing an event, PATCH response omitted the live `registered_seats` count that GET included. |
| **Changed** | PATCH handler counts registrations and returns `{ ...event, registered_seats }`. |
| **After** | Event detail page shows correct seat count immediately after save without full reload. |

**Tiếng Việt**

| **Trước** | PATCH event không trả `registered_seats` như GET. |
| **Đã sửa** | PATCH đếm đăng ký và trả kèm `registered_seats`. |
| **Sau** | Số chỗ đăng ký đúng ngay sau khi lưu sự kiện. |

---

### 3.4 Event registration PATCH includes nested `event`

**English**

| **Before** | PATCH `/admin/event-registrations/:id` returned the registration row only — no linked event title/slug. |
| **Changed** | After update, loads the parent event and attaches it to the response (same shape as GET). |
| **After** | Registration detail page keeps showing event name after status update. |

**Tiếng Việt**

| **Trước** | PATCH đăng ký sự kiện không kèm object `event`. |
| **Đã sửa** | Load event cha và gắn vào response sau update. |
| **Sau** | Trang chi tiết vẫn hiện tên sự kiện sau khi đổi trạng thái. |

---

### 3.5 Campaign post duplicate copies `description`

**English**

| **Before** | Duplicating a campaign post copied title/slug/content but dropped the `description` field. |
| **Changed** | Duplicate payload includes `description: post.description ?? null`. |
| **After** | Duplicated posts retain their description text. |

**Tiếng Việt**

| **Trước** | Nhân bản bài viết mất trường `description`. |
| **Đã sửa** | Copy kèm `description`. |
| **Sau** | Bài nhân bản giữ nguyên mô tả. |

---

### 3.6 Media list pagination

**English**

| **Before** | Media API always fetched up to 500 files with no `limit`/`offset` support in the response contract. |
| **Changed** | Uses shared `parsePagination()` with configurable limit (max 500) and offset; response includes pagination metadata. |
| **After** | Admin media library can page through large libraries; API contract is consistent with other list endpoints. |

**Tiếng Việt**

| **Trước** | API media luôn lấy tối đa 500 file, không phân trang. |
| **Đã sửa** | Thêm `limit`/`offset` qua `parsePagination()`, max 500. |
| **Sau** | Thư viện media lớn có thể phân trang; API thống nhất với endpoint list khác. |

---

## Commit 4 — Customer inquiries admin UI

**Commit:** `6a886ad4`  
**Files:** `admin/routes/inquiries/*`, `admin/types/inquiry.ts`, `api/admin/inquiries/*`, `i18n/en.json`, `i18n/vi.json`

### 4.1 New admin list page

**English**

| **Before** | Inquiries existed in the database and API only. No menu entry or UI under Medusa Admin Extensions. |
| **Changed** | New `routes/inquiries/page.tsx` with DataTable, type/status filters, pagination, badge colours, navigation to detail. |
| **After** | Admin → **Customer Inquiries** shows all contact and booking submissions with filterable list. |

**Tiếng Việt**

| **Trước** | Inquiries chỉ có trong DB/API, không có giao diện admin. |
| **Đã sửa** | Trang list mới với bảng, filter loại/trạng thái, phân trang, badge màu. |
| **Sau** | Admin → **Customer Inquiries** xem được mọi liên hệ/đặt lịch. |

---

### 4.2 New admin detail page

**English**

| **Before** | No way to view one inquiry or update its status from admin. |
| **Changed** | New `routes/inquiries/[id]/page.tsx` showing customer info, message, source, schedule, and status dropdown with save. |
| **After** | Staff can open an inquiry, review details, and mark it confirmed/completed/cancelled. |

**Tiếng Việt**

| **Trước** | Không xem chi tiết hay đổi trạng thái inquiry từ admin. |
| **Đã sửa** | Trang `[id]/page.tsx` hiện thông tin khách, nội dung, nguồn, lịch hẹn, dropdown trạng thái. |
| **Sau** | Nhân viên xem chi tiết và cập nhật trạng thái xử lý. |

---

### 4.3 New `GET /admin/inquiries/:id`

**English**

| **Before** | Only list endpoint existed; detail page had no single-record fetch. |
| **Changed** | Added GET handler in `inquiries/[id]/route.ts`. |
| **After** | Detail page loads one inquiry by ID; returns 404 when not found. |

**Tiếng Việt**

| **Trước** | Chỉ có API list, không lấy một record. |
| **Đã sửa** | Thêm `GET /admin/inquiries/:id`. |
| **Sau** | Trang chi tiết load theo ID; không có → 404. |

---

### 4.4 Inquiry list filter validation

**English**

| **Before** | `type` and `status` query params accepted any arbitrary string. |
| **Changed** | Zod schema validates `type` as `contact|booking` and `status` as `new|confirmed|completed|cancelled`; uses `zodValidator`. |
| **After** | Invalid filter values are rejected; admin UI only sends valid enum values. |

**Tiếng Việt**

| **Trước** | Query `type`/`status` nhận chuỗi bất kỳ. |
| **Đã sửa** | Zod validate enum loại và trạng thái. |
| **Sau** | Filter sai bị từ chối; UI chỉ gửi giá trị hợp lệ. |

---

### 4.5 TypeScript types and i18n

**English**

| **Before** | No shared `Inquiry` type; no EN/VI strings for inquiries screens. |
| **Changed** | Added `admin/types/inquiry.ts`. Added ~118 lines of inquiry + navigation sidebar keys in `en.json` and `vi.json`. |
| **After** | Type-safe admin code; inquiries UI fully translatable EN/VI. |

**Tiếng Việt**

| **Trước** | Không có type `Inquiry`; không có chuỗi i18n. |
| **Đã sửa** | Thêm `inquiry.ts` và key i18n EN/VI (~118 dòng/locale). |
| **Sau** | Code type-safe; UI inquiries song ngữ EN/VI. |

---

## Commit 5 — Navigation admin rewrite

**Commit:** `89973c2f`  
**Files:** `admin/routes/navigation/page.tsx`, `api/admin/navigations/[id]/route.ts`, `validation.ts`, `scripts/setup-web-integration.mjs`

### 5.1 Navigation page full rewrite

**English**

| **Before** | Old page used manual `fetch`, sent `"null"` string for empty parent, had weak error handling, no toasts, minimal i18n, and PUT payloads that could break the API. |
| **Changed** | Rebuilt with React Query, Medusa UI `PageLayout`, proper form state (`parent_id: null`), create/edit/delete with confirm dialogs, success/error toasts, EN/VI labels, trimmed PUT payload. |
| **After** | Navigation CRUD is reliable and matches the custom `/admin/navigations` module API. |

**Tiếng Việt**

| **Trước** | Trang cũ fetch thủ công, parent gửi `"null"`, ít xử lý lỗi, không toast, ít i18n, PUT dễ lỗi. |
| **Đã sửa** | Viết lại với React Query, PageLayout, form đúng, confirm xóa, toast, song ngữ. |
| **Sau** | CRUD menu ổn định, khớp API `/admin/navigations`. |

---

### 5.2 Orphan-safe DELETE

**English**

| **Before** | Deleting a parent navigation item could leave children pointing at a deleted `parent_id`. |
| **Changed** | DELETE handler sets all direct children’s `parent_id` to `null` before removing the parent. |
| **After** | Deleted parent → children become top-level menu items instead of broken orphans. |

**Tiếng Việt**

| **Trước** | Xóa menu cha có thể để con trỏ vào id đã xóa. |
| **Đã sửa** | Trước DELETE, gán `parent_id = null` cho tất cả con trực tiếp. |
| **Sau** | Xóa cha → con thành mục gốc, không orphan lỗi. |

---

### 5.3 Navigation update validation schema

**English**

| **Before** | `UpdateNavigationItemSchema` was too strict for partial PATCH-style updates. |
| **Changed** | Switched to `.partial()` with a refine requiring at least one field. |
| **After** | Single-field updates (e.g. toggle `is_active` only) succeed. |

**Tiếng Việt**

| **Trước** | Schema update quá strict, PATCH một field có thể fail. |
| **Đã sửa** | `.partial()` + refine tối thiểu một field. |
| **Sau** | Cập nhật từng field riêng lẻ hoạt động. |

---

### 5.4 Setup script navigation seed

**English**

| **Before** | `setup-web-integration.mjs` targeted an old plugin shape (`name: storefront-header`, nested `items` in one POST). |
| **Changed** | Seeds flat items via `POST /admin/navigations` per row; creates children with correct `parent_id`; skips seeding if any items already exist. |
| **After** | Fresh install gets a default Vietnamese menu; re-running the script is safe; no bogus `NUXT_PUBLIC_MEDUSA_NAVIGATION_ID`. |

**Tiếng Việt**

| **Trước** | Script seed theo plugin cũ, payload không khớp module navigation hiện tại. |
| **Đã sửa** | Seed từng item qua API mới; con có `parent_id` đúng; bỏ qua nếu đã có menu. |
| **Sau** | Cài mới có menu mặc định tiếng Việt; chạy lại script an toàn. |

---

## Commit 6 — Admin UI polish & React Query fixes

**Commit:** `8d14d5de`  
**Files:** 20 admin components/routes/widgets (see commit stat above)

### 6.1 React Query key flattening

**English**

| **Before** | Many admin pages used nested query keys like `[["cards"]]` or `[["site-settings"]]`. React Query treats `["cards"]` and `[["cards"]]` as different keys, so `invalidateQueries({ queryKey: ["cards"] })` often did nothing. Lists and pickers stayed stale after save/delete. |
| **Changed** | Flattened keys to `["cards"]`, `["site-settings"]`, `["campaign-posts", limit, offset]`, etc. across cards, campaign-posts, campaign-topics, events, event-registrations, image-picker, media-picker, campaign-post-form, storefront-links-table, category-related-collection widget. |
| **After** | After any mutation, related lists and pickers refresh correctly. |

**Tiếng Việt**

| **Trước** | Query key dạng `[["cards"]]` — invalidate cache không khớp → UI cũ sau lưu/xóa. |
| **Đã sửa** | Đổi thành `["cards"]`, `["site-settings"]`, ... trên ~15 file admin. |
| **Sau** | Sau mutation, danh sách và picker cập nhật đúng. |

**Affected files:** `cards/page.tsx`, `campaign-posts/page.tsx`, `campaign-topics/page.tsx`, `events/page.tsx`, `event-registrations/page.tsx`, `campaign-post-form`, `image-picker`, `media-picker-modal`, `storefront-links-table`, `category-related-collection.tsx`

---

### 6.2 Detail loader revalidation

**English**

| **Before** | Detail pages load data via React Router `loader`. After save, React Query cache was invalidated but loader data on the same page stayed old until manual navigation away and back. |
| **Changed** | Added `useRevalidator()` + `revalidator.revalidate()` in `onSuccess` of save mutations on detail pages. |
| **After** | Detail forms immediately reflect saved data (title, status, counts, etc.). |

**Tiếng Việt**

| **Trước** | Sau lưu, dữ liệu loader trên trang chi tiết vẫn cũ. |
| **Đã sửa** | Gọi `revalidator.revalidate()` sau save thành công. |
| **Sau** | Form chi tiết hiển thị dữ liệu mới ngay. |

**Affected files:** `cards/[id]`, `campaign-posts/[id]`, `campaign-topics/[id]`, `events/[id]`, `event-registrations/[id]`

---

### 6.3 Store info page form stability

**English**

| **Before** | After saving store info, a `useEffect` could re-sync form state from a stale fingerprint and overwrite in-progress edits. TipTap `editorKey` tied to `loadedId` caused unnecessary editor remounts. |
| **Changed** | Uses `lastSyncedRef` + JSON fingerprint to sync only when server data actually changes. Flat query key `["site-settings"]`. Stable `editorKey` from settings record id. |
| **After** | Saving store info no longer clobbers the form; rich-text editor stays stable after load. |

**Tiếng Việt**

| **Trước** | Sau lưu, effect có thể ghi đè form; TipTap remount không cần thiết. |
| **Đã sửa** | Fingerprint ref chỉ sync khi server data thay đổi; query key phẳng; editorKey ổn định. |
| **Sau** | Lưu thông tin cửa hàng không làm mất dữ liệu đang sửa. |

---

### 6.4 Backup download

**English**

| **Before** | Download button used `window.open('/admin/backup/files/...')` which often failed because session cookies were not sent reliably or opened a blank tab. |
| **Changed** | Uses `fetch(url, { credentials: "include" })`, converts response to blob, triggers download via temporary `<a download>` element. |
| **After** | Backup zip downloads reliably for logged-in admin users. |

**Tiếng Việt**

| **Trước** | `window.open` tải backup hay fail vì cookie auth. |
| **Đã sửa** | `fetch` + blob + anchor download có credentials. |
| **Sau** | Tải zip backup ổn định khi đã đăng nhập admin. |

---

### 6.5 TipTap toolbar — link and YouTube modals

**English**

| **Before** | Insert link and YouTube embed used `window.prompt()` — blocked or poor UX in embedded Medusa admin iframe. |
| **Changed** | Replaced with Medusa `FocusModal` + `Input` + Save/Cancel buttons for URL entry. |
| **After** | Editors can add links and YouTube embeds through a proper in-app modal. |

**Tiếng Việt**

| **Trước** | Nhập URL link/YouTube bằng `window.prompt()`. |
| **Đã sửa** | Modal FocusModal + Input. |
| **Sau** | Chèn link/YouTube qua dialog chuẩn trong admin. |

---

### 6.6 Cards page lock icon

**English**

| **Before** | Locked cards displayed a raw emoji 🔒 in the UI. |
| **Changed** | Replaced with Medusa `LockClosedSolid` icon component. Also fixed query key paths for reorder/import/delete cache updates. |
| **After** | Consistent icon styling with the rest of Medusa Admin; card list cache updates work. |

**Tiếng Việt**

| **Trước** | Icon khóa là emoji 🔒; cache key sai. |
| **Đã sửa** | Dùng `LockClosedSolid`; sửa query key/invalidate. |
| **Sau** | Icon đồng bộ Medusa UI; thao tác card cập nhật list đúng. |

---

### 6.7 Media library labels and types

**English**

| **Before** | Folder rename/delete context menu labels were commented out in code. `UsageEntry` types did not cover all usage kinds returned by the API. |
| **Changed** | Restored i18n labels for folder actions. Extended `UsageEntry` with `campaign_topic`, `site_settings`, `event`, `product`. Fixed media page query invalidation key. |
| **After** | Folder actions show proper EN/VI labels; usage references display correct entity types. |

**Tiếng Việt**

| **Trước** | Nhãn đổi tên/xóa thư mục bị comment; type usage thiếu loại entity. |
| **Đã sửa** | Bật lại i18n; mở rộng `UsageEntry`; sửa invalidate key. |
| **Sau** | Thao tác thư mục có nhãn; usage hiển thị đúng loại entity. |

---

## Commit 7 — Storefront inventory stock

**Commit:** `4e8d40b5`  
**Files:** `useProducts.ts`, `medusa.ts`, `storefront.ts`, `[slug].vue`, list components

### 7.1 Fetch inventory fields from Store API

**English**

| **Before** | Product fetch did not request `manage_inventory`, `allow_backorder`, or `inventory_quantity` on variants. |
| **Changed** | Added `*variants.manage_inventory`, `*variants.allow_backorder`, `*variants.inventory_quantity` to `PRODUCT_FIELDS` in `useProducts.ts`. |
| **After** | Store API responses include per-variant stock metadata. |

**Tiếng Việt**

| **Trước** | Không lấy field tồn kho từ Store API. |
| **Đã sửa** | Thêm field inventory trên variants trong `PRODUCT_FIELDS`. |
| **Sau** | API trả metadata tồn kho theo từng variant. |

---

### 7.2 `isVariantInStock()` helper

**English**

| **Before** | Every product and variant was hardcoded `inStock: true` in `transformMedusaProduct()`. |
| **Changed** | New `isVariantInStock()` applies Medusa rules: |
| | • `manage_inventory === false` → in stock |
| | • `allow_backorder === true` → in stock |
| | • `inventory_quantity == null` → in stock (safe default when API omits the field) |
| | • otherwise → in stock only if `inventory_quantity > 0` |
| **After** | Shop reflects real inventory when data is present. Missing quantity does not falsely mark items out of stock. |

**Tiếng Việt**

| **Trước** | Luôn `inStock: true` cho mọi sản phẩm/variant. |
| **Đã sửa** | Hàm `isVariantInStock()` theo quy tắc Medusa: |
| | • không quản lý kho → còn hàng |
| | • cho phép backorder → còn hàng |
| | • thiếu `inventory_quantity` → coi là còn hàng (mặc định an toàn) |
| | • còn lại → còn hàng khi `inventory_quantity > 0` |
| **Sau** | Cửa hàng hiển thị tồn kho thật khi API có số. Thiếu field không chặn nhầm “hết hàng”. |

---

### 7.3 Product-level and `quickAddInStock`

**English**

| **Before** | `Product` type only had `inStock` (any variant in stock). List quick-add always used first variant logic implicitly. |
| **Changed** | Product `inStock` = any variant in stock. Added `quickAddInStock` = stock status of the first/default variant used for list quick-add. |
| **After** | SEO/schema can use overall availability; list card buttons respect the variant actually added to cart. |

**Tiếng Việt**

| **Trước** | Chỉ có `inStock` (bất kỳ variant nào còn hàng). |
| **Đã sửa** | `inStock` = có variant còn hàng; `quickAddInStock` = tồn kho variant mặc định cho nút thêm nhanh. |
| **Sau** | Schema SEO dùng availability chung; nút list khớp variant thêm vào giỏ. |

---

### 7.4 Product detail page `[slug].vue`

**English**

| **Before** | Add-to-cart always enabled. Option combinations ignored stock. No out-of-stock message. |
| **Changed** | `canAddToCart` requires `selectedVariant.inStock`. Option buttons filter/disable OOS combinations. Shows translated “Out of stock” / “Tạm hết hàng”. Same logic in quick-buy modal. |
| **After** | Customers cannot add OOS variants. Clear messaging when unavailable. |

**Tiếng Việt**

| **Trước** | Luôn bấm mua được; option không xét tồn kho; không báo hết hàng. |
| **Đã sửa** | `canAddToCart` cần variant còn hàng; disable option hết hàng; hiện “Tạm hết hàng”. |
| **Sau** | Không thêm OOS vào giỏ; thông báo rõ ràng. |

---

### 7.5 List components use `quickAddInStock`

**English**

| **Before** | `ProductCardActions` and list sections used `p.inStock` (true if any variant had stock). |
| **Changed** | Switched to `p.quickAddInStock` in `HomePromotionsList`, `ProductCatalog`, `ProductGroupShowcase`. |
| **After** | Quick-add buttons on catalog/home/related sections match the default variant’s actual stock. |

**Tiếng Việt**

| **Trước** | Nút list dùng `inStock` chung (bất kỳ variant nào còn hàng). |
| **Đã sửa** | Dùng `quickAddInStock` trên các component list. |
| **Sau** | Nút thêm nhanh khớp tồn kho variant mặc định. |

---

## Commit 8 — Storefront cart promotions

**Commit:** `e3629ea8`  
**Files:** `apps/web/composables/useCart.ts`

### 8.1 Apply promotion codes

**English**

| **Before** | Coupon codes sent via `POST /store/carts/:id` with body `{ promo_codes: [...] }`. Medusa v2 returned 200 but **did not apply discounts**. |
| **Changed** | Apply via `POST /store/carts/:id/promotions` with `{ promo_codes }`. Remove via `DELETE /store/carts/:id/promotions` with `{ promo_codes }`. Expanded `CART_FIELDS` to include `+items.total`, `+promotions`, discount/subtotal fields. |
| **After** | Valid coupon codes (e.g. active automatic/manual promotions) apply real discounts. Cart page shows updated totals. |

**Tiếng Việt**

| **Trước** | Gửi mã qua update cart `{ promo_codes }` → 200 nhưng **không giảm giá** trên Medusa v2. |
| **Đã sửa** | Apply/remove qua `/store/carts/:id/promotions`; mở rộng `CART_FIELDS` lấy totals/promotions. |
| **Sau** | Mã giảm giá hợp lệ áp dụng thật; trang giỏ hiện tổng tiền sau giảm. |

---

### 8.2 Cart line item placeholder type

**English**

| **Before** | After adding `quickAddInStock` to `Product` type, cart line item mapping was missing the new field → TypeScript/build error risk. |
| **Changed** | Set `quickAddInStock: true` on synthetic product objects inside cart line mapping. |
| **After** | Build passes; cart display behaviour unchanged. |

**Tiếng Việt**

| **Trước** | Thiếu field `quickAddInStock` sau khi đổi type Product. |
| **Đã sửa** | Thêm `quickAddInStock: true` cho product giả trong cart items. |
| **Sau** | Build OK; hiển thị giỏ hàng không đổi. |

---

## Commit 9 — ts-node dependency

**Commit:** `5b0aa88b`  
**Files:** `apps/backend/package.json`, `package-lock.json`

**English**

| **Before** | No `ts-node` in backend devDependencies. |
| **Changed** | Added `ts-node@^10.9.2` and updated lockfile. |
| **After** | TypeScript scripts can be run directly with ts-node when needed. |

**Tiếng Việt**

| **Trước** | Chưa có `ts-node` trong devDependencies backend. |
| **Đã sửa** | Thêm `ts-node@^10.9.2` + cập nhật lockfile. |
| **Sau** | Chạy script TypeScript trực tiếp thuận tiện hơn. |

---

## Files not committed

These were intentionally left out of the 9 commits:

| File / folder | Reason |
|---------------|--------|
| `.env.dev` | Local environment; may contain secrets |
| `.idea/` | IDE metadata |
| `docker-up.log` | Local log file |
| `docs/PHAN-TICH-CAU-TRUC-TRANG-CHU.md` | Draft analysis doc |
| `docs/REVIEW-UIUX-TRANG-CHU.md` | Draft review doc |

**English:** Do not commit `.env.dev` without reviewing for secrets.

**Tiếng Việt:** Không commit `.env.dev` nếu chưa kiểm tra secret.

---

## Known remaining issues

Issues discussed during review but **not fixed** in these 9 commits:

| # | Issue | EN | VI |
|---|-------|----|----|
| 1 | Care channel detail API | `GET/PATCH /admin/care-channels/:id` still returns full secrets | API chi tiết vẫn trả credential đầy đủ |
| 2 | Strict OOS when API omits qty | Current default treats missing `inventory_quantity` as in stock (may allow oversell if API never sends the field) | Thiếu field API vẫn coi còn hàng (có thể bán quá nếu API không gửi số) |
| 3 | Category related collection widget | Stale UI after save (query key fixed; loader revalidation not added here) | Widget collection liên quan có thể cũ sau lưu |
| 4 | Storefront product cap | Catalog may cap at 100 products in some views | Một số view giới hạn 100 sản phẩm |
| 5 | Dual description editors | Products admin may have conflicting description UIs | Admin sản phẩm có thể trùng editor mô tả |
| 6 | Promotion TEST10 | Draft promotion will not apply until set Active | Mã TEST10 draft chưa hoạt động |
| 7 | Prod env defaults | Some weak default secrets/CORS settings flagged in security audit | Một số default prod/CORS còn yếu |
| 8 | Backup job lock | In-memory lock is per-process; multi-replica prod may run concurrent backups | Lock backup theo process; multi-replica có thể chạy song song |

---

## Verification performed

| Check | Result |
|-------|--------|
| Backend unit tests | 20 passed, 2 skipped |
| Backend build | Success |
| Nuxt storefront build | Success |
| `GET /static/branding-favicon.png` (public) | 200 |
| `GET /static/private-*-order-exports.csv` (no auth) | 401 |
| Same export URL (admin session) | 200 |

---

*Generated from commits `00715693` through `5b0aa88b` on branch `dev/be_medusajs_merge_review0729`.*

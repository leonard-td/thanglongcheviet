# Change Log — Admin, Backend & Storefront Improvements

**Branch:** `dev/be_medusajs_merge_review0729`  
**Date:** 2026-08-01  
**Commits:** 15 (`00715693` … `9a08699f`)  
**Languages:** English + Tiếng Việt

Each item uses:

| Field | Meaning |
|-------|---------|
| **Background / Bối cảnh** | Why the work was needed — business context, discovery path, or upstream cause |
| **Before / Trước** | What existed or was broken |
| **Changed / Đã sửa** | What was done |
| **After / Sau** | Resulting behaviour |

---

## Session overview / Tổng quan phiên làm việc

**English**

This branch merges and hardens a **Medusa 2.17** backend with a **Nuxt storefront** and custom **Medusa Admin extensions** (CMS, inquiries, navigation, care channels, backups). Work started from a security and UX review: private order exports were publicly reachable, admin pages had stale React Query caches, the storefront still used legacy Medusa v1 cart promo APIs, and several admin modules lacked UI entirely.

Changes were split into **small, reviewable commits** (security → API → admin UI → storefront → docs). Several bugs only appeared during **manual QA after deploy** (blog 500, cart promo UX, checkout region error) and were fixed in follow-up commits documented below.

**Stack:** Docker Compose (`tlcv_nginx` :8800), admin at `/app`, Store API via publishable key + region ID in `.env.dev`.

**Tiếng Việt**

Nhánh này gộp và củng cố **Medusa 2.17** với **storefront Nuxt** và **extension Medusa Admin** tùy chỉnh (CMS, inquiries, menu, care channels, backup). Xuất phát từ review bảo mật và UX: export đơn hàng lộ công khai, cache React Query admin cũ, storefront còn API khuyến mãi kiểu Medusa v1, nhiều module admin chưa có giao diện.

Thay đổi được tách **commit nhỏ, dễ review** (bảo mật → API → admin → storefront → tài liệu). Một số lỗi chỉ lộ ra khi **test tay sau deploy** (blog 500, UX mã giảm giá, lỗi region checkout) và được sửa ở các commit tiếp theo.

**Stack:** Docker Compose (`tlcv_nginx` :8800), admin `/app`, Store API qua publishable key + region ID trong `.env.dev`.

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
11. [Commit 10 — Blog fallback images & article SEO fix](#commit-10--blog-fallback-images--article-seo-fix)
12. [Commit 11 — Admin sidebar notification badges](#commit-11--admin-sidebar-notification-badges)
13. [Commit 12 — Cart promo handling & solid header](#commit-12--cart-promo-handling--solid-header)
14. [Commit 13 — Changelog document (initial)](#commit-13--changelog-document-initial)
15. [Commit 14 — Changelog extended (commits 10–13)](#commit-14--changelog-extended-commits-1013)
16. [Commit 15 — Cart checkout region_id fix](#commit-15--cart-checkout-region_id-fix)
17. [Files not committed](#files-not-committed)
18. [Known remaining issues](#known-remaining-issues)

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
| 10 | `2dcef990` | fix(storefront): fix blog fallback images and article SEO composable |
| 11 | `101797de` | feat(admin): add sidebar notification badges on extension menu |
| 12 | `e07e49fb` | fix(storefront): improve cart promo handling and solid header on cart page |
| 13 | `381e4311` | docs: add bilingual changelog for admin and storefront session |
| 14 | `7fbcbda0` | docs: extend changelog with commits 10–13 and post-session fixes |
| 15 | `9a08699f` | fix(storefront): preserve cart region_id for checkout on Medusa v2 |

---

## Commit 1 — Private order export security

**Commit:** `00715693`  
**Author:** Tri Loc Ho (+ Cursor)  
**Files:** `medusa-config.ts`, `middlewares.ts`, `api/static/[filename]/route.ts`, `lib/private-exports/*`, `lib/backup/fs-utils.ts`, `.gitignore`, `infra/docker-compose.prod.yml`, `scripts/check-order-export.sh`

### Background / Bối cảnh

**English:** Medusa’s built-in order-export workflow writes CSV files containing customer PII (names, emails, phones, shipping addresses). On this project those files were configured to land under the **public** `static/` directory with predictable `private-*` filenames. During a security pass before merge, we confirmed that **no authentication** was required to download them — equivalent to a data breach for anyone who guessed or scraped URLs. This commit closes that hole and adds migration for files already on disk.

**Tiếng Việt:** Medusa export đơn hàng ra CSV chứa PII khách hàng. Trên dự án này file được ghi vào thư mục **`static/` công khai** với tên `private-*` đoán được. Khi review bảo mật trước merge, xác nhận **không cần đăng nhập** vẫn tải được — rủi ro lộ dữ liệu. Commit này chặn truy cập và migration file cũ.

---

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
**Author:** Tri Loc Ho (+ Cursor)  
**Files:** `api/admin/care-channels/redact.ts`, `route.ts`, `[id]/route.ts`

### Background / Bối cảnh

**English:** Care channels (Telegram/Zalo bots) store API tokens in the database. The admin **list** API returned those tokens in full JSON. Anyone with admin access opening DevTools → Network could copy live bot credentials. Redaction on the list endpoint is a quick win; detail/edit routes still need the same treatment (see [known issues](#known-remaining-issues)).

**Tiếng Việt:** Kênh care (bot Telegram/Zalo) lưu token trong DB. API **danh sách** admin trả token đầy đủ trong JSON — mở DevTools có thể copy credential. Che secret ở list là bước nhanh; route chi tiết/sửa vẫn cần xử lý tương tự (xem [issue còn lại](#known-remaining-issues)).

---

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
**Author:** Tri Loc Ho (+ Cursor)  
**Files:** campaign duplicate, care-messages, event-registrations, events, media, site-settings routes

### Background / Bối cảnh

**English:** While wiring new admin screens, QA hit inconsistent API behaviour: validation threw raw 500s, PATCH responses omitted fields the UI already showed on GET, duplicate campaign posts lost data, and the media library could not paginate. These are small backend fixes that unblock admin UX without changing domain models.

**Tiếng Việt:** Khi làm giao diện admin mới, QA gặp API không nhất quán: validation 500, PATCH thiếu field so với GET, nhân bản bài mất `description`, media không phân trang. Các sửa nhỏ ở backend để admin dùng được, không đổi model nghiệp vụ.

---

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
**Author:** Tri Loc Ho (+ Cursor)  
**Files:** `admin/routes/inquiries/*`, `admin/types/inquiry.ts`, `api/admin/inquiries/*`, `i18n/en.json`, `i18n/vi.json`

### Background / Bối cảnh

**English:** The storefront contact/booking forms already persisted **inquiries** in PostgreSQL via custom API routes, but operators had no Medusa Admin screen to triage them — only SQL or raw API calls. This commit adds the full Extensions → Customer Inquiries flow (list, filters, detail, status updates) so support staff can work entirely inside admin.

**Tiếng Việt:** Form liên hệ/đặt lịch trên storefront đã lưu **inquiries** vào PostgreSQL qua API tùy chỉnh, nhưng vận hành chưa có màn Medusa Admin — chỉ SQL hoặc gọi API thô. Commit thêm luồng Extensions → Customer Inquiries (list, lọc, chi tiết, đổi trạng thái) để nhân viên xử lý trong admin.

---

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
**Author:** Tri Loc Ho (+ Cursor)  
**Files:** `admin/routes/navigation/page.tsx`, `api/admin/navigations/[id]/route.ts`, `validation.ts`, `scripts/setup-web-integration.mjs`

### Background / Bối cảnh

**English:** Header menu items are stored in a custom `navigations` module and consumed by the Nuxt storefront. The old admin page was written against an earlier plugin shape: manual `fetch`, string `"null"` parents, and PUT bodies that broke validation. Menu edits failed silently or corrupted parent/child links. The rewrite aligns admin CRUD, API validation, and the setup seed script with the current flat navigation model.

**Tiếng Việt:** Menu header lưu trong module `navigations` tùy chỉnh, storefront Nuxt đọc qua API. Trang admin cũ viết theo plugin cũ: fetch thủ công, parent `"null"`, PUT lỗi validation. Sửa menu hay fail hoặc hỏng quan hệ cha-con. Viết lại để admin, API và script seed khớp model navigation phẳng hiện tại.

---

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
**Author:** Tri Loc Ho (+ Cursor)  
**Files:** 20 admin components/routes/widgets (see commit stat above)

### Background / Bối cảnh

**English:** After the navigation and inquiries rewrites, broader admin QA revealed a **systemic React Query key bug**: nested keys like `[["cards"]]` never matched `invalidateQueries({ queryKey: ["cards"] })`, so lists stayed stale after save/delete. Combined with React Router loaders not revalidating on the same page, operators saw “saved successfully” but old titles/status counts. This commit batch-fixes keys, loader revalidation, backup download auth, TipTap prompts, and several polish items found in daily use.

**Tiếng Việt:** Sau khi viết lại navigation và inquiries, QA admin phát hiện **lỗi React Query key hệ thống**: key lồng `[["cards"]]` không khớp invalidate → danh sách cũ sau lưu/xóa. Loader React Router không revalidate trên cùng trang → báo “lưu thành công” nhưng title/trạng thái vẫn cũ. Commit sửa hàng loạt key, revalidate loader, tải backup, TipTap và các polish khác.

---

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
**Author:** Tri Loc Ho (+ Cursor)  
**Files:** `useProducts.ts`, `medusa.ts`, `storefront.ts`, `[slug].vue`, list components

### Background / Bối cảnh

**English:** After migrating from a Laravel catalog to Medusa Store API, product pages always showed **in stock** because `transformMedusaProduct()` hardcoded `inStock: true` and never requested inventory fields. For a tea/food shop, selling out-of-stock variants is a trust and fulfilment problem. This commit wires Medusa’s `manage_inventory`, `allow_backorder`, and `inventory_quantity` through to PDP, quick-add buttons, and option pickers.

**Tiếng Việt:** Sau khi chuyển catalog Laravel sang Medusa Store API, trang sản phẩm luôn **còn hàng** vì hardcode `inStock: true` và không lấy field tồn kho. Với cửa hàng trà/thực phẩm, bán variant hết hàng gây mất niềm tin và khó giao hàng. Commit nối `manage_inventory`, `allow_backorder`, `inventory_quantity` tới PDP, nút thêm nhanh và chọn option.

---

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
**Author:** Tri Loc Ho (+ Cursor)  
**Files:** `apps/web/composables/useCart.ts`

### Background / Bối cảnh

**English:** Medusa **v2** removed the v1 pattern of applying coupons via `POST /store/carts/:id` with `{ promo_codes }`. Our storefront still used that legacy call — HTTP 200 but **zero discount**. Commit 8 switches to `/store/carts/:id/promotions` and expands `CART_FIELDS` for totals. **Side note:** `CART_FIELDS` still omitted `region_id` (a gap introduced earlier in commit `586219d6` by Leonard-ThindPad-P50, 2026-07-06). That latent bug broke checkout later and was fixed in [Commit 15](#commit-15--cart-checkout-region_id-fix).

**Tiếng Việt:** Medusa **v2** bỏ cách áp mã qua `POST /store/carts/:id` + `{ promo_codes }`. Storefront vẫn gọi kiểu cũ — HTTP 200 nhưng **không giảm giá**. Commit 8 chuyển sang `/promotions` và mở rộng `CART_FIELDS` lấy tổng tiền. **Lưu ý:** `CART_FIELDS` vẫn thiếu `region_id` (từ commit `586219d6`, Leonard-ThindPad-P50, 06/07/2026). Lỗi ẩn này làm checkout hỏng sau này — sửa ở [Commit 15](#commit-15--cart-checkout-region_id-fix).

---

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
**Author:** Tri Loc Ho (+ Cursor)  
**Files:** `apps/backend/package.json`, `package-lock.json`

### Background / Bối cảnh

**English:** Backend maintenance scripts and one-off migrations are written in TypeScript. Without `ts-node` in devDependencies, contributors had to compile manually or use brittle `npx` invocations inside Docker. Adding the dependency standardises local and CI script execution.

**Tiếng Việt:** Script bảo trì backend viết bằng TypeScript. Thiếu `ts-node` trong devDependencies khiến dev phải compile tay hoặc `npx` không ổn định trong Docker. Thêm dependency để chạy script thống nhất local/CI.

---

| **Before** | No `ts-node` in backend devDependencies. |
| **Changed** | Added `ts-node@^10.9.2` and updated lockfile. |
| **After** | TypeScript scripts can be run directly with ts-node when needed. |

**Tiếng Việt**

| **Trước** | Chưa có `ts-node` trong devDependencies backend. |
| **Đã sửa** | Thêm `ts-node@^10.9.2` + cập nhật lockfile. |
| **Sau** | Chạy script TypeScript trực tiếp thuận tiện hơn. |

---

## Commit 10 — Blog fallback images & article SEO fix

**Commit:** `2dcef990`  
**Author:** Tri Loc Ho (+ Cursor)  
**Files:** `apps/web/composables/useBlog.ts`, `apps/web/composables/useSeoStructuredData.ts`, `apps/web/utils/storefront.ts`

### Background / Bối cảnh

**English:** Manual testing on `/tin-tuc` found two unrelated storefront bugs: (1) CMS returned **zero** campaign posts in dev, so the site fell back to static `blog.json` but replaced thumbnails with a dead Unsplash URL; (2) article detail pages returned **500** because a SEO composable called `useRequestURL()` inside `computed()`, which Nuxt forbids outside setup. Both were user-visible on the public site, not admin-only regressions.

**Tiếng Việt:** Test tay `/tin-tuc` phát hiện hai lỗi storefront: (1) CMS **0** campaign post → fallback `blog.json` nhưng thay thumbnail bằng URL Unsplash 404; (2) trang chi tiết **500** vì composable SEO gọi `useRequestURL()` trong `computed()` — Nuxt không cho phép ngoài setup. Cả hai lộ ra trên site công khai.

---

**English**

| **Before** | Store API returned 0 campaign posts, so the site used `content/blog.json`. Fallback code ignored each post's `thumbnail` field and always used `FALLBACK_POST_IMAGE` — an Unsplash URL that returns **404**. Related articles and blog cards showed broken images. |
| **Changed** | `resolveBlogJsonImage()` maps known thumbnails to `/static/…` paths and rotates through local `/images/hero/*` and `/images/gallery/*` files. `FALLBACK_POST_IMAGE` changed to `/images/og-image.jpg`. |
| **After** | Blog list and “Bài viết liên quan” show real images when API has no posts. Missing API inventory data still defaults to in-stock (see [issue #2](#known-remaining-issues)). |

**Tiếng Việt**

| **Trước** | API không có bài viết → dùng `blog.json`. Code fallback luôn gán URL Unsplash (404), bỏ qua `thumbnail` trong JSON → ảnh “Bài viết liên quan” bị vỡ. |
| **Đã sửa** | `resolveBlogJsonImage()` trỏ tới `/static/…` hoặc ảnh local; `FALLBACK_POST_IMAGE` = `/images/og-image.jpg`. |
| **Sau** | Danh sách tin và bài liên quan có ảnh khi chưa có post trên CMS. |

---

### 10.2 `/tin-tuc/[slug]` 500 crash (SEO composable)

**English**

| **Before** | `useArticleStructuredData()` called `useRequestURL()` **inside** a `computed()` callback in `useHead`. Nuxt composables must run during setup → article pages returned **500** and hung on skeleton UI. |
| **Changed** | Call `useRequestURL()` once at composable top level; use `requestURL.origin` inside `computed`. Same fix applied to `useProductStructuredData()`. |
| **After** | Article detail pages load normally; structured-data JSON-LD still includes correct page URL. |

**Tiếng Việt**

| **Trước** | Gọi `useRequestURL()` bên trong `computed()` → lỗi Nuxt → trang `/tin-tuc/...` **500**, treo skeleton. |
| **Đã sửa** | Gọi `useRequestURL()` một lần lúc setup; dùng biến trong `computed`. |
| **Sau** | Trang chi tiết bài viết load bình thường. |

---

## Commit 11 — Admin sidebar notification badges

**Commit:** `101797de`  
**Author:** Tri Loc Ho (+ Cursor)  
**Files:** `admin/lib/sidebar-badges.ts`, `admin/components/sidebar-badges/index.tsx`, `admin/widgets/sidebar-badges.tsx`, `admin/components/page-layout/index.tsx`, `api/admin/care-messages/route.ts`

### Background / Bối cảnh

**English:** With inquiries and event registrations now in admin, operators had no at-a-glance signal that new items arrived — they had to open each Extensions submenu daily. Badges poll lightweight `count` endpoints and persist “last seen” in `localStorage`. The first implementation accidentally created a **MutationObserver ↔ DOM paint loop** that froze the Inquiries page; that regression was caught in QA and fixed in the same commit series before merge.

**Tiếng Việt:** Sau khi có inquiries và đăng ký sự kiện trong admin, không có chỉ báo nhanh — phải mở từng mục Extensions. Badge poll API `count` và lưu “đã xem” trong `localStorage`. Bản đầu tạo **vòng lặp MutationObserver ↔ vẽ DOM** làm treo trang Inquiries; QA bắt được và sửa trong cùng nhóm commit.

---

**English**

| **Before** | No visual indicator when new inquiries, event registrations, or failed care messages needed admin attention. Admin had to open each section manually. |
| **Changed** | Polls counts every 30s and paints a small red number on the top-right of matching sidebar links. Tracks “last seen” count in `localStorage` per section; badge clears when admin opens that section. Re-shows when count rises above last seen. |
| **After** | **Customer Inquiries** shows count of `status=new`. **Event Registrations** shows `status=new`. **Care Messages** shows `status=failed`. Badge disappears while on that page; returns if new items arrive later. |

**Tiếng Việt**

| **Trước** | Menu Extensions không báo có inquiry/đăng ký/tin nhắn mới — admin phải mở từng mục. |
| **Đã sửa** | Số đỏ góc phải menu; lưu “đã xem” trong `localStorage`; vào mục thì ẩn; có thêm mới thì hiện lại. |
| **Sau** | Inquiries / Event Registrations / Care Messages (failed) có badge số lượng chưa xử lý. |

**Sections counted:**

| Menu item | API filter |
|-----------|------------|
| Customer Inquiries | `GET /admin/inquiries?status=new&limit=1` → `count` |
| Event Registrations | `GET /admin/event-registrations?status=new&limit=1` → `count` |
| Care Messages | `GET /admin/care-messages?status=failed&limit=1` → `count` |

---

### 11.2 MutationObserver hang fix (first implementation bug)

**English**

| **Before** | Initial badge implementation used a `MutationObserver` on the whole sidebar. Painting badges modified the DOM → observer fired again → **infinite loop** → browser froze; **Customer Inquiries** page stuck on loading skeleton. |
| **Changed** | Skip DOM writes when badge text unchanged; ignore mutations from `.tlcv-sidebar-badge` nodes; debounce paint with `requestAnimationFrame`; single shared observer with ref-count. |
| **After** | Admin Extensions pages load normally; badges update without freezing the UI. |

**Tiếng Việt**

| **Trước** | Observer + sửa DOM badge → vòng lặp vô hạn → treo trình duyệt; trang Inquiries không load. |
| **Đã sửa** | Chỉ sửa DOM khi số đổi; bỏ qua mutation của badge; debounce rAF; một observer dùng chung. |
| **Sau** | Admin mượt; badge hoạt động không treo. |

---

### 11.3 Care messages `status` query filter

**English**

| **Before** | `GET /admin/care-messages` could not filter by `status` in query string. |
| **Changed** | Added `status` to allowed filter keys on list route. |
| **After** | Sidebar badge and admin list can filter failed messages efficiently. |

**Tiếng Việt**

| **Trước** | API care-messages không lọc theo `status`. |
| **Đã sửa** | Thêm `status` vào filter list. |
| **Sau** | Badge và list lọc tin failed được. |

---

## Commit 12 — Cart promo handling & solid header

**Commit:** `e07e49fb`  
**Author:** Tri Loc Ho (+ Cursor)  
**Files:** `apps/web/composables/useCart.ts`, `apps/web/pages/gio-hang.vue`, `apps/web/locales/en.json`, `apps/web/locales/vi.json`

### Background / Bối cảnh

**English:** After Commit 8 made discounts visible, QA on `/gio-hang` exposed confusing UX: automatic promotion `ssss` already reduced totals by 200,000 VND, but typing `SSSS` showed **invalid coupon** (uppercase + automatic promos cannot be POSTed manually). Separately, the transparent header on scroll made cart rows appear **under** the fixed nav. Neither issue blocked API correctness for promos, but both eroded checkout confidence during UAT.

**Tiếng Việt:** Sau Commit 8 hiện giảm giá, QA `/gio-hang` thấy UX khó hiểu: khuyến mãi tự động `ssss` đã trừ 200.000 VND nhưng gõ `SSSS` báo **mã không hợp lệ** (uppercase + automatic không POST thủ công). Header trong suốt khi cuộn khiến dòng giỏ **chui dưới** menu. Không chặn API khuyến mãi nhưng làm mất tin tưởng khi UAT checkout.

---

**English**

| **Before** | Promotion `ssss` is **automatic** (200,000 VND off eligible products). It applied correctly when cart had Sweatpants/Shorts, but manual entry of `SSSS` failed because codes were forced to **uppercase** and automatic promos cannot be applied via `/promotions` POST. UI showed red **“invalid”** while discount was already applied — confusing. |
| **Changed** | Removed `uppercase` CSS on coupon input. `applyPromoCode()` preserves casing and retries lowercase on failure. If discount already applied, shows `cart.couponAlreadyApplied` instead of error. |
| **After** | Automatic promo still discounts cart silently. Manual codes like `TEST10` work when promotion is **Active** (use exact/lowercase code). Re-clicking Apply with discount already on cart shows friendly message, not error. |

**Tiếng Việt**

| **Trước** | Khuyến mãi `ssss` tự động đã giảm giá, nhưng nhập `SSSS` báo **invalid** (uppercase + promo automatic). |
| **Đã sửa** | Bỏ uppercase; thử lowercase; thông báo “đã áp dụng khuyến mãi” nếu giảm giá sẵn có. |
| **Sau** | Automatic vẫn hoạt động; mã thủ công cần đúng chữ (vd. `TEST10` khi Active). |

---

### 12.2 Cart content overlapping navigation

**English**

| **Before** | On `/gio-hang`, header stayed transparent until ~50px scroll. Scrolling down made cart line items slide **under** the fixed nav — looked like product card overlapped menu. |
| **Changed** | Cart page sets `useHeaderSolidThreshold()` to `-1` on mount so header is solid immediately; resets on leave. |
| **After** | Cart rows no longer visually overlap navigation while scrolling. |

**Tiếng Việt**

| **Trước** | Header trong suốt → cuộn trang giỏ hàng → sản phẩm trượt dưới menu. |
| **Đã sửa** | Trang giỏ ép header solid ngay (`threshold = -1`). |
| **Sau** | Không còn chồng lên menu khi cuộn. |

---

### 12.3 i18n: `cart.couponAlreadyApplied`

**English**

| **Before** | No string for “promotion already on cart”. |
| **Changed** | Added EN: “A promotion is already applied to this cart.” / VI: “Giỏ hàng đã được áp dụng khuyến mãi.” |
| **After** | Clear UX when automatic promo already discounted the cart. |

**Tiếng Việt**

| **Trước** | Không có chuỗi “đã có khuyến mãi”. |
| **Đã sửa** | Thêm key `cart.couponAlreadyApplied` EN/VI. |
| **Sau** | Thông báo rõ khi giảm giá đã có sẵn. |

---

## Commit 13 — Changelog document (initial)

**Commit:** `381e4311`  
**Author:** Tri Loc Ho (+ Cursor)  
**Files:** `docs/CHANGELOG-ADMIN-STOREFRONT-2026-08-01.md`

### Background / Bối cảnh

**English:** After nine functional commits, reviewers needed a **single bilingual artifact** describing before/change/after for security, admin, and storefront work — not a scattered PR description. This commit created the initial changelog covering commits 1–9 plus verification notes.

**Tiếng Việt:** Sau chín commit chức năng, reviewer cần **một tài liệu song ngữ** mô tả trước/sửa/sau cho bảo mật, admin, storefront — không rải rác trong PR. Commit tạo changelog ban đầu cho commit 1–9 kèm ghi chú kiểm tra.

**English**

| **Before** | No single bilingual document describing all session changes with before/change/after detail. |
| **Changed** | Added this markdown file (EN + VI) covering commits 1–9, verification results, and known open issues. |
| **After** | Team can review the first wave of `dev/be_medusajs_merge_review0729` work from one document. |

**Tiếng Việt**

| **Trước** | Không có tài liệu song ngữ tổng hợp thay đổi phiên làm việc. |
| **Đã sửa** | Thêm file markdown (EN + VI) cho commit 1–9 + issue còn lại. |
| **Sau** | Xem một file nắm đợt thay đổi đầu trên nhánh review0729. |

---

## Commit 14 — Changelog extended (commits 10–13)

**Commit:** `7fbcbda0`  
**Author:** Tri Loc Ho (+ Cursor)  
**Files:** `docs/CHANGELOG-ADMIN-STOREFRONT-2026-08-01.md`

### Background / Bối cảnh

**English:** Post-merge manual QA uncovered blog 500s, admin badge hangs, and cart UX issues fixed in commits 10–12 **after** the first changelog landed. This follow-up doc commit appended those entries plus a “post-session fixes” matrix so the document stayed the source of truth through UAT.

**Tiếng Việt:** QA sau merge phát hiện blog 500, treo badge admin, UX giỏ hàng — sửa ở commit 10–12 **sau** khi changelog đầu đã commit. Commit doc bổ sung các mục đó và bảng “post-session fixes” để tài liệu vẫn là nguồn chính xác qua UAT.

**English**

| **Before** | Changelog stopped at commit 9; commits 10–12 undocumented. |
| **Changed** | Extended EN/VI sections for blog SEO, sidebar badges, cart promo/header; updated verification and known-issues tables. |
| **After** | Document covers commits 1–13 through end of first UAT cycle. |

**Tiếng Việt**

| **Trước** | Changelog dừng ở commit 9; commit 10–12 chưa ghi. |
| **Đã sửa** | Bổ sung EN/VI cho blog, badge, giỏ hàng; cập nhật bảng kiểm tra và issue. |
| **Sau** | Tài liệu phủ commit 1–13 hết chu kỳ UAT đầu. |

---

## Commit 15 — Cart checkout region_id fix

**Commit:** `9a08699f`  
**Author:** Tri Loc Ho (+ Cursor)  
**Files:** `apps/web/composables/useCart.ts`

### Background / Bối cảnh

**English:** During checkout UAT on `/gio-hang`, submitting the delivery form showed **`Region with id: undefined was not found`** in red. Investigation traced it to Medusa v2 **field selection**: every cart fetch used `?fields=${CART_FIELDS}` but `CART_FIELDS` never listed `region_id`, so `applyCart()` stored `undefined` and checkout called `/store/regions/undefined`. This was **not introduced by commits 10–12** — the gap dates to commit `586219d6` (*update UI/UX, add feature card management*, **Leonard-ThindPad-P50**, 2026-07-06) when `CART_FIELDS` was first added without `region_id` while checkout already read `current.region_id`. Commits 8 and 12 expanded cart field lists but did not add `region_id`; more cart refreshes (promo apply, line-item updates) made the bug easier to hit during this session’s testing.

**Tiếng Việt:** Khi UAT checkout `/gio-hang`, gửi form giao hàng báo **`Region with id: undefined was not found`**. Truy vết: Medusa v2 **chọn field** — mọi request giỏ dùng `?fields=${CART_FIELDS}` nhưng không có `region_id`, `applyCart()` lưu `undefined`, checkout gọi `/store/regions/undefined`. **Không phải do commit 10–12** — thiếu sót từ `586219d6` (*update UI/UX, add feature card management*, **Leonard-ThindPad-P50**, 06/07/2026) khi thêm `CART_FIELDS` không kèm `region_id` trong khi checkout đã dùng `current.region_id`. Commit 8 và 12 mở rộng field nhưng chưa thêm `region_id`; refresh giỏ nhiều hơn (promo, cập nhật dòng) khiến lỗi dễ gặp trong phiên test này.

---

### 15.1 Missing `region_id` in `CART_FIELDS`

**English**

| | |
|---|---|
| **Before** | `CART_FIELDS = '*items,*promotions,discount_total,item_subtotal,shipping_total,total'`. Medusa v2 omits unlisted fields. After create/fetch/add-item/promo, `medusaCart.region_id` was always `undefined` in the JSON response. |
| **Changed** | Prepend `region_id` to `CART_FIELDS` so every cart API response includes the region the cart belongs to. |
| **After** | `applyCart()` receives a real region ID on every cart mutation; in-memory cart state stays consistent with Medusa. |

**Tiếng Việt**

| | |
|---|---|
| **Trước** | `CART_FIELDS` không có `region_id`. Medusa v2 bỏ field không liệt kê → sau mọi thao tác giỏ, `region_id` trong JSON là `undefined`. |
| **Đã sửa** | Thêm `region_id` vào đầu `CART_FIELDS`. |
| **Sau** | Mọi response giỏ có region thật; state in-memory khớp Medusa. |

---

### 15.2 Defensive fallbacks in `applyCart()` and `checkout()`

**English**

| | |
|---|---|
| **Before** | `cart.value = { id, region_id: medusaCart.region_id }` — if API omitted the field, region was wiped. Checkout used only `current.region_id`. |
| **Changed** | `applyCart`: `region_id: medusaCart.region_id ?? cart.value?.region_id ?? regionId` (runtime config from `NUXT_PUBLIC_MEDUSA_REGION_ID`). `checkout`: `checkoutRegionId = current.region_id \|\| regionId` with explicit error if both empty. |
| **After** | Stale browser sessions or edge API responses still checkout using configured region. Clear error if region env is missing entirely. |

**Tiếng Việt**

| | |
|---|---|
| **Trước** | Gán thẳng `medusaCart.region_id` — thiếu field thì mất region. Checkout chỉ dùng `current.region_id`. |
| **Đã sửa** | Fallback giữ region cũ hoặc `regionId` từ config; checkout dùng `current.region_id \|\| regionId`, báo lỗi nếu cả hai trống. |
| **Sau** | Session cũ hoặc API thiếu field vẫn checkout được nếu env có region. Báo rõ khi chưa cấu hình region. |

---

### 15.3 Root-cause timeline (for reviewers)

| Date / Commit | What happened |
|---------------|---------------|
| `eeac5def` — refactor Medusa | Checkout added; cart fetches **without** `fields=` → full cart JSON included `region_id` → checkout worked. |
| `586219d6` — Leonard, 2026-07-06 | Introduced `CART_FIELDS` without `region_id` on all cart endpoints → **latent checkout break**. |
| `e3629ea8` — session commit 8 | Expanded fields for promo totals; still no `region_id`. |
| `e07e49fb` — session commit 12 | Cart UX fixes; still no `region_id`. |
| `9a08699f` — session commit 15 | Adds `region_id` + fallbacks → checkout works. |

**Tiếng Việt:** Trước `586219d6` checkout ổn; từ khi thêm `CART_FIELDS` thiếu `region_id` checkout hỏng âm thầm; commit 15 sửa.

---

## Files not committed

These were intentionally left out of all **15 commits**:

| File / folder | Reason |
|---------------|--------|
| `.env.dev` | Local environment; contains publishable keys and region IDs — do not commit without review |
| `.idea/` | IDE metadata |
| `docker-up.log` | Local log file |
| `docs/PHAN-TICH-CAU-TRUC-TRANG-CHU.md` | Draft analysis doc |
| `docs/REVIEW-UIUX-TRANG-CHU.md` | Draft review doc |

**English:** Do not commit `.env.dev` without reviewing for secrets.

**Tiếng Việt:** Không commit `.env.dev` nếu chưa kiểm tra secret.

---

## Known remaining issues

Issues discussed during review but **not fixed** in these 15 commits:

| # | Issue | EN | VI |
|---|-------|----|----|
| 1 | Care channel detail API | `GET/PATCH /admin/care-channels/:id` still returns full secrets | API chi tiết vẫn trả credential đầy đủ |
| 2 | Strict OOS when API omits qty | Default treats missing `inventory_quantity` as in stock (may allow oversell if API never sends the field) | Thiếu field API vẫn coi còn hàng (có thể bán quá nếu API không gửi số) |
| 3 | Category related collection widget | Stale UI after save (query key fixed; loader revalidation not added) | Widget collection liên quan có thể cũ sau lưu |
| 4 | Storefront product cap | Catalog may cap at 100 products in some views | Một số view giới hạn 100 sản phẩm |
| 5 | Dual description editors | Products admin may have conflicting description UIs | Admin sản phẩm có thể trùng editor mô tả |
| 6 | Promotion TEST10 | Draft promotion will not apply until set Active in admin | Mã TEST10 draft chưa hoạt động |
| 7 | Automatic promo `ssss` | Applies only to configured products (e.g. Sweatpants/Shorts); cannot be entered manually as a code | `ssss` automatic — không nhập mã thủ công |
| 8 | Navigation label encoding | One DB row had `Gi?i thi?u` — fixed live via admin API, not in git | Một menu “Giới thiệu” lỗi encoding — đã sửa trên DB, không trong commit |
| 9 | Prod env defaults | Some weak default secrets/CORS settings flagged in security audit | Một số default prod/CORS còn yếu |
| 10 | Backup job lock | In-memory lock is per-process; multi-replica prod may run concurrent backups | Lock backup theo process; multi-replica có thể chạy song song |
| 11 | No campaign posts in CMS | Storefront still uses `blog.json` fallback until posts are created in Admin → Campaign Posts | Chưa có bài Campaign Posts → storefront dùng fallback JSON |

**Fixed in Commit 15 (removed from open list):** Checkout error `Region with id: undefined was not found` on `/gio-hang` — caused by missing `region_id` in `CART_FIELDS` since `586219d6`.

**Tiếng Việt:** Lỗi checkout region — đã sửa Commit 15; nguyên nhân thiếu `region_id` trong `CART_FIELDS` từ `586219d6`.

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
| `GET /tin-tuc/5-loai-tra-tot-cho-suc-khoe` after SEO fix | 200 |
| `GET /admin/inquiries?status=new` count | 11+ (live DB) |
| Cart automatic promo `ssss` on Sweatpants | −200,000 VND when eligible |
| Cart checkout after `region_id` fix (`9a08699f`) | `/store/regions/{id}` resolves; guest checkout completes on eligible cart |

---

## Post-session fixes (commits 10–15)

These issues were found during manual testing after the first 9 commits:

| Issue | Fixed in |
|-------|----------|
| Blog related-article broken images | Commit 10 |
| `/tin-tuc/[slug]` 500 error | Commit 10 |
| Admin Inquiries page hang (badge observer loop) | Commit 11 |
| Cart nav overlap on scroll | Commit 12 |
| Promo `SSSS` invalid while discount shown | Commit 12 |
| Checkout `Region with id: undefined was not found` | Commit 15 |

---

*Generated from commits `00715693` through `9a08699f` on branch `dev/be_medusajs_merge_review0729`. Last updated: 2026-08-01 (commit 15 + expanded backgrounds).*

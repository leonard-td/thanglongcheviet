# Medusa Admin RBAC — Thăng Long Chè Việt

> **Trạng thái:** Đã bật và kiểm thử end-to-end trên môi trường dev  
> **Stack:** Medusa `2.17.0` · native `@medusajs/rbac`  
> **Branch tham chiếu:** `feat/medusa-admin-rbac`  
> **Cập nhật:** 2026-08-01

Tài liệu này mô tả cách phân quyền admin Medusa cho TLCV: bật module, khai báo policy, gắn guard, mời user, và vận hành hàng ngày.

---

## 1. Kết luận nhanh

| Hạng mục | Trạng thái |
|---|---|
| Native RBAC module + feature flag | ✅ |
| Custom policies sync vào DB | ✅ (41 policy / 12 resource) |
| Guard trên custom `/admin/*` | ✅ (normalize snake_case) |
| Invite → kích hoạt → gán role → enforce | ✅ đã E2E |
| Super Admin full access | ✅ |
| User không role → custom API 403 | ✅ |
| Plugin RBAC tự viết | ❌ không cần — dùng native |

**Chưa guard (cố ý / nhỏ):** `GET /admin/custom` (health stub, trả 200 cho mọi admin đã login).

---

## 2. Kiến trúc

```text
Boot
  ├── medusa-config: modules.@medusajs/medusa/rbac + featureFlags.rbac
  ├── import src/policies/custom.ts → definePolicies()
  └── syncRegisteredPolicies() → bảng rbac_policy

Request /admin/*
  ├── Auth session/JWT (Medusa sẵn)
  ├── wrapWithPoliciesCheck({ resource, operation })  ← chỉ route custom
  │     └── hasPermission(roles từ JWT → policies trong DB)
  └── Handler

UI quản trị (native Dashboard)
  ├── Settings → Users / Invite     → tạo user (mời email)
  ├── Settings → Roles              → tạo role, gán policy, gán user
  └── Settings → Policies           → xem danh sách policy (read-only)
```

Không có plugin riêng. Role / user / invite là UI Medusa core.

### Quy tắc tên resource (quan trọng)

`definePolicies()` **luôn** chuẩn hoá resource/operation sang **snake_case** trước khi ghi DB:

| Khai báo trong code | Lưu trong DB / dùng khi check |
|---|---|
| `campaign-post` | `campaign_post` |
| `site-settings` | `site_settings` |
| `event-registration` | `event_registration` |

Guard trong `middlewares.ts` gọi `toSnakeCase()` trước khi check — nếu quên bước này, user không-super-admin sẽ **403 vĩnh viễn** dù đã gán đúng policy.

---

## 3. File liên quan

| File | Việc |
|---|---|
| `apps/backend/medusa-config.ts` | `resolve: "@medusajs/medusa/rbac"` + `featureFlags.rbac: true` |
| `apps/backend/src/policies/custom.ts` | Khai báo policy cho resource custom |
| `apps/backend/src/api/middlewares.ts` | Import policies + `wrapWithPoliciesCheck` trên từng route |

Core Medusa (không sửa):

- Module `@medusajs/rbac`
- Migration `rbac_*` + script `create-super-admin-role.js` (gán Super Admin lần đầu boot khi FF bật)
- Admin UI `/app/settings/{users,roles,policies}`

---

## 4. Resource & operations

Policy key format sau sync: `{resource}:{operation}` (snake_case).

| Resource (DB) | Operations | Route admin chính |
|---|---|---|
| `campaign_post` | read, create, update, delete | `/admin/campaign-posts` (+ `/duplicate`) |
| `campaign_topic` | read, create, update, delete | `/admin/campaign-topics` |
| `card` | read, create, update, delete | `/admin/cards` (+ import, media, reorder, bulk-delete) |
| `event` | read, create, update, delete | `/admin/events` |
| `event_registration` | read, update, delete | `/admin/event-registrations` |
| `inquiry` | read, update | `/admin/inquiries` |
| `media` | read, create, update, delete | `/admin/media`, `/admin/media/folders` |
| `navigation` | read, create, update, delete | `/admin/navigations` |
| `care_channel` | read, create, update, delete | `/admin/care-channels` (+ test, webhook) |
| `care_message` | read, create | `/admin/care-messages` |
| `site_settings` | read, update | `/admin/site-settings` |
| `backup` | read, create, update, delete | `/admin/backup` (restore = `update`) |

Built-in Medusa (`product`, `order`, `invite`, `rbac_role`, …) đã có sẵn trong core khi FF bật — không khai báo lại trong `custom.ts`.

Route đặc biệt đã map:

- `POST .../campaign-posts/:id/duplicate` → `campaign_post:create`
- `POST .../cards/import` → `card:create`
- `POST .../cards/bulk-delete` → `card:delete`
- `POST .../cards/reorder`, `POST .../cards/media` → `card:update`
- `POST .../care-channels/:id/test|webhook` → `care_channel:update`
- `POST .../backup/restore` → `backup:update`
- `POST .../products/:id/duplicate` → `product:create` (core)

---

## 5. Bật lần đầu (dev / môi trường mới)

```bash
# Từ repo root — stack Docker TLCV
./start.dev.sh
# hoặc
docker compose -f infra/docker-compose.yml --env-file .env.dev up -d

# Backend đã chạy migrate trong entrypoint. Nếu chạy tay:
cd apps/backend
npx medusa db:migrate
```

Kiểm tra:

1. Log có `Using flag MEDUSA_FF_RBAC ... true`
2. Log có migration RBAC + `create-super-admin-role`
3. Mở http://localhost:9000/app → login Super Admin
4. **Settings → Roles** thấy `Super Admin`
5. **Settings → Policies** thấy các key `campaign_post:*`, `navigation:*`, …

Admin mặc định (compose): `ADMIN_EMAIL` / `ADMIN_PASSWORD` trong `.env.dev`  
URL admin: http://localhost:9000/app (hoặc http://localhost:8800/app qua nginx)

---

## 6. Vận hành hàng ngày

### 6.1 Mời user mới (luồng hiện đại)

1. http://localhost:9000/app/settings/users/invite  
2. Nhập email + (tuỳ chọn) chọn role  
3. Copy link invite / gửi cho người dùng  
4. Họ mở `/app/invite?token=...` → nhập tên + password → kích hoạt  

Không tạo sẵn password gửi qua chat. Muốn tạo user kèm password ngay (ops/CLI):

```bash
cd apps/backend
npx medusa user -e someone@example.com -p 'StrongPass!'
# Sau đó gán role trong Settings → Roles → Add users
```

### 6.2 Tạo role & gán quyền

1. http://localhost:9000/app/settings/roles  
2. **Create** → đặt tên / mô tả  
3. Vào role → **Permissions** → tick policy  
4. **Add users** → chọn user **chưa** thuộc role đó  

Ghi chú UI: user đã nằm trong role sẽ bị disable trên form Add users — nếu chỉ còn đúng 1 Super Admin và bạn đang ở `role_super_admin/add-users`, danh sách sẽ trông “trống” vì không còn ai để thêm.

### 6.3 Link hữu ích

| Việc | URL |
|---|---|
| Users | `/app/settings/users` |
| Invite | `/app/settings/users/invite` |
| Roles | `/app/settings/roles` |
| Create role | `/app/settings/roles/create` |
| Role permissions | `/app/settings/roles/{id}/permissions` |
| Add users to role | `/app/settings/roles/{id}/add-users` |
| Policies | `/app/settings/policies` |

Thay `{id}` bằng id thật (ví dụ `role_super_admin`), **không** paste literal `{roleId}`.

---

## 7. Role mẫu (dev seed — không commit vào code)

Đã seed trên DB local để QA (password chung: `Tlcv@12345`):

| Email | Role | Ý nghĩa |
|---|---|---|
| `bientap@tlcv.local` | Bien tap noi dung | campaign + topic + media |
| `sukien@tlcv.local` | Quan ly su kien | event + registration (+ media read) |
| `cskh@tlcv.local` | Cham soc khach hang | inquiry + care-channel + care-message |
| `webadmin@tlcv.local` | Quan tri website | navigation + site-settings + card |
| `xemthoi@tlcv.local` | Chi xem | chỉ `*:read` các resource nội dung |
| `truongphong@tlcv.local` | *(chưa gán)* | để thử Add users trên UI |

Chỉ `admin@medusa.local` nên giữ **Super Admin**. Tránh gán Super Admin cho user QA — họ sẽ bypass mọi guard custom.

Dữ liệu seed này nằm trong Postgres volume, **không** nằm trong git.

---

## 8. Thêm resource / route mới (checklist)

1. Thêm `declareResourcePolicies(...)` trong `src/policies/custom.ts`  
2. Restart backend → policy xuất hiện trong Settings → Policies  
3. Thêm `guard("resource-name", "op")` trong `middlewares.ts` **trước** bodyParser/validate cho từng method  
4. Gán policy vào role cần thiết trên UI  
5. Test: Super Admin 200; role thiếu quyền 403; role đủ quyền 200  

Luôn để `guard` đi qua helper đã `toSnakeCase` — đừng hardcode resource khác với policy đã sync.

---

## 9. Kiểm thử đã chạy (dev)

Đã xác nhận bằng API thật:

- Super Admin JWT có `role_super_admin`, gọi mọi custom GET → 200  
- Invite + accept + login → JWT mang đúng `roles[]`  
- Matrix ALLOW/DENY theo policy gán  
- Route đặc biệt (duplicate, cards/*, care-channel test/webhook, backup restore)  
- Thêm policy vào role **không cần login lại** (check đọc policy theo role id trong JWT)  
- User 0 role → custom route 403  
- Limited user không list được `/admin/rbac/roles` / policies  

**Không phải bug RBAC:** `PATCH` campaign-post / event trả 500 nếu body thiếu field `content` (lỗi entity/handler cũ; Super Admin cũng bị). Gửi đủ `content` thì 200.

---

## 10. Troubleshooting

| Hiện tượng | Nguyên nhân / cách xử lý |
|---|---|
| Không thấy Settings → Roles | FF `rbac` tắt hoặc chưa migrate |
| Policy custom không xuất hiện | Chưa import `policies/custom` / server chưa restart |
| User đã gán policy vẫn 403 mọi thứ | Guard dùng hyphen không khớp DB snake_case — dùng helper `toSnakeCase` |
| Add users “trống” | Chỉ còn user đã thuộc role đó (bị disable), hoặc DB chỉ 1 user |
| User full quyền dù role hẹp | Kiểm tra họ có thêm `Super Admin` không (Settings → user / role users) |
| `Role with id: {roleId} not found` | URL chứa placeholder — mở Roles list rồi click role thật |
| Invite không gửi email | Medusa không gửi mail sẵn; copy link từ UI hoặc cấu hình notification sau |

---

## 11. Anti-patterns

- Không viết Nest `RolesGuard` / Spatie / plugin path-based permission song song với native RBAC  
- Không so sánh resource bằng hyphen trong guard khi DB đã snake_case  
- Không gán Super Admin “cho tiện” cho mọi user mới  
- Không expect Next/Nuxt storefront enforce admin RBAC — chỉ Medusa Admin + `/admin` API  

---

## 12. Tham chiếu code

```ts
// apps/backend/src/policies/custom.ts
declareResourcePolicies("campaign-post", "Campaign Posts")
// → DB key: campaign_post:read | create | update | delete
```

```ts
// apps/backend/src/api/middlewares.ts
const guard = (resource: string, operation: string) =>
  wrapWithPoliciesCheck((req, res, next) => next(), {
    resource: toSnakeCase(resource),
    operation: toSnakeCase(operation),
  })
```

```ts
// apps/backend/medusa-config.ts
modules: [{ resolve: "@medusajs/medusa/rbac" }, /* ... */],
featureFlags: { rbac: true },
```

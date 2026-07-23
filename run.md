# How to run the app (dev)

**Branch:** `feat/tlcv-post-merge-quality-pass`  
**Site:** http://localhost:8800  
**Changes:** see [note.md](./note.md)

---

## Before first run (once)

1. Install **Docker Desktop** and **Node.js 20+**.
2. Open PowerShell:

```powershell
cd D:\project_Dung\thanglongcheviet
git checkout feat/tlcv-post-merge-quality-pass
```

3. If `.env.dev` does not exist:

```powershell
copy .env.example .env.dev
```

Do not edit `NUXT_PUBLIC_MEDUSA_*` in `.env.dev` by hand — the script below writes them.

---

## Chạy ứng dụng (dùng mỗi lần)

Từ thư mục gốc repo:

```powershell
.\start.dev.ps1
```

Hoặc copy-paste thủ công — xem nội dung trong **`start.dev.ps1`**.

Script sẽ: dừng container cũ (giữ DB) → khởi động stack → đợi backend healthy → chạy `setup-web-integration.mjs` → restart web → in URL.

---

## Reset everything (empty database)

Only when you want a **brand-new** database (deletes all products/orders).  
Run the block above, but change the `down` line to:

```powershell
docker compose -f infra/docker-compose.yml --env-file .env.dev down --remove-orphans -v
```

First boot after `-v` takes longer (npm install + migrate + seeds). The wait loop handles that.

---

## Stop

```powershell
cd D:\project_Dung\thanglongcheviet
docker compose -f infra/docker-compose.yml --env-file .env.dev down
```

---

## If something looks wrong

| Problem | Fix |
|---------|-----|
| Publishable key / store errors | Re-run only the last two lines from the main block |
| Greyed-out **MUA NGAY** buttons | `docker exec tlcv_backend npx medusa exec ./src/scripts/seed-product-inventory.ts` then hard-refresh the page |
| Medusa T-Shirt / Sweatshirt in catalog | `docker exec tlcv_backend npx medusa exec ./src/scripts/remove-medusa-demo-catalog.ts` |
| Admin login fails | Confirm `.env.dev` has `COOKIE_SECURE=false`, then `docker compose -f infra/docker-compose.yml --env-file .env.dev up -d backend` |
| Stale page after DB change | Ctrl+Shift+R in the browser |

If the backend never becomes healthy:

```powershell
docker logs tlcv_backend --tail 80
docker logs tlcv_backend_init --tail 80
```

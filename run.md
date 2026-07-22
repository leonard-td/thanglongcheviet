# How to run the app (dev)

**Branch:** `fix/tlcv-quality-pass`  
**Site:** http://localhost:8800  
**Changes:** see [note.md](./note.md)

---

## Before first run (once)

1. Install **Docker Desktop** and **Node.js 20+**.
2. Open PowerShell:

```powershell
cd D:\project_Dung\thanglongcheviet
git checkout fix/tlcv-quality-pass
```

3. If `.env.dev` does not exist:

```powershell
copy .env.example .env.dev
```

Do not edit `NUXT_PUBLIC_MEDUSA_*` in `.env.dev` by hand — the script below writes them.

---

## Run the app (use this every time)

Copy and paste this whole block in PowerShell from the repo root:

```powershell
cd D:\project_Dung\thanglongcheviet

# Stop old containers (keeps your database)
docker compose -f infra/docker-compose.prod.yml down --remove-orphans 2>$null
docker compose -f infra/docker-compose.yml --env-file .env.dev down --remove-orphans

# Start stack
docker compose -f infra/docker-compose.yml --env-file .env.dev up -d

# Wait until Medusa backend is healthy (first boot can take 2–3 minutes)
Write-Host "Waiting for tlcv_backend to become healthy..."
$deadline = (Get-Date).AddMinutes(5)
do {
  Start-Sleep -Seconds 5
  $health = docker inspect -f "{{if .State.Health}}{{.State.Health.Status}}{{else}}starting{{end}}" tlcv_backend 2>$null
  Write-Host "  backend: $health"
} while ($health -ne "healthy" -and (Get-Date) -lt $deadline)

if ($health -ne "healthy") {
  Write-Host "ERROR: backend not healthy. Check: docker logs tlcv_backend --tail 80"
  exit 1
}

# Sync publishable key + region + navigation into .env.dev, then restart Nuxt
node scripts/setup-web-integration.mjs
docker compose -f infra/docker-compose.yml --env-file .env.dev up -d web

Write-Host ""
Write-Host "Ready:"
Write-Host "  Storefront  http://localhost:8800"
Write-Host "  English     http://localhost:8800/en"
Write-Host "  Products    http://localhost:8800/san-pham-list"
Write-Host "  Admin       http://localhost:8800/app  (admin@medusa.local / supersecret123)"
```

That is the only start flow you need on Windows.

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

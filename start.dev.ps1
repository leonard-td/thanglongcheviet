# Thăng Long Chè Việt — start full dev stack (Windows PowerShell)
# Usage: .\start.dev.ps1
# Branch: feat/tlcv-post-merge-quality-pass — see run.md

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

Write-Host '==> Stopping old containers (database volumes kept)...'
docker compose -f infra/docker-compose.prod.yml down --remove-orphans 2>$null
if ($LASTEXITCODE -ne 0) { $LASTEXITCODE = 0 }
docker compose -f infra/docker-compose.yml --env-file .env.dev down --remove-orphans
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "==> Starting stack..."
docker compose -f infra/docker-compose.yml --env-file .env.dev up -d
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host '==> Waiting for tlcv_backend to become healthy (first boot may take 2-3 minutes)...'
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

Write-Host "==> Syncing publishable key, region, navigation..."
node scripts/setup-web-integration.mjs
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "==> Restarting web..."
docker compose -f infra/docker-compose.yml --env-file .env.dev up -d web
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host ""
Write-Host "========================================"
Write-Host "  Thang Long Che Viet - dev stack ready"
Write-Host "========================================"
Write-Host ""
Write-Host 'STOREFRONT [Nuxt]'
Write-Host '  Home [VI]     http://localhost:8800/'
Write-Host '  Home [EN]     http://localhost:8800/en'
Write-Host '  Products      http://localhost:8800/san-pham-list'
Write-Host '  Cart          http://localhost:8800/gio-hang'
Write-Host '  Blog          http://localhost:8800/tin-tuc'
Write-Host '  Welcome post  http://localhost:8800/tin-tuc/welcome-to-our-store'
Write-Host '  Corporate     http://localhost:8800/qua-tang-doanh-nghiep'
Write-Host '  Contact       http://localhost:8800/lien-he'
Write-Host ""
Write-Host 'ADMIN [Medusa]'
Write-Host '  Dashboard     http://localhost:8800/app'
Write-Host '  Email         admin@medusa.local'
Write-Host '  Password      supersecret123'
Write-Host ""
Write-Host "DEBUG"
Write-Host '  Backend API   http://localhost:9000'
Write-Host '  Health        http://localhost:8800/health'
Write-Host ""
Write-Host "QUICK CHECK"
Write-Host '  1. Open storefront home - header nav + product images load'
Write-Host '  2. Open /san-pham-list - add-to-cart buttons active, not greyed out'
Write-Host '  3. Log in to /app - manage products, campaign posts, settings'
Write-Host ""
Write-Host "DOCS"
Write-Host '  Run guide     run.md'
Write-Host '  Change log    note.md'
Write-Host ""
Write-Host "STOP"
Write-Host '  docker compose -f infra/docker-compose.yml --env-file .env.dev down'
Write-Host ""
Write-Host 'Full reset [wipes DB]: add -v to the down command above'
Write-Host "========================================"

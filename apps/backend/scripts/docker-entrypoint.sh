#!/bin/sh
# Docker entrypoint for Medusa backend.
# Default: production admin bundle (stable — no Vite stale-chunk errors).
# Opt in to full Vite dev admin: ENABLE_ADMIN_HMR=true + DISABLE_ADMIN_HMR=false
set -e

cd "$(dirname "$0")/.."

npx medusa db:migrate
npx medusa user -e "${ADMIN_EMAIL:-admin@medusa.local}" -p "${ADMIN_PASSWORD:-supersecret123}" 2>/dev/null || true
npx medusa exec /workspace/apps/backend/src/migration-scripts/initial-data-seed.ts 2>/dev/null || true

use_vite_admin=false
if [ "${ENABLE_ADMIN_HMR}" = "true" ] && [ "${DISABLE_ADMIN_HMR}" != "true" ]; then
  use_vite_admin=true
fi

if [ "$use_vite_admin" = "true" ]; then
  echo "[backend] Starting with Vite admin dev server (ENABLE_ADMIN_HMR=true)"
  rm -rf node_modules/.vite
  exec npx medusa develop
fi

echo "[backend] Building admin dashboard (production bundle, DISABLE_ADMIN_HMR=${DISABLE_ADMIN_HMR:-true}, ADMIN_AUTH_TYPE=${ADMIN_AUTH_TYPE:-jwt})"
export ADMIN_AUTH_TYPE="${ADMIN_AUTH_TYPE:-jwt}"
node scripts/patch-navigation-plugin.mjs
admin_index=".medusa/server/public/admin/index.html"
if [ ! -f "$admin_index" ] || [ "${ADMIN_FORCE_REBUILD}" = "true" ]; then
  npx medusa build
else
  echo "[backend] Reusing existing admin build ($admin_index). Set ADMIN_FORCE_REBUILD=true to rebuild."
fi

export NODE_ENV=production
cd .medusa/server
exec npx medusa start

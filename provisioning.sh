
# get REBUILD_ALL from .env.prod (default false) so you can force a full rebuild/clean of the prod stack
set -a
. .env.prod
set +a

COMPOSE=(docker compose -f infra/docker-compose.prod.yml --env-file .env.prod)

# --- provisioning (ALWAYS runs — idempotent) ----------------------------------
# A fresh database (first deploy on a new host, or any REBUILD_ALL run, which
# wipes Postgres) starts EMPTY. The backend's boot command seeds base commerce
# data (sales channel, VND currency, Vietnam region, stock location/shipping,
# publishable key — see apps/backend/src/scripts/seed-base.ts), but the
# NUXT_PUBLIC_* values in .env.prod still point at the PREVIOUS database, so
# every Store API call would fail with "A valid publishable key is required".
# setup-web-integration.mjs reconciles: it re-creates anything still missing
# via the Admin API, reads the real key + region id, and writes them back into
# .env.prod through the /workspace bind mount. It runs INSIDE the backend
# container so the host needs no Node. If .env.prod changed, recreate web
# (--no-deps: skip re-running the heavy one-shot build) to pick the values up.
# The admin user needs no step here — the backend's own boot command recreates
# it from ADMIN_EMAIL/ADMIN_PASSWORD on every start.
echo "==> Provisioning store base data + publishable key (idempotent)..."
# env_before="$(md5sum .env.prod | awk '{print $1}')"
"${COMPOSE[@]}" exec -T \
  -e MEDUSA_BACKEND_URL=http://localhost:9000 \
  -e ENV_FILE=/workspace/.env.prod \
  -e ADMIN_EMAIL="${ADMIN_EMAIL:-admin@medusa.local}" \
  -e ADMIN_PASSWORD="${ADMIN_PASSWORD:-supersecret123}" \
  backend node /workspace/scripts/setup-web-integration.mjs

# execute script to initialize data: npx medusa exec ./src/migration-scripts/initial-data-seed.ts
echo "==> Executing initial data seed script..."
"${COMPOSE[@]}" exec -T \
  backend npx medusa exec /workspace/apps/backend/src/migration-scripts/initial-data-seed.ts

"${COMPOSE[@]}" up -d --no-deps --force-recreate web 

# env_after="$(md5sum .env.prod | awk '{print $1}')"
# if [ "$env_before" != "$env_after" ] || [ "$REBUILD_ALL" = "true" ]; then
#   echo "==> .env.prod changed or REBUILD_ALL=true — restarting web with the refreshed publishable key/region..."
#   # --no-deps: skip re-running the heavy one-shot build (it already ran above)
#   # --force-recreate: web needs a fresh container to pick up the new .env.prod
# else
#   echo "==> .env.prod unchanged — no need to restart web."
# fi

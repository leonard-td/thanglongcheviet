#!/bin/bash
set -e

set -a
. .env.dev
set +a
# --env-file loads `.env` from the repo root (see .env.example) without
# touching how the compose file's own relative paths (../:/workspace,
# ./nginx/...) resolve — those stay relative to infra/, where the file lives.
# (Do NOT use --project-directory here: it would also rebase those paths onto
# the repo root, turning "../" into the repo's *parent* directory.)

# stop all running containers and remove any orphaned ones, then clear volumes/networks in prod environment
docker compose -f infra/docker-compose.prod.yml down --remove-orphans || true

COMPOSE="docker compose -f infra/docker-compose.yml --env-file .env.dev"

$COMPOSE down

if grep -q '^REBUILD_ALL=true' .env.dev; then
  echo "==> REBUILD_ALL: wiping ALL volumes (Postgres data included!)..."
  "${COMPOSE[@]}" down -v --remove-orphans || true
  echo "==> Volumes wiped — the database will be re-seeded from scratch."
fi

# #docker remove all images
# $COMPOSE down --rmi all
# # remove all volumes
# $COMPOSE down -v

# Source code inside the containers already hot-reloads (dev servers with
# polling — see docker-compose.yml). docker-compose.yml itself and
# medusa-config.ts don't: only `docker compose up -d` re-reads the former,
# and the backend process only reads the latter once at startup. This
# background watcher applies those two automatically; killed via the trap
# below whenever `$COMPOSE up` exits (Ctrl+C included).
./scripts/watch-config.sh &
WATCH_PID=$!
trap 'kill "$WATCH_PID" 2>/dev/null' EXIT

$COMPOSE up -d

# Keeps apps/web talking to the Store API: the publishable key + region id in
# .env.dev only stay valid for the Postgres volume they were provisioned
# against, so a fresh/reset DB (or a stale checkout) leaves them pointing at
# records that no longer exist -> Store API calls fail with
# {"type":"not_allowed","message":"A valid publishable key is required..."}.
# The script is idempotent (checks-then-creates for every resource) and waits
# out backend startup itself, so it's safe/cheap to run unconditionally on
# every start rather than trying to detect when it's "needed".
echo "==> Ensuring web/store integration (publishable key, region, navigation)..."
node scripts/setup-web-integration.mjs || echo "WARN: setup-web-integration.mjs failed — see output above; apps/web may show a publishable-key error until this is fixed and start.dev.sh is re-run."

# Re-attach in the foreground: containers are already up, so this only starts
# streaming their logs (no recreate) and restores Ctrl+C -> stop-everything,
# matching the plain `$COMPOSE up` behavior this replaces.
$COMPOSE up
# $COMPOSE --profile storefront up -d

# export COMPOSE_PROFILES=storefront
# $COMPOSE up

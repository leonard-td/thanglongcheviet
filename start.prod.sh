#!/bin/bash
# Production run on THIS machine — idempotent, safe to re-run.
#
# Builds natively with local Node.js (build-local.sh — npm install +
# `medusa build` + `nuxt build`, no docker involved in the build), then
# starts infra/docker-compose.prod.yml from that prebuilt output via
# run-prod-stack.sh — the exact same runtime script deploy.sh runs on a
# remote server. The compose stack itself never compiles anything.
#
# TLS/domain is intentionally NOT handled here — front this stack (published
# on HTTP_PORT, default 8800) with your existing nginx/reverse proxy for SSL.
#
# Usage (on the host, from the repo root):
#   cp .env.example .env.prod    # fill in DOMAIN, secrets/CORS, HTTP_PORT...
#   ./start.prod.sh
#
# Options (env vars): SKIP_BUILD=1, SKIP_INSTALL=1 (see build-local.sh)
set -euo pipefail

cd "$(dirname "$0")"

# stop the dev stack first — dev and prod fight over the same host ports
docker compose -f infra/docker-compose.yml down --remove-orphans || true

if [ ! -f .env.prod ]; then
  echo "Missing .env.prod — run: cp .env.example .env.prod, fill it in, then retry." >&2
  exit 1
fi

if [ "${SKIP_BUILD:-0}" != "1" ]; then
  bash ./build-local.sh
fi

bash ./run-prod-stack.sh
 
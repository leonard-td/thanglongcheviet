#!/bin/bash
# =============================================================================
# Remote deploy over SSH — build NATIVELY here, ship ONLY the built output.
# =============================================================================
# No source code reaches the server and the server never builds:
#
#   1. build-local.sh — npm install + `medusa build` + `nuxt build`, all with
#      plain LOCAL Node.js (Git Bash on Windows, macOS, Linux — no docker
#      needed on this machine)
#   2. copy-to-server.sh — ships ONLY built artifacts + runtime files (never
#      node_modules, never src/) plus .env.prod on the first deploy. That
#      script owns the whole payload/rsync/tar story and runs standalone too
#      (reship files without restarting the stack) — see its header.
#   3. run run-prod-stack.sh on the server: docker compose starts the stack on
#      stock node:20 images. Its one-shot `deps` service only installs the
#      prebuilt backend's runtime deps (npm install --omit=dev) and refetches
#      sharp's linux binary — no compile/build of any kind happens there.
#
# Works from Git Bash (Windows), Linux, and macOS.
#
# Prerequisites:
#   local : bash + ssh + Node >= 20 + npm + (rsync or tar), SSH key auth
#   server: docker + compose v2 installed, user allowed to run docker
#
# Usage (from the repo root):
#   ./deploy.sh [user@server-ip] [remote_dir]     # defaults below
#
# Options (env vars):
#   DEPLOY_SERVER=user@ip   override the default server
#   DEPLOY_DIR=/path        override the default remote directory
#   DEPLOY_SSH_PORT=22      SSH port
#   SKIP_BUILD=1            redeploy the existing local build output as-is
#   SKIP_INSTALL=1          build, but skip the root `npm install`
#   PUSH_ENV=1              overwrite the server's .env.prod with the local one
#   DEPLOY_DOMAIN=domain    when pushing .env.prod, set its DOMAIN to this
#                           (e.g. thanglongcheviet.ddnsfree.com)
# The last two are forwarded to copy-to-server.sh, which owns .env.prod
# handling (first-deploy-only push + DOMAIN resolution) — see its header.
# =============================================================================
set -euo pipefail

cd "$(dirname "$0")"

docker compose -f infra/docker-compose.prod.yml down --remove-orphans || true
docker compose -f infra/docker-compose.yml down --remove-orphans || true


# main server: 192.168.1.108
# test server:  192.168.1.207
DEPLOY_SERVER="${DEPLOY_SERVER:-d@192.168.1.108}"
DEPLOY_DIR="${DEPLOY_DIR:-www/thanglongcheviet}"

SERVER="${1:-$DEPLOY_SERVER}"
REMOTE_DIR="${2:-$DEPLOY_DIR}"
SSH_PORT="${DEPLOY_SSH_PORT:-22}"
PUSH_ENV="${PUSH_ENV:-0}"
DEPLOY_DOMAIN="${DEPLOY_DOMAIN:-}"

# SKIP_BUILD=0
# if [ "${SKIP_INSTALL:-0}" = "1" ]; then
#   SKIP_BUILD=1
#   SKIP_INSTALL=1
# fi

if [ -z "$SERVER" ]; then
  echo "Usage: ./deploy.sh <user@server-ip> [remote_dir]" >&2
  echo "Env options: DEPLOY_SERVER, DEPLOY_DIR, DEPLOY_SSH_PORT, PUSH_ENV=1, DEPLOY_DOMAIN=<domain>, SKIP_BUILD=1" >&2
  exit 1
fi

HOST_IP="${SERVER##*@}"
SSH=(ssh -p "$SSH_PORT" "$SERVER")

# --- build locally (plain Node.js — the ONLY place builds happen) --------------
if [ "${SKIP_BUILD:-0}" != "1" ]; then
  bash ./build-local.sh
else
  echo "==> SKIP_BUILD=1 — deploying the existing build output."
  [ -f apps/backend/.medusa/server/package.json ] && [ -f apps/web/.output/server/index.mjs ] \
    || { echo "ERROR: no build output found — run ./build-local.sh first." >&2; exit 1; }
fi

# --- key auth (one-time setup on a fresh machine) ------------------------------
# Every later ssh/scp/rsync would ask for the password without a key, so if
# key auth is not working yet, run setup-ssh.sh: it generates a key if this
# machine has none and installs it on the server (asks the password ONCE).
if ! ssh -p "$SSH_PORT" -o BatchMode=yes -o ConnectTimeout=5 "$SERVER" true 2>/dev/null; then
  echo "==> SSH key auth not working yet — running setup-ssh.sh ..."
  bash ./setup-ssh.sh "$SERVER"
fi

echo "==> Preflight: checking the server..."
"${SSH[@]}" "set -e
  command -v docker >/dev/null || { echo 'ERROR: docker is not installed on the server'; exit 1; }
  docker compose version >/dev/null 2>&1 || { echo 'ERROR: docker compose v2 plugin is missing on the server'; exit 1; }
  mkdir -p $REMOTE_DIR"

# --- copy .env.prod + built artifacts to the server ---------------------------
# Everything about WHAT gets shipped and HOW lives in copy-to-server.sh (it is
# runnable on its own to reship files without restarting the stack). The env
# vars are passed explicitly rather than relied on through inheritance.
DEPLOY_SSH_PORT="$SSH_PORT" PUSH_ENV="$PUSH_ENV" DEPLOY_DOMAIN="$DEPLOY_DOMAIN" \
  bash ./copy-to-server.sh "$SERVER" "$REMOTE_DIR"

# --- deploy ---------------------------------------------------------------------
echo "==> Starting the stack on the server (prebuilt output — no build there)..."
"${SSH[@]}" "cd $REMOTE_DIR &&
  sed -i 's/\r\$//' *.sh 2>/dev/null || true
  chmod +x *.sh 2>/dev/null || true
  bash ./run-prod-stack.sh"

# --- verify from this machine ------------------------------------------------------
HTTP_PORT="$("${SSH[@]}" "grep '^HTTP_PORT=' $REMOTE_DIR/.env.prod | cut -d= -f2" )"
HTTP_PORT="${HTTP_PORT:-8800}"
echo "==> Verifying http://$HOST_IP:$HTTP_PORT/health ..."
for _ in $(seq 1 10); do
  if curl -fsS -m 5 "http://$HOST_IP:$HTTP_PORT/health" >/dev/null 2>&1; then
    echo "==> DEPLOY OK"
    echo "    Web:   http://$HOST_IP:$HTTP_PORT/"
    echo "    Admin: http://$HOST_IP:$HTTP_PORT/app"
    echo ""
    echo "First deploy only — create the admin user:"
    echo "  ssh -p $SSH_PORT $SERVER 'cd $REMOTE_DIR && bash ./create-admin.sh --prod'"
    exit 0
  fi
  sleep 3
done

echo "WARNING: /health not reachable from here (server firewall may block port $HTTP_PORT)." >&2
echo "Check on the server:" >&2
echo "  ssh -p $SSH_PORT $SERVER 'cd $REMOTE_DIR && docker compose -f infra/docker-compose.prod.yml --env-file .env.prod ps'" >&2
exit 1

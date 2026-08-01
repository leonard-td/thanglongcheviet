#!/bin/bash
# =============================================================================
# Remote deploy over SSH — build NATIVELY here, ship ONLY the built output.
# =============================================================================
# No source code reaches the server and the server never builds:
#
#   1. build-local.sh — npm install + `medusa build` + `nuxt build`, all with
#      plain LOCAL Node.js (Git Bash on Windows, macOS, Linux — no docker
#      needed on this machine)
#   2. copy ONLY built artifacts + runtime files (never node_modules, never
#      src/) to the server:
#        apps/backend/.medusa/server   compiled Medusa API + admin dashboard
#        apps/web/.output              self-contained Nitro server
#        infra/ compose + nginx config, ops scripts, .env.prod (first deploy)
#   3. run run-prod-stack.sh on the server: docker compose starts the stack on
#      stock node:20 images. Its one-shot `deps` service only installs the
#      prebuilt backend's runtime deps (npm install --omit=dev) and refetches
#      sharp's linux binary — no compile/build of any kind happens there.
#
# Works from Git Bash (Windows), Linux, and macOS:
#   - rsync on both ends -> incremental sync + stale-artifact delete
#   - no rsync (stock Git Bash) -> tar-over-ssh full-copy fallback
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
#   PUSH_ENV=1              overwrite the server's .env.prod with the local one
#   DEPLOY_DOMAIN=domain    when pushing .env.prod, set its DOMAIN to this
#                           (e.g. thanglongcheviet.ddnsfree.com)
#   SKIP_BUILD=1            redeploy the existing local build output as-is
#   SKIP_INSTALL=1          build, but skip the root `npm install`
#
# .env.prod handling: the server keeps its OWN copy (it may hold real secrets).
# It is only pushed on the FIRST deploy — or when you explicitly pass
# PUSH_ENV=1 — never silently overwritten. On push, DOMAIN is resolved as:
#   DEPLOY_DOMAIN set          -> use it
#   local DOMAIN=localhost     -> rewrite to the server IP (LAN fallback)
#   local DOMAIN=<real domain> -> keep as-is (never clobbered by the IP)
# =============================================================================
set -euo pipefail

cd "$(dirname "$0")"
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

# --- .env.prod ----------------------------------------------------------------
if [ "$PUSH_ENV" = "1" ] || ! "${SSH[@]}" "[ -f $REMOTE_DIR/.env.prod ]"; then
  [ -f .env.prod ] || { echo "ERROR: local .env.prod missing (cp .env.example .env.prod first)." >&2; exit 1; }
  if grep -q '^REBUILD_ALL=true' .env.prod; then
    echo "!!  WARNING: .env.prod has REBUILD_ALL=true — on the server run-prod-stack.sh"
    echo "!!  will wipe ALL prod volumes, INCLUDING the Postgres database."
    echo "!!  (store data + publishable key are re-provisioned automatically after)"
    read -r -p "!!  Continue anyway? [y/N] " ans
    # case (not \${ans,,}): macOS ships bash 3.2 without lowercase expansion.
    case "$ans" in y|Y) ;; *) exit 1 ;; esac
  fi
  echo "==> Pushing .env.prod..."
  scp -P "$SSH_PORT" -q .env.prod "$SERVER:$REMOTE_DIR/.env.prod"
  # DOMAIN on the server: an explicit DEPLOY_DOMAIN wins; otherwise only the
  # localhost placeholder is rewritten to the server IP — a real domain in the
  # local .env.prod is kept as-is (never clobbered back to the IP).
  if [ -n "$DEPLOY_DOMAIN" ]; then
    echo "==> Setting DOMAIN=$DEPLOY_DOMAIN in the server's .env.prod..."
    "${SSH[@]}" "sed -i 's/^DOMAIN=.*/DOMAIN=$DEPLOY_DOMAIN/' $REMOTE_DIR/.env.prod"
  elif grep -q '^DOMAIN=localhost[[:space:]]*$' .env.prod; then
    echo "==> Local DOMAIN=localhost — rewriting to server IP $HOST_IP (set DEPLOY_DOMAIN=<domain> to use a real domain)..."
    "${SSH[@]}" "sed -i 's/^DOMAIN=.*/DOMAIN=$HOST_IP/' $REMOTE_DIR/.env.prod"
  else
    echo "==> Keeping DOMAIN from the local .env.prod."
  fi
else
  echo "==> Server already has .env.prod — keeping it (PUSH_ENV=1 to overwrite)."
fi

# --- sync BUILT artifacts + runtime files ---------------------------------------
# Deliberately no src/, no node_modules: the deploy payload is only what the
# stack needs at runtime. `static` (uploads) and the backend's node_modules
# live on docker named volumes on the server — never part of the transfer.
PAYLOAD=(
  apps/backend/.medusa/server
  apps/web/.output
  infra/docker-compose.prod.yml
  infra/nginx/nginx.conf
  infra/nginx/conf.d
  scripts/setup-web-integration.mjs
  run-prod-stack.sh provisioning.sh create-admin.sh
)
# Path-SPECIFIC excludes — a generic 'node_modules' pattern must NOT be used
# here: apps/web/.output/server/node_modules is part of the built artifact
# (nuxt bundles its runtime deps — ipx, sharp, vue... — in there) and the web
# service dies with ERR_MODULE_NOT_FOUND without it. Only the BACKEND's
# node_modules stays behind (the server installs it via the one-shot `deps`
# service) along with its static/ uploads (docker named volume).
# .env*: medusa build copies apps/backend/.env (dev secrets) into its output
# when one exists — never ship it. The server's .env.prod is scp'd separately.
EXCLUDES=(
  'apps/backend/.medusa/server/node_modules'
  'apps/backend/.medusa/server/static'
  '.env*'
)

if command -v rsync >/dev/null && "${SSH[@]}" "command -v rsync >/dev/null"; then
  echo "==> Syncing built output with rsync to $SERVER:$REMOTE_DIR ..."
  RSYNC_EX=()
  for e in "${EXCLUDES[@]}"; do RSYNC_EX+=(--exclude "$e"); done
  # -R (--relative) recreates the apps/... / infra/... paths on the server;
  # --delete drops stale build chunks. --stats (not --info=stats1): macOS
  # ships rsync 2.6.9 which lacks --info.
  # -L (--copy-links): nitro's .output/server/node_modules uses SYMLINKS into
  # its .nitro store with ABSOLUTE local paths (e.g. entities, css-tree) —
  # copied verbatim they dangle on the server and the web service dies with
  # "Cannot find module 'entities/decode'". Dereferencing ships real files.
  rsync -azLR --delete --stats -e "ssh -p $SSH_PORT" "${RSYNC_EX[@]}" \
    "${PAYLOAD[@]}" "$SERVER:$REMOTE_DIR/"
else
  echo "==> rsync not available on both ends — falling back to tar over ssh (full copy)."
  # Without rsync --delete, stale build chunks (renamed bundles etc.) would
  # linger, so wipe the pure-artifact dirs first. .env.prod and the docker
  # named volumes (Postgres, backend node_modules, uploads) are untouched.
  "${SSH[@]}" "cd $REMOTE_DIR &&
    rm -rf apps/backend/.medusa/server apps/web/.output infra scripts 2>/dev/null || true"
  # Pair each pattern with ./-anchored and */-prefixed variants so both GNU tar
  # (Git Bash/Linux) and bsdtar (macOS) match nested paths the same way.
  TAR_EX=()
  for e in "${EXCLUDES[@]}"; do
    TAR_EX+=(--exclude "$e" --exclude "./$e" --exclude "*/$e")
  done
  # -h (--dereference): materialize nitro's absolute-path symlinks (see the
  # rsync -L comment above) — GNU tar and bsdtar both accept -h for this.
  tar czhf - "${TAR_EX[@]}" "${PAYLOAD[@]}" | "${SSH[@]}" "tar xzf - -C $REMOTE_DIR"
  echo "    Transfer done."
fi

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

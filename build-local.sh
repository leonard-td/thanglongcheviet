#!/bin/bash
# Builds everything Node.js NATIVELY on this machine — no docker required.
# Works from Git Bash (Windows), macOS, and Linux; needs Node >= 20 + npm.
#
# Output (what deploy.sh ships to the server):
#   apps/backend/.medusa/server   compiled Medusa API + built admin dashboard
#                                 (ships a package.json but NO node_modules —
#                                 the server installs runtime deps in docker)
#   apps/web/.output              self-contained Nitro server (deps bundled)
#
# Options (env vars):
#   SKIP_INSTALL=1   skip the root `npm install` (node_modules already fresh)
set -euo pipefail

cd "$(dirname "$0")"

command -v node >/dev/null || { echo "ERROR: node is not installed (need >= 20)." >&2; exit 1; }
command -v npm >/dev/null || { echo "ERROR: npm is not installed." >&2; exit 1; }

# remove old folder if it exists
rm -rf apps/backend/.medusa/server apps/web/.output

echo "==> Checking Node version..."
NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
if [ "$NODE_MAJOR" -lt 20 ]; then
  echo "ERROR: Node >= 20 required (found $(node -v))." >&2
  exit 1
fi

if [ "${SKIP_INSTALL:-0}" != "1" ]; then
  echo "==> npm install (workspace root)..."
  # Prefer offline/cache to avoid npm registry E429.
  npm install --no-audit --no-fund --prefer-offline \
    || npm install --no-audit --no-fund --prefer-offline --legacy-peer-deps
fi

echo "==> Building backend (medusa build)..."
npm run build --workspace=apps/backend

echo "==> Building web (nuxt build)..."
npm run build --workspace=apps/web

[ -f apps/backend/.medusa/server/package.json ] \
  || { echo "ERROR: backend build output missing (apps/backend/.medusa/server)." >&2; exit 1; }
[ -f apps/web/.output/server/index.mjs ] \
  || { echo "ERROR: web build output missing (apps/web/.output/server)." >&2; exit 1; }

echo "==> Build done:"
echo "    apps/backend/.medusa/server"
echo "    apps/web/.output"

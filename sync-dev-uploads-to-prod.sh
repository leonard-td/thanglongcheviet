#!/bin/bash
# Copies real uploaded product images (Medusa file-local provider, under
# apps/backend/static/) from the DEV environment into the PROD stack's
# `backend_static` named volume.
#
# Why this is needed: dev's apps/backend/static/ is a plain bind-mounted
# directory (see infra/docker-compose.yml), but prod's static uploads live in
# a separate named docker volume (infra/docker-compose.prod.yml's
# backend_static, mounted at .medusa/server/static) that deploy.sh
# deliberately never overwrites on redeploy (uploads must survive rebuilds).
# The two are never automatically in sync.
#
# Product export/import (Admin > Products > Export / Import) only carries CSV
# rows — the image columns are just `/static/<filename>` STRINGS, the import
# never uploads any image bytes. Without this script, an imported product's
# thumbnail/image URLs point at files that don't exist on the prod server
# (broken image icons), even though the product row itself imported fine.
#
# Usage (run from the repo root, from WSL where docker lives):
#   1. In the DEV admin (/app/products) click Export, download the CSV.
#   2. ./sync-dev-uploads-to-prod.sh   <- copies the actual image files
#   3. ./start.prod.sh                 <- if the prod stack isn't running yet
#   4. In the PROD admin (/app/products) click Import, upload the CSV from
#      step 1, review the preview, Confirm.
#
# Safe to re-run any time: only ADDS files that don't already exist in prod's
# volume (no-clobber) — never touches or overwrites anything already
# uploaded directly in prod.
set -euo pipefail

cd "$(dirname "$0")"

SRC_DIR="apps/backend/static"
DEST_VOLUME="tlcv-prod_backend_static"

if [ ! -d "$SRC_DIR" ]; then
  echo "ERROR: $SRC_DIR not found — run this from the repo root." >&2
  exit 1
fi

if ! docker volume inspect "$DEST_VOLUME" >/dev/null 2>&1; then
  echo "ERROR: docker volume '$DEST_VOLUME' doesn't exist yet." >&2
  echo "       Run ./start.prod.sh at least once first (it creates the prod volumes)." >&2
  exit 1
fi

echo "==> Copying image files from $SRC_DIR into prod volume '$DEST_VOLUME' (no-clobber)..."
docker run --rm \
  -v "$(pwd)/$SRC_DIR:/src:ro" \
  -v "$DEST_VOLUME:/dest" \
  alpine sh -c '
    count=0
    for f in /src/*; do
      [ -f "$f" ] || continue
      name="$(basename "$f")"
      if [ -e "/dest/$name" ]; then
        continue
      fi
      cp "$f" "/dest/$name"
      count=$((count + 1))
    done
    echo "==> Copied $count new file(s)."
  '

echo "==> Done. Now import the CSV in the prod admin (Products > Import)."

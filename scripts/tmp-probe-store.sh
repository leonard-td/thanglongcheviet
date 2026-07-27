#!/bin/bash
set -euo pipefail
BASE="${1:-http://127.0.0.1:8800}"

echo "=== docker web env (masked) ==="
docker exec tlcv_web printenv NUXT_PUBLIC_MEDUSA_BACKEND_URL || true
KEY=$(docker exec tlcv_web printenv NUXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY 2>/dev/null || true)
REGION=$(docker exec tlcv_web printenv NUXT_PUBLIC_MEDUSA_REGION_ID 2>/dev/null || true)
echo "KEY_PREFIX=${KEY:0:10}... KEY_LEN=${#KEY}"
echo "REGION=$REGION"
echo "SERVER=$(docker exec tlcv_web printenv NUXT_MEDUSA_BACKEND_URL_SERVER 2>/dev/null || true)"

probe() {
  local label="$1"
  local url="$2"
  local hdr="${3:-}"
  echo
  echo "=== $label ==="
  echo "URL=$url"
  if [ -n "$hdr" ]; then
    curl -sS -w "\nHTTP:%{http_code}\n" --max-time 20 -H "$hdr" "$url" | tail -c 800
  else
    curl -sS -w "\nHTTP:%{http_code}\n" --max-time 20 "$url" | tail -c 800
  fi
  echo
}

probe "products NO key" "$BASE/store/products?limit=1"
if [ -n "$KEY" ]; then
  probe "products WITH key" "$BASE/store/products?limit=1" "x-publishable-api-key: $KEY"
  probe "site-settings WITH key" "$BASE/store/site-settings" "x-publishable-api-key: $KEY"
  probe "navigations WITH key" "$BASE/store/navigations" "x-publishable-api-key: $KEY"
  probe "campaign-posts WITH key" "$BASE/store/campaign-posts?limit=2" "x-publishable-api-key: $KEY"
  probe "categories WITH key" "$BASE/store/product-categories?limit=1" "x-publishable-api-key: $KEY"
  probe "collections WITH key" "$BASE/store/collections?limit=1" "x-publishable-api-key: $KEY"
  if [ -n "$REGION" ]; then
    probe "products+region WITH key" "$BASE/store/products?limit=1&region_id=$REGION" "x-publishable-api-key: $KEY"
  fi
fi

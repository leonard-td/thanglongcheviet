#!/bin/bash
set -euo pipefail
BASE="${1:-http://127.0.0.1:8800}"
KEY=$(docker exec tlcv_web printenv NUXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY 2>/dev/null || true)
REGION=$(docker exec tlcv_web printenv NUXT_PUBLIC_MEDUSA_REGION_ID 2>/dev/null || true)
BACKEND_DIRECT="${2:-http://127.0.0.1:9000}"

echo "KEY_PREFIX=${KEY:0:12} KEY_LEN=${#KEY}"
echo "REGION=$REGION"
echo "BASE=$BASE BACKEND_DIRECT=$BACKEND_DIRECT"

page() {
  local path="$1"
  echo
  echo "=== PAGE $path ==="
  curl -sS -D - -o /tmp/page_body.txt --max-time 30 "$BASE$path" | head -n 20
  echo "--- body snippet ---"
  # Prefer Nuxt error markers / title
  grep -Eoi 'statusCode|statusMessage|Internal Server Error|Page not found|500|404|400|502|loadError|notFound|sweatpants|error' /tmp/page_body.txt | head -n 40 || true
  echo "body_bytes=$(wc -c </tmp/page_body.txt)"
}

api() {
  local label="$1"
  local url="$2"
  echo
  echo "=== API $label ==="
  echo "URL=$url"
  if [ -n "$KEY" ]; then
    curl -sS -w "\nHTTP:%{http_code}\n" --max-time 20 \
      -H "x-publishable-api-key: $KEY" "$url" | tail -c 1200
  else
    curl -sS -w "\nHTTP:%{http_code}\n" --max-time 20 "$url" | tail -c 1200
  fi
  echo
}

echo "=== docker ps ==="
docker ps --format 'table {{.Names}}\t{{.Status}}' | head -n 20

page "/san-pham/sweatpants"
page "/san-pham/ao-ni-tlcv-vintage"
page "/san-pham/no-such-product-xyz"

FIELDS='id,title,handle,description,thumbnail,material,weight,*images,*categories,*collection,*options,*options.values,*variants,*variants.options,*variants.calculated_price'

api "nginx handle=sweatpants" "$BASE/store/products?handle=sweatpants&region_id=$REGION&fields=$FIELDS"
api "direct handle=sweatpants" "$BACKEND_DIRECT/store/products?handle=sweatpants&region_id=$REGION&fields=$FIELDS"
api "nginx handle=ao-ni" "$BASE/store/products?handle=ao-ni-tlcv-vintage&region_id=$REGION&fields=$FIELDS"
api "nginx handle=missing" "$BASE/store/products?handle=no-such-product-xyz&region_id=$REGION&fields=$FIELDS"
api "nginx list limit=5" "$BASE/store/products?limit=5&region_id=$REGION&fields=id,title,handle,status"

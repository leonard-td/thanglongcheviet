#!/bin/bash
# Masked probe — never print full API key
set -uo pipefail
KEY=$(docker exec tlcv_web printenv NUXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY 2>/dev/null || true)
REG=$(docker exec tlcv_web printenv NUXT_PUBLIC_MEDUSA_REGION_ID 2>/dev/null || true)
echo "KEY_LEN=${#KEY} REG=${REG:-EMPTY}"

hit() {
  local label="$1"; shift
  echo "=== $label ==="
  curl -sS -w "\nHTTP:%{http_code}\n" --max-time 20 "$@" | tail -c 700
  echo
}

hit "with region" -H "x-publishable-api-key: $KEY" \
  "http://127.0.0.1:9000/store/products?handle=t-shirt&region_id=${REG}&fields=id,title,handle"
hit "empty region_id" -H "x-publishable-api-key: $KEY" \
  "http://127.0.0.1:9000/store/products?handle=t-shirt&region_id=&fields=id,title,handle,*variants.calculated_price"
hit "no region + calc price" -H "x-publishable-api-key: $KEY" \
  "http://127.0.0.1:9000/store/products?handle=t-shirt&fields=id,title,handle,*variants.calculated_price"

for p in /san-pham/t-shirt /en/products/t-shirt /products/t-shirt; do
  code=$(curl -sS -o /tmp/pg.html -w "%{http_code}" --max-time 30 "http://127.0.0.1:8800$p" || echo ERR)
  echo "PAGE $p -> $code"
done

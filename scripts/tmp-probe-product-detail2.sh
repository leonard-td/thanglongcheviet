#!/bin/bash
set -uo pipefail
BASE=http://127.0.0.1:8800
DIRECT=http://127.0.0.1:9000
KEY=$(docker exec tlcv_web printenv NUXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY)
REGION=$(docker exec tlcv_web printenv NUXT_PUBLIC_MEDUSA_REGION_ID)
HDR=(-H "x-publishable-api-key: $KEY")

echo "KEY=${KEY:0:12}... REGION=$REGION"

hit() {
  local label="$1"; shift
  echo
  echo "=== $label ==="
  echo "CMD: $*"
  curl -sS -w "\nHTTP:%{http_code} TIME:%{time_total}\n" --max-time 15 "$@" | tail -c 1500
  echo
}

# Health / simple pages first
hit "health via nginx" "$BASE/health"
hit "homepage short" -o /tmp/home.html -D /tmp/home.hdr "$BASE/"
head -n 15 /tmp/home.hdr || true
echo "home_bytes=$(wc -c </tmp/home.html 2>/dev/null || echo 0)"

# Store API via nginx
hit "products limit1" "${HDR[@]}" "$BASE/store/products?limit=1&region_id=$REGION&fields=id,title,handle"
hit "handle sweatpants" "${HDR[@]}" "$BASE/store/products?handle=sweatpants&region_id=$REGION&fields=id,title,handle,status"
hit "handle ao-ni" "${HDR[@]}" "$BASE/store/products?handle=ao-ni-tlcv-vintage&region_id=$REGION&fields=id,title,handle"
hit "categories sweatpants" "${HDR[@]}" "$BASE/store/product-categories?handle=sweatpants&fields=id,name,handle"
hit "list handles" "${HDR[@]}" "$BASE/store/products?limit=20&fields=id,title,handle"

# Direct backend
hit "direct products" "${HDR[@]}" "$DIRECT/store/products?limit=1&fields=id,title,handle"
hit "direct sweatpants" "${HDR[@]}" "$DIRECT/store/products?handle=sweatpants&fields=id,title,handle"

# Product pages with shorter timeout + capture status only
for p in /san-pham/ao-ni-tlcv-vintage /san-pham/sweatpants /san-pham/no-such-product-xyz /san-pham/danh-muc/sweatpants; do
  echo
  echo "=== PAGE STATUS $p ==="
  code=$(curl -sS -o /tmp/pbody.html -w "%{http_code}" --max-time 20 "$BASE$p" || echo "CURL_FAIL_$?")
  echo "status=$code bytes=$(wc -c </tmp/pbody.html 2>/dev/null || echo 0)"
  grep -Eoi 'Internal Server Error|Page not found|statusCode|500|404|502|400|NuxtError|error-page' /tmp/pbody.html 2>/dev/null | head -n 20 || true
done

echo
echo "=== recent web logs ==="
docker logs tlcv_web --tail 80 2>&1 | tail -n 80

echo
echo "=== recent backend logs ==="
docker logs tlcv_backend --tail 80 2>&1 | tail -n 80

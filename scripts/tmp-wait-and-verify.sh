#!/bin/bash
set -uo pipefail

echo "=== wait for backend healthy ==="
for i in $(seq 1 90); do
  if curl -sS --max-time 2 http://127.0.0.1:9000/health >/dev/null 2>&1; then
    echo "backend healthy after ${i} attempts"
    break
  fi
  sleep 2
  if [ "$i" -eq 90 ]; then echo "TIMEOUT waiting for backend"; docker logs tlcv_backend --tail 50 2>&1; exit 1; fi
done

# medusa develop often needs a few more seconds after /health
sleep 8

KEY=$(docker exec tlcv_web printenv NUXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY)
REGION=$(docker exec tlcv_web printenv NUXT_PUBLIC_MEDUSA_REGION_ID)
echo "KEY=${KEY:0:12}... REGION=$REGION"

hit() {
  local label="$1"; shift
  echo
  echo "=== $label ==="
  curl -sS -w "\ncode:%{http_code} t:%{time_total}\n" --max-time 25 "$@" | tail -c 1200
  echo
}

hit "products limit1" -H "x-publishable-api-key: $KEY" \
  "http://127.0.0.1:9000/store/products?limit=1&region_id=$REGION&fields=id,title,handle"

hit "handle sweatpants minimal" -H "x-publishable-api-key: $KEY" \
  "http://127.0.0.1:9000/store/products?handle=sweatpants&fields=id,title,handle,status"

FIELDS='id,title,handle,description,thumbnail,material,weight,*images,*categories,*collection,*options,*options.values,*variants,*variants.options,*variants.calculated_price'
hit "handle sweatpants full fields" -H "x-publishable-api-key: $KEY" \
  "http://127.0.0.1:9000/store/products?handle=sweatpants&region_id=$REGION&fields=$FIELDS"

hit "handle ao-ni" -H "x-publishable-api-key: $KEY" \
  "http://127.0.0.1:9000/store/products?handle=ao-ni-tlcv-vintage&fields=id,title,handle"

hit "handle missing" -H "x-publishable-api-key: $KEY" \
  "http://127.0.0.1:9000/store/products?handle=no-such-product-xyz&fields=id,title,handle"

echo "=== concurrent store fan-out (8 parallel) ==="
START=$(date +%s%3N)
for i in 1 2 3 4 5 6 7 8; do
  (
    code=$(curl -sS -o /dev/null -w "%{http_code}" --max-time 30 \
      -H "x-publishable-api-key: $KEY" \
      "http://127.0.0.1:9000/store/products?limit=1&fields=id,handle")
    echo "req$i=$code"
  ) &
done
wait
END=$(date +%s%3N)
echo "parallel_done ms=$((END-START))"

echo "=== pg connections after fan-out ==="
docker exec -i tlcv-postgres psql -U postgres -d medusa -c \
  "SELECT count(*) AS conns, count(*) FILTER (WHERE state='active') AS active, count(*) FILTER (WHERE state='idle') AS idle FROM pg_stat_activity WHERE datname=current_database();"

echo "=== page checks ==="
for p in /san-pham/sweatpants /san-pham/ao-ni-tlcv-vintage /san-pham/no-such-product-xyz; do
  code=$(curl -sS -o /tmp/p.html -w "%{http_code}" --max-time 40 "http://127.0.0.1:8800$p" || echo ERR)
  echo "$p -> $code bytes=$(wc -c </tmp/p.html 2>/dev/null || echo 0)"
  grep -Eoi 'Internal Server|Page not found|statusCode|Medusa Sweatpants|Áo nỉ|notFound|loadError|500|404|502' /tmp/p.html 2>/dev/null | head -n 15 || true
done

echo "=== backend errors recent ==="
docker logs tlcv_backend --tail 80 2>&1 | grep -E 'error|Timeout|Knex|EIO|GET /store/products' | tail -n 50

echo "=== product sweatpants variants/prices ==="
docker exec -i tlcv-postgres psql -U postgres -d medusa <<'SQL'
SELECT p.handle, p.status, v.id AS variant_id, v.title
FROM product p
JOIN product_variant v ON v.product_id = p.id
WHERE p.handle = 'sweatpants';
SELECT count(*) AS sc_links FROM product_sales_channel psc
JOIN product p ON p.id = psc.product_id WHERE p.handle='sweatpants';
SQL

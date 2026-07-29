#!/bin/bash
set -uo pipefail

echo "=== postgres connections ==="
docker exec -i tlcv-postgres psql -U postgres -d medusa <<'SQL'
SELECT count(*) AS total,
       count(*) FILTER (WHERE state='active') AS active,
       count(*) FILTER (WHERE state='idle') AS idle,
       count(*) FILTER (WHERE wait_event_type IS NOT NULL) AS waiting
FROM pg_stat_activity
WHERE datname = current_database();
SELECT pid, state, wait_event_type, wait_event, left(query,120) AS query
FROM pg_stat_activity
WHERE datname = current_database()
ORDER BY state, pid
LIMIT 30;
SQL

echo "=== restart backend to clear knex pool ==="
docker restart tlcv_backend
echo "waiting for healthy..."
for i in $(seq 1 60); do
  if curl -sS --max-time 2 http://127.0.0.1:9000/health >/dev/null 2>&1; then
    echo "healthy after ${i}s"
    break
  fi
  sleep 2
done

KEY=$(docker exec tlcv_web printenv NUXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY)
REGION=$(docker exec tlcv_web printenv NUXT_PUBLIC_MEDUSA_REGION_ID)
HDR=(-H "x-publishable-api-key: $KEY")
BASE=http://127.0.0.1:8800
DIRECT=http://127.0.0.1:9000

echo "KEY=${KEY:0:12}... REGION=$REGION"

hit() {
  local label="$1"; shift
  echo
  echo "=== $label ==="
  curl -sS -w "\nHTTP:%{http_code} TIME:%{time_total}\n" --max-time 20 "$@" | tail -c 2000
  echo
}

# Give Medusa a moment after health
sleep 5

hit "direct products" "${HDR[@]}" "$DIRECT/store/products?limit=5&fields=id,title,handle"
hit "direct sweatpants product" "${HDR[@]}" "$DIRECT/store/products?handle=sweatpants&fields=id,title,handle,status,*categories"
hit "direct sweatpants category" "${HDR[@]}" "$DIRECT/store/product-categories?handle=sweatpants&fields=id,name,handle"
hit "direct ao-ni" "${HDR[@]}" "$DIRECT/store/products?handle=ao-ni-tlcv-vintage&fields=id,title,handle"

echo "=== DB products/categories matching sweatpants ==="
docker exec -i tlcv-postgres psql -U postgres -d medusa <<'SQL'
SELECT id, title, handle, status, deleted_at IS NOT NULL AS deleted
FROM product WHERE handle ILIKE '%sweat%' OR title ILIKE '%sweat%' LIMIT 20;
SELECT id, name, handle, deleted_at IS NOT NULL AS deleted
FROM product_category WHERE handle ILIKE '%sweat%' OR name ILIKE '%sweat%' LIMIT 20;
SQL

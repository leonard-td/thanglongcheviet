#!/bin/bash
set -uo pipefail
cd /mnt/d/work_freelance/thanglongcheviet

echo "=== docker ps ==="
docker ps --format 'table {{.Names}}\t{{.Status}}' 2>&1

echo "=== health ==="
curl -sS -w "code:%{http_code} t:%{time_total}\n" --max-time 5 http://127.0.0.1:9000/health || echo FAIL_HEALTH

KEY=$(docker exec tlcv_web printenv NUXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY 2>/dev/null || true)
REGION=$(docker exec tlcv_web printenv NUXT_PUBLIC_MEDUSA_REGION_ID 2>/dev/null || true)
echo "KEY_PREFIX=${KEY:0:12} KEY_LEN=${#KEY}"
echo "REGION=$REGION"

echo "=== postgres max_connections + activity ==="
docker exec -i tlcv-postgres psql -U postgres -d medusa -c "SHOW max_connections;" 2>&1
docker exec -i tlcv-postgres psql -U postgres -d medusa -c "SELECT count(*) AS conns, count(*) FILTER (WHERE state='active') AS active, count(*) FILTER (WHERE state='idle') AS idle FROM pg_stat_activity WHERE datname=current_database();" 2>&1

echo "=== store products limit1 (direct) ==="
curl -sS -w "\ncode:%{http_code} t:%{time_total}\n" --max-time 20 \
  -H "x-publishable-api-key: ${KEY}" \
  "http://127.0.0.1:9000/store/products?limit=1&fields=id,title,handle" | tail -c 800
echo

echo "=== store handle=sweatpants ==="
curl -sS -w "\ncode:%{http_code} t:%{time_total}\n" --max-time 20 \
  -H "x-publishable-api-key: ${KEY}" \
  "http://127.0.0.1:9000/store/products?handle=sweatpants&fields=id,title,handle,status" | tail -c 800
echo

echo "=== store category handle=sweatpants ==="
curl -sS -w "\ncode:%{http_code} t:%{time_total}\n" --max-time 20 \
  -H "x-publishable-api-key: ${KEY}" \
  "http://127.0.0.1:9000/store/product-categories?handle=sweatpants&fields=id,name,handle" | tail -c 800
echo

echo "=== DB sweat% ==="
docker exec -i tlcv-postgres psql -U postgres -d medusa <<'SQL'
SELECT 'product' AS kind, id, title AS name, handle, status::text FROM product WHERE handle ILIKE '%sweat%' OR title ILIKE '%sweat%' LIMIT 10;
SELECT 'category' AS kind, id, name, handle, NULL AS status FROM product_category WHERE handle ILIKE '%sweat%' OR name ILIKE '%sweat%' LIMIT 10;
SQL

echo "=== page statuses ==="
for p in /san-pham/sweatpants /san-pham/ao-ni-tlcv-vintage /san-pham/no-such-product-xyz /san-pham/danh-muc/sweatpants; do
  code=$(curl -sS -o /tmp/p.html -w "%{http_code}" --max-time 25 "http://127.0.0.1:8800$p" || echo ERR)
  echo "$p -> $code bytes=$(wc -c </tmp/p.html 2>/dev/null || echo 0)"
done

echo "=== backend log tail (errors) ==="
docker logs tlcv_backend --tail 40 2>&1 | grep -E 'error|Timeout|Knex|publishable|HTTP|GET /store' | tail -n 40

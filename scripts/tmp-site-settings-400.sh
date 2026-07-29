#!/bin/bash
set -uo pipefail
KEY=$(docker exec tlcv_web printenv NUXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY 2>/dev/null || echo "")
REG=$(docker exec tlcv_web printenv NUXT_PUBLIC_MEDUSA_REGION_ID 2>/dev/null || echo "")
echo "web_key_len=${#KEY} web_key_prefix=${KEY:0:10}..."
echo "web_region=$REG"
echo "env_dev_key_prefix=$(grep '^NUXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=' /mnt/d/work_freelance/thanglongcheviet/.env.dev 2>/dev/null | cut -c1-45)..."

echo
echo "=== site-settings NO key ==="
curl -sS -w "\nHTTP:%{http_code}\n" --max-time 10 http://127.0.0.1:8800/store/site-settings | tail -c 400

echo
echo "=== site-settings WITH web key ==="
curl -sS -w "\nHTTP:%{http_code}\n" --max-time 10 \
  -H "x-publishable-api-key: ${KEY}" \
  http://127.0.0.1:8800/store/site-settings | tail -c 400

echo
echo "=== products handle=t-shirt WITH web key ==="
curl -sS -w "\nHTTP:%{http_code}\n" --max-time 15 \
  -H "x-publishable-api-key: ${KEY}" \
  "http://127.0.0.1:8800/store/products?handle=t-shirt&region_id=${REG}&fields=id,title,handle" | tail -c 500

echo
echo "=== page /san-pham/t-shirt ==="
curl -sS -o /tmp/ts.html -w "HTTP:%{http_code} bytes:%{size_download}\n" --max-time 35 \
  http://127.0.0.1:8800/san-pham/t-shirt || echo FAIL
grep -Eoi 'statusCode|Internal Server|Medusa T-Shirt|loadError|notFound|400|500|502|404' /tmp/ts.html 2>/dev/null | head -n 15

echo
echo "=== backend recent publishable/knex errors ==="
docker logs tlcv_backend --tail 60 2>&1 | grep -E 'publishable|not_allowed|Knex|Timeout|site-settings|t-shirt' | tail -n 30

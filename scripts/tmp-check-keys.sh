#!/bin/bash
set -euo pipefail
PG=tlcv-postgres
DB=medusa
USER=postgres

echo "=== api_key rows (token prefix only) ==="
docker exec -i "$PG" psql -U "$USER" -d "$DB" -c \
  "SELECT id, title, type, revoked_at IS NOT NULL AS revoked, left(token,12) AS token_prefix, length(token) AS token_len, created_at FROM api_key ORDER BY created_at DESC LIMIT 15;"

echo "=== link tables ==="
docker exec -i "$PG" psql -U "$USER" -d "$DB" -c "\dt *api_key*"
docker exec -i "$PG" psql -U "$USER" -d "$DB" -c "\dt *publishable*"
docker exec -i "$PG" psql -U "$USER" -d "$DB" -c "\dt *sales_channel*"

echo "=== sales channels ==="
docker exec -i "$PG" psql -U "$USER" -d "$DB" -c \
  "SELECT id, name, is_disabled FROM sales_channel LIMIT 10;"

echo "=== regions ==="
docker exec -i "$PG" psql -U "$USER" -d "$DB" -c \
  "SELECT id, name, currency_code FROM region LIMIT 10;"

ENV=/mnt/d/work_freelance/thanglongcheviet/.env.dev
echo "=== .env.dev key/region (masked) ==="
if [ -f "$ENV" ]; then
  grep -E 'MEDUSA_PUBLISHABLE|MEDUSA_REGION|MEDUSA_BACKEND' "$ENV" | sed -E 's/(pk_[A-Za-z0-9]{8})[A-Za-z0-9]+/\1.../'
else
  echo "missing .env.dev"
fi

echo "=== web container vs .env.dev ==="
WEB_KEY=$(docker exec tlcv_web printenv NUXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY 2>/dev/null || true)
ENV_KEY=$(grep '^NUXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY=' "$ENV" 2>/dev/null | cut -d= -f2- || true)
WEB_REG=$(docker exec tlcv_web printenv NUXT_PUBLIC_MEDUSA_REGION_ID 2>/dev/null || true)
ENV_REG=$(grep '^NUXT_PUBLIC_MEDUSA_REGION_ID=' "$ENV" 2>/dev/null | cut -d= -f2- || true)
echo "web_key_prefix=${WEB_KEY:0:12} len=${#WEB_KEY}"
echo "env_key_prefix=${ENV_KEY:0:12} len=${#ENV_KEY}"
echo "web_region=$WEB_REG"
echo "env_region=$ENV_REG"
if [ "$WEB_KEY" = "$ENV_KEY" ]; then echo "KEY_MATCH"; else echo "KEY_MISMATCH"; fi
if [ "$WEB_REG" = "$ENV_REG" ]; then echo "REGION_MATCH"; else echo "REGION_MISMATCH"; fi

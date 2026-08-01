#!/bin/sh
set -e
BASE="${1:-http://localhost:9000}"
EMAIL="${ADMIN_EMAIL:-admin@medusa.local}"
PASS="${ADMIN_PASSWORD:-supersecret123}"

echo "=== Auth ==="
AUTH=$(curl -s -X POST "$BASE/auth/user/emailpass" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}")
TOKEN=$(printf '%s' "$AUTH" | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')
if [ -z "$TOKEN" ]; then
  echo "Login failed: $AUTH"
  exit 1
fi
echo "Logged in as $EMAIL"

echo ""
echo "=== Trigger export ==="
EXPORT=$(curl -s -X POST "$BASE/admin/orders/export" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json")
echo "$EXPORT"
TX=$(printf '%s' "$EXPORT" | sed -n 's/.*"transaction_id":"\([^"]*\)".*/\1/p')
echo "transaction_id=$TX"

echo ""
echo "=== Wait for notification (up to 60s) ==="
i=0
FILE_URL=""
while [ $i -lt 30 ]; do
  NOTIFS=$(curl -s "$BASE/admin/notifications?channel=feed&limit=3&order=-created_at" \
    -H "Authorization: Bearer $TOKEN")
  FILE_URL=$(printf '%s' "$NOTIFS" | sed -n 's/.*"url":"\([^"]*order-exports[^"]*\)".*/\1/p' | head -1)
  if [ -n "$FILE_URL" ]; then
    echo "Found export notification URL: $FILE_URL"
    break
  fi
  i=$((i + 1))
  sleep 2
done

if [ -z "$FILE_URL" ]; then
  echo "No export notification yet. Recent notifications:"
  printf '%s' "$NOTIFS" | head -c 2000
  echo ""
  echo ""
  echo "=== Existing files in .private-exports ==="
  ls -la .private-exports 2>/dev/null || ls -la /workspace/apps/backend/.private-exports
  exit 0
fi

echo ""
echo "=== Download test (authenticated) ==="
CODE=$(curl -s -o /tmp/export-test.csv -w '%{http_code}' \
  -H "Authorization: Bearer $TOKEN" \
  "$BASE$FILE_URL")
echo "HTTP $CODE, saved to /tmp/export-test.csv"
head -2 /tmp/export-test.csv 2>/dev/null || true

echo ""
echo "=== Public access test (no auth) ==="
PUBLIC_CODE=$(curl -s -o /dev/null -w '%{http_code}' "$BASE$FILE_URL")
echo "HTTP $PUBLIC_CODE (expect 401)"

#!/bin/bash
set -uo pipefail
echo "=== backend health direct ==="
curl -sS -w "\nHTTP:%{http_code} TIME:%{time_total}\n" --max-time 5 http://127.0.0.1:9000/health || echo FAIL

echo "=== backend auth/session quick ==="
curl -sS -w "\nHTTP:%{http_code} TIME:%{time_total}\n" --max-time 5 http://127.0.0.1:9000/auth/session || echo FAIL

echo "=== docker stats snapshot ==="
docker stats --no-stream --format 'table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}' 2>&1 | head -n 20

echo "=== backend top processes ==="
docker exec tlcv_backend sh -c 'ps aux | head -n 30' 2>&1 || true

echo "=== backend logs last 120 ==="
docker logs tlcv_backend --tail 120 2>&1

echo "=== web logs last 60 ==="
docker logs tlcv_web --tail 60 2>&1

echo "=== nginx error log last 40 ==="
docker exec tlcv_nginx sh -c 'tail -n 40 /var/log/nginx/error.log 2>/dev/null || ls /var/log/nginx' 2>&1

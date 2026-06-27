#!/usr/bin/env bash

# Script để cài đặt Composer dependencies trong Docker container
# Usage: ./install-dependencies.sh

set -e

CONTAINER_NAME="tl_che_viet_app"

echo "🔍 Kiểm tra container '$CONTAINER_NAME'..."

# Kiểm tra xem container có đang chạy không
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
  echo "❌ Container '$CONTAINER_NAME' không chạy."
  echo "📍 Vui lòng start container trước:"
  echo "   docker-compose up -d app"
  exit 1
fi

echo "✅ Container đang chạy."
echo ""
echo "📦 Đang cài đặt Composer dependencies..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Chạy composer install trong container
docker exec -it "$CONTAINER_NAME" composer install --no-interaction --prefer-dist --optimize-autoloader

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Hoàn tất! Vendor dependencies đã được cài đặt."
echo ""
echo "📍 Bạn có thể cần chạy thêm:"
echo "   docker exec -it $CONTAINER_NAME php artisan key:generate"
echo "   docker exec -it $CONTAINER_NAME php artisan migrate"
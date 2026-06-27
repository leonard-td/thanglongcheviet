#!/usr/bin/env bash

# Script fix Laravel environment issues
# Usage: ./fix-env.sh

set -e

echo "🔧 Fixing Laravel environment..."
echo ""

# 1. Copy .env.example nếu .env chưa tồn tại
if [ ! -f .env ]; then
  echo "📝 Creating .env from .env.example..."
  cp .env.example .env
  echo "✅ .env created"
else
  echo "ℹ️  .env already exists"
fi

echo ""

# 2. Generate APP_KEY
echo "🔑 Generating APP_KEY..."
if command -v docker &> /dev/null; then
  docker exec -it tl_che_viet_app php artisan key:generate
else
  php artisan key:generate
fi
echo "✅ APP_KEY generated"

echo ""

# 3. Fix cache driver (set to redis hoặc array cho development)
echo "🗄️  Updating cache configuration..."
if grep -q "CACHE_STORE=file" .env; then
  sed -i 's/CACHE_STORE=file/CACHE_STORE=redis/g' .env
  echo "✅ Changed CACHE_STORE from 'file' to 'redis'"
elif grep -q "CACHE_STORE=database" .env; then
  sed -i 's/CACHE_STORE=database/CACHE_STORE=redis/g' .env
  echo "✅ Changed CACHE_STORE from 'database' to 'redis'"
else
  echo "ℹ️  CACHE_STORE is already set to a tagging-compatible driver"
fi

echo ""

# 4. Clear cache
echo "🧹 Clearing cache..."
if command -v docker &> /dev/null; then
  docker exec -it tl_che_viet_app php artisan config:clear
  docker exec -it tl_che_viet_app php artisan cache:clear
else
  php artisan config:clear
  php artisan cache:clear
fi
echo "✅ Cache cleared"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ All done! Try accessing the app again."
echo ""
echo "📍 If still having issues, check:"
echo "   - Redis container is running (docker ps)"
echo "   - Database connection in .env"
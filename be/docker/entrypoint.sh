#!/usr/bin/env bash

set -e

echo "🚀 Starting Laravel application setup..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ==========================================
# 1. Install Composer Dependencies
# ==========================================
if [ ! -d "vendor" ] || [ ! -f "vendor/autoload.php" ]; then
  echo ""
  echo "📦 Installing Composer dependencies..."
  composer install --no-interaction --prefer-dist --optimize-autoloader
  echo "✅ Composer dependencies installed"
else
  echo "✅ Composer dependencies already installed"
fi

# ==========================================
# 2. Setup Environment File
# ==========================================
if [ ! -f ".env" ]; then
  echo ""
  echo "📝 Creating .env file from .env.example..."
  cp .env.example .env
  echo "✅ .env file created"
else
  echo "✅ .env file already exists"
fi

# ==========================================
# 3. Generate APP_KEY if missing
# ==========================================
if ! grep -q "APP_KEY=base64:" .env; then
  echo ""
  echo "🔑 Generating application key..."
  php artisan key:generate --force
  echo "✅ Application key generated"
else
  echo "✅ Application key already set"
fi

# ==========================================
# 4. Fix Cache Driver for Tagging Support
# ==========================================
if grep -qE "CACHE_STORE=(file|database)" .env; then
  echo ""
  echo "🗄️  Updating cache driver to redis..."
  sed -i.bak 's/CACHE_STORE=.*/CACHE_STORE=redis/' .env
  echo "✅ Cache driver updated to redis"
else
  echo "✅ Cache driver already configured"
fi

# ==========================================
# 5. Wait for Database
# ==========================================
echo ""
echo "⏳ Waiting for database connection..."

DB_HOST=$(grep DB_HOST .env | cut -d '=' -f2)
DB_PORT=$(grep DB_PORT .env | cut -d '=' -f2)
DB_HOST=${DB_HOST:-db}
DB_PORT=${DB_PORT:-3306}

max_tries=30
count=0

until nc -z "$DB_HOST" "$DB_PORT" 2>/dev/null || [ $count -eq $max_tries ]; do
  count=$((count + 1))
  echo "  Attempt $count/$max_tries: Waiting for $DB_HOST:$DB_PORT..."
  sleep 2
done

if [ $count -eq $max_tries ]; then
  echo "⚠️  Warning: Could not connect to database after $max_tries attempts"
  echo "   App will start but database features may not work"
else
  echo "✅ Database connection established"
fi

# ==========================================
# 6. Run Migrations
# ==========================================
echo ""
echo "🗃️  Running database migrations..."

if php artisan migrate --force 2>/dev/null; then
  echo "✅ Database migrations completed"
else
  echo "⚠️  Warning: Migration failed or database not ready"
  echo "   You may need to run: docker exec -it tl_che_viet_app php artisan migrate"
fi

# ==========================================
# 7. Create Storage Symlink
# ==========================================
if [ ! -L "public/storage" ]; then
  echo ""
  echo "🔗 Creating storage symlink..."
  php artisan storage:link
  echo "✅ Storage symlink created"
else
  echo "✅ Storage symlink already exists"
fi

# ==========================================
# 8. Set Permissions
# ==========================================
echo ""
echo "🔐 Setting permissions..."
chown -R www-data:www-data /var/www/storage /var/www/bootstrap/cache
chmod -R 775 /var/www/storage /var/www/bootstrap/cache
echo "✅ Permissions set"

# ==========================================
# 9. Clear Cache
# ==========================================
echo ""
echo "🧹 Clearing application cache..."
php artisan config:clear
php artisan cache:clear
php artisan view:clear
php artisan route:clear
echo "✅ Cache cleared"

# ==========================================
# 10. Optimize for Production (if APP_ENV=production)
# ==========================================
if grep -q "APP_ENV=production" .env; then
  echo ""
  echo "⚡ Optimizing for production..."
  php artisan config:cache
  php artisan route:cache
  php artisan view:cache
  echo "✅ Production optimizations applied"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Laravel application setup completed!"
echo ""
echo "📍 Starting PHP-FPM..."
echo ""

# Start PHP-FPM
exec php-fpm
#!/bin/sh
set -e

echo "=========================================="
echo "🚀 Initializing Backend inside Docker container..."
echo "=========================================="

# 1. Setup env file if not exists
if [ ! -f "/var/www/.env" ]; then
    echo "-> Creating .env from .env.example..."
    cp /var/www/.env.example /var/www/.env
    # Ensure DB_HOST is set to db
    sed -i -e 's/DB_HOST=tl_che_viet_db/DB_HOST=db/' /var/www/.env
    echo "✅ .env created and configured"
fi

# 2. Install Composer dependencies
echo "-> Installing Composer dependencies..."
composer install --no-interaction

# 3. Generate application key
echo "-> Generating application key..."
php artisan key:generate

# 3.5 Clear any cached configuration or routes to prevent bootstrap errors
echo "-> Clearing application cache..."
php artisan optimize:clear

# 4. Running migrations and seeders
echo "-> Running database migrations and seeders..."
php artisan migrate:fresh --seed --force

# 5. Creating storage link
# If the storage link exists, remove it and create a new one
if [ ! -L "/var/www/public/storage" ]; then
    echo "-> Creating storage link..."
    php artisan storage:link || true
else
    echo "-> Storage link already exists. Recreating..."
    rm -rf /var/www/public/storage
    php artisan storage:link || true
fi

# 6. Generating Swagger API documentation
echo "-> Generating Swagger API documentation..."
php artisan l5-swagger:generate || true

echo "=========================================="
echo "✅ Backend Initialization Completed!"
echo "=========================================="

#!/bin/bash
set -e

echo "=== GwydeCrypt Backend Starting ==="

# Create .env file if it doesn't exist (Laravel requires it)
if [ ! -f /var/www/html/.env ]; then
    echo "Creating .env file from .env.example..."
    cp /var/www/html/.env.example /var/www/html/.env
fi

# Debug: show DB connection info
echo "DB_HOST=${DB_HOST:-db}, DB_PORT=${DB_PORT:-5432}, DB_DATABASE=${DB_DATABASE:-gwydecrypt}, DB_USERNAME=${DB_USERNAME:-gwydecrypt}"

# Wait for database using pg_isready (more reliable than php artisan)
echo "Waiting for database..."
until pg_isready -h "${DB_HOST:-db}" -p "${DB_PORT:-5432}" -U "${DB_USERNAME:-gwydecrypt}" -q; do
    echo "Database not ready, waiting..."
    sleep 2
done
echo "Database ready!"

# Run migrations
echo "Running migrations..."
php artisan migrate --force

# Create storage link
php artisan storage:link 2>/dev/null || true

# Clear caches
php artisan config:clear
php artisan route:clear
php artisan view:clear

# Cache config for production
if [ "$APP_ENV" = "production" ]; then
    echo "Caching config for production..."
    php artisan config:cache
    php artisan route:cache
    php artisan view:cache
fi

echo "=== Starting services ==="

# Start supervisord which manages nginx, php-fpm, scheduler, and queue worker
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf

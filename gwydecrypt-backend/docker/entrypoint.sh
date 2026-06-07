#!/bin/bash
set -e

echo "=== GwydeCrypt Backend Starting ==="

# Wait for database
echo "Waiting for database..."
until php artisan db:show --database=pgsql > /dev/null 2>&1; do
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

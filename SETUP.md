# 🚀 Thăng Long Chè Việt - Setup Guide

## Tính năng tự động setup

Service `app` trong Docker Compose đã được cấu hình với **entrypoint script tự động** thực hiện các bước sau khi container khởi động:

### ✅ Checklist tự động (be/docker/entrypoint.sh)

1. **📦 Cài đặt Composer dependencies** - Kiểm tra và cài `vendor/` nếu chưa có
2. **📝 Tạo file .env** - Copy từ `.env.example` nếu chưa tồn tại
3. **🔑 Generate APP_KEY** - Tạo application key nếu chưa có
4. **🗄️ Fix Cache Driver** - Tự động đổi sang `redis` nếu đang dùng `file/database`
5. **⏳ Đợi Database** - Chờ MySQL sẵn sàng (tối đa 30 lần thử)
6. **🗃️ Chạy Migrations** - Tự động migrate database
7. **🔗 Tạo Storage Symlink** - Link `public/storage` → `storage/app/public`
8. **🔐 Set Permissions** - Chmod storage và bootstrap/cache
9. **🧹 Clear Cache** - Xóa config/cache/view/route cache
10. **⚡ Production Optimization** - Cache routes/views nếu `APP_ENV=production`

---

## 📋 Hướng dẫn sử dụng

### Lần đầu setup

```bash
# 1. Clone project
git clone <repo-url>
cd Thang_long_che_viet_project

# 2. Build và start tất cả services
docker-compose up -d --build

# 3. Đợi ~30-60 giây để entrypoint script chạy xong
docker-compose logs -f app

# 4. Kiểm tra health status
docker-compose ps
```

Tất cả services phải có status `healthy`:
```
NAME                 STATUS
tl_che_viet_app      Up (healthy)
tl_che_viet_db       Up (healthy)
tl_che_viet_redis    Up (healthy)
tl_che_viet_nginx    Up
tl_che_viet_web      Up
```

### Truy cập ứng dụng

- **Backend API**: http://localhost:8000
- **Frontend**: http://localhost:3000
- **API Health Check**: http://localhost:8000/api/health

---

## 🔧 Các lệnh hữu ích

### Xem logs

```bash
# Tất cả services
docker-compose logs -f

# Chỉ Laravel app
docker-compose logs -f app

# Chỉ Nginx
docker-compose logs -f nginx
```

### Chạy Artisan commands

```bash
# Migrate database
docker exec -it tl_che_viet_app php artisan migrate

# Tạo seeder data
docker exec -it tl_che_viet_app php artisan db:seed

# Clear cache
docker exec -it tl_che_viet_app php artisan cache:clear

# Tạo controller
docker exec -it tl_che_viet_app php artisan make:controller UserController
```

### Composer commands

```bash
# Install package
docker exec -it tl_che_viet_app composer require package/name

# Update dependencies
docker exec -it tl_che_viet_app composer update
```

### Database commands

```bash
# Access MySQL CLI
docker exec -it tl_che_viet_db mysql -u laravel -psecret laravel

# Backup database
docker exec tl_che_viet_db mysqldump -u laravel -psecret laravel > backup.sql

# Restore database
docker exec -i tl_che_viet_db mysql -u laravel -psecret laravel < backup.sql
```

### Redis commands

```bash
# Access Redis CLI
docker exec -it tl_che_viet_redis redis-cli

# Flush all cache
docker exec -it tl_che_viet_redis redis-cli FLUSHALL
```

---

## 🔄 Restart / Rebuild

### Restart một service

```bash
docker-compose restart app
docker-compose restart nginx
```

### Rebuild sau khi sửa Dockerfile

```bash
docker-compose up -d --build app
```

### Stop tất cả

```bash
docker-compose down
```

### Stop và xóa volumes (CẢNH BÁO: Mất data!)

```bash
docker-compose down -v
```

---

## 🐛 Troubleshooting

### Lỗi: Container không healthy

```bash
# Kiểm tra logs
docker-compose logs app

# Kiểm tra healthcheck
docker inspect tl_che_viet_app | grep -A 20 Health
```

### Lỗi: Database connection refused

```bash
# Kiểm tra DB có chạy không
docker-compose ps db

# Kiểm tra DB logs
docker-compose logs db

# Restart DB
docker-compose restart db
```

### Lỗi: Permission denied (storage/logs)

```bash
# Fix permissions
docker exec -it tl_che_viet_app chown -R www-data:www-data storage bootstrap/cache
docker exec -it tl_che_viet_app chmod -R 775 storage bootstrap/cache
```

### Lỗi: Composer install fail

Entrypoint script sẽ tự động cài, nhưng nếu fail:

```bash
docker exec -it tl_che_viet_app composer install --no-interaction
```

### Reset toàn bộ

```bash
# Stop và xóa containers + volumes
docker-compose down -v

# Xóa vendor và .env cũ (optional)
rm -rf be/vendor be/.env

# Build lại từ đầu
docker-compose up -d --build

# Theo dõi logs
docker-compose logs -f app
```

---

## 📊 Health Checks

Tất cả services đều có healthcheck tự động:

| Service | Check | Interval | Timeout | Retries | Start Period |
|---------|-------|----------|---------|---------|--------------|
| app | `nc -z localhost 9000` | 10s | 5s | 5 | 30s |
| db | `mysqladmin ping` | 10s | 5s | 5 | 30s |
| redis | `redis-cli ping` | 10s | 3s | 5 | 10s |

Status: `healthy` = sẵn sàng nhận request

---

## 🔒 Environment Variables

Được set tự động trong `docker-compose.yml`:

```yaml
DB_HOST=db
DB_PORT=3306
DB_DATABASE=laravel
DB_USERNAME=laravel
DB_PASSWORD=secret
REDIS_HOST=redis
REDIS_PORT=6379
CACHE_STORE=redis
SESSION_DRIVER=redis
QUEUE_CONNECTION=redis
```

**Lưu ý**: Entrypoint script sẽ tự động ghi đè `CACHE_STORE` trong file `.env` nếu phát hiện giá trị cũ không hỗ trợ tagging.

---

## 🎯 Production Deployment

### 1. Sửa environment variables

```bash
# Trong docker-compose.yml hoặc .env
APP_ENV=production
APP_DEBUG=false
```

### 2. Build production image

```bash
docker-compose -f docker-compose.prod.yml up -d --build
```

### 3. Entrypoint sẽ tự động:

- Cache config: `php artisan config:cache`
- Cache routes: `php artisan route:cache`
- Cache views: `php artisan view:cache`
- Optimize autoloader

---

## 📚 Cấu trúc Project

```
.
├── apps/
│   └── web/              # Nuxt 3 frontend
├── be/                   # Laravel backend
│   ├── docker/
│   │   ├── php/
│   │   │   ├── Dockerfile       # PHP-FPM image
│   │   │   └── local.ini        # PHP config
│   │   ├── nginx/
│   │   │   └── conf.d/          # Nginx config
│   │   └── entrypoint.sh        # 🚀 Auto-setup script
│   ├── app/
│   ├── public/
│   └── ...
├── docker-compose.yml    # 🐳 Main orchestration
└── SETUP.md             # 📖 This file
```

---

## ✨ Tóm tắt

- **Zero manual setup**: Chỉ cần `docker-compose up -d --build`
- **Auto-healing**: Healthchecks tự động restart container nếu fail
- **Production-ready**: Tự động optimize khi `APP_ENV=production`
- **Developer-friendly**: Hot reload, logs dễ đọc, commands đơn giản

Mọi thứ đã được tự động hóa trong `be/docker/entrypoint.sh` 🎉
# GwydeCrypt Backend - Guía de Configuración

## 📋 Pasos Realizados

### 1. ✅ Proyecto Laravel Creado
- Laravel 12 instalado
- PHP 8.3.13
- Ubicación: `/c/laragon/www/gwydecrypt-backend`

### 2. ✅ Sanctum Instalado
- Laravel Sanctum v4.3.1 instalado
- Listo para configurar

---

## 🔧 Próximos Pasos

### 3. Configurar Sanctum
```bash
cd /c/laragon/www/gwydecrypt-backend
php artisan vendor:publish --provider="Laravel\Sanctum\SanctumServiceProvider"
```

### 4. Configurar PostgreSQL en .env
```env
DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=gwydecrypt
DB_USERNAME=postgres
DB_PASSWORD=your_password
```

### 5. Instalar Laravel Reverb (WebSockets)
```bash
composer require laravel/reverb
php artisan reverb:install
```

### 6. Crear Base de Datos PostgreSQL
```sql
CREATE DATABASE gwydecrypt;
```

### 7. Ejecutar Migraciones
```bash
php artisan migrate
```

### 8. Crear Estructura de Carpetas y Archivos

#### 8.1 Crear Servicios
```bash
mkdir -p app/Services
```

Servicios a crear:
- AuthService.php
- WalletService.php
- PriceAggregatorService.php
- BlockchainService.php
- PortfolioService.php
- AnalyticsService.php
- AdminPanelService.php
- TokenConfigService.php

#### 8.2 Crear Jobs
```bash
php artisan make:job FetchPricesJob
php artisan make:job SyncWalletJob
php artisan make:job CreatePortfolioSnapshotJob
php artisan make:job SyncActiveWalletsJob
```

#### 8.3 Crear Migraciones
```bash
php artisan make:migration create_api_providers_table
php artisan make:migration create_price_fetch_log_table
php artisan make:migration modify_tokens_table_for_multi_provider
```

#### 8.4 Crear Modelos
```bash
php artisan make:model ApiProvider
php artisan make:model Wallet
php artisan make:model Token
php artisan make:model WalletToken
php artisan make:model PriceHistory
php artisan make:model PortfolioSnapshot
php artisan make:model PriceFetchLog
```

#### 8.5 Crear Controladores
```bash
php artisan make:controller Api/AuthController
php artisan make:controller Api/WalletController
php artisan make:controller Api/PortfolioController
php artisan make:controller Api/Admin/ProviderController
php artisan make:controller Api/Admin/TokenController
```

---

## 📁 Estructura Final del Proyecto

```
app/
├── Http/
│   ├── Controllers/
│   │   ├── Api/
│   │   │   ├── AuthController.php
│   │   │   ├── WalletController.php
│   │   │   ├── PortfolioController.php
│   │   │   └── Admin/
│   │   │       ├── ProviderController.php
│   │   │       └── TokenController.php
│   │   └── Controller.php
│   ├── Middleware/
│   │   └── EnsureAdminRole.php
│   └── Requests/
│       ├── Auth/
│       ├── Wallet/
│       └── Portfolio/
├── Models/
│   ├── User.php
│   ├── ApiProvider.php
│   ├── Wallet.php
│   ├── Token.php
│   ├── WalletToken.php
│   ├── PriceHistory.php
│   ├── PortfolioSnapshot.php
│   └── PriceFetchLog.php
├── Services/
│   ├── AuthService.php
│   ├── WalletService.php
│   ├── PriceAggregatorService.php
│   ├── BlockchainService.php
│   ├── PortfolioService.php
│   ├── AnalyticsService.php
│   ├── AdminPanelService.php
│   └── TokenConfigService.php
└── Jobs/
    ├── FetchPricesJob.php
    ├── SyncWalletJob.php
    ├── CreatePortfolioSnapshotJob.php
    └── SyncActiveWalletsJob.php

database/
├── migrations/
│   ├── 2024_01_01_000001_create_users_table.php
│   ├── 2024_01_01_000002_create_api_providers_table.php
│   ├── 2024_01_01_000003_create_wallets_table.php
│   ├── 2024_01_01_000004_create_tokens_table.php
│   ├── 2024_01_01_000005_create_wallet_tokens_table.php
│   ├── 2024_01_01_000006_create_price_history_table.php
│   ├── 2024_01_01_000007_create_portfolio_snapshots_table.php
│   └── 2024_01_01_000008_create_price_fetch_log_table.php
└── seeders/
    ├── DatabaseSeeder.php
    └── ApiProviderSeeder.php

routes/
├── api.php
└── web.php
```

---

## 🚀 Comandos Útiles

### Desarrollo
```bash
# Iniciar servidor
php artisan serve

# Iniciar queue worker
php artisan queue:work

# Iniciar scheduler
php artisan schedule:work

# Monitorear logs
php artisan pail
```

### Testing
```bash
# Ejecutar tests
php artisan test

# Ejecutar Pint (linting)
./vendor/bin/pint

# Ejecutar migraciones frescas
php artisan migrate:fresh --seed
```

### Cache
```bash
# Limpiar cache
php artisan cache:clear
php artisan config:clear
php artisan route:clear
php artisan view:clear
```

---

## 📝 Variables de Entorno Necesarias

```env
# APP
APP_NAME=GwydeCrypt
APP_ENV=local
APP_KEY=
APP_DEBUG=true
APP_URL=http://gwydecrypt-backend.test

# DATABASE
DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=gwydecrypt
DB_USERNAME=postgres
DB_PASSWORD=

# REDIS
REDIS_HOST=127.0.0.1
REDIS_PASSWORD=null
REDIS_PORT=6379

# COINGECKO API
COINGECKO_API_KEY=
COINGECKO_API_URL=https://api.coingecko.com/api/v3

# ZERION API
ZERION_API_KEY=
ZERION_API_URL=https://api.zerion.io/v1

# JUPITER API
JUPITER_API_URL=https://price.jup.ag/v4

# BLOCKCHAIN RPCs
INFURA_PROJECT_ID=
INFURA_PROJECT_SECRET=
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
POLYGON_RPC_URL=https://polygon-rpc.com
SUI_RPC_URL=https://fullnode.mainnet.sui.io

# QUEUE
QUEUE_CONNECTION=redis

# CACHE
CACHE_DRIVER=redis
SESSION_DRIVER=redis
```

---

## 📚 Referencias

- Documentación de arquitectura: `/ARQUITECTURA.md`
- Documentación Laravel: https://laravel.com/docs/12.x
- Documentación Sanctum: https://laravel.com/docs/12.x/sanctum
- Documentación Reverb: https://laravel.com/docs/12.x/reverb

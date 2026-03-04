# GwydeCrypt Backend

Sistema backend completo para tracking y análisis de portfolios de criptomonedas multi-chain.

## 🚀 Tecnologías

- **PHP 8.3+**
- **Laravel 12**
- **PostgreSQL 15+**
- **Redis** (cache y colas)
- **Laravel Sanctum** (autenticación)

## ✅ Características

- ✅ **Multi-chain**: Ethereum, Solana, Polygon, SUI
- ✅ **Multi-provider**: CoinGecko, Zerion, Jupiter con fallback automático
- ✅ **Sistema de colas** para procesos asíncronos
- ✅ **Panel de administración** para gestión de APIs y tokens
- ✅ **API REST** completa
- ✅ **Autenticación** con tokens Sanctum
- ✅ **Sistema de snapshots** para histórico de portfolios

## 📋 Estructura del Proyecto

```
app/
├── Http/
│   ├── Controllers/
│   │   └── Api/
│   │       ├── AuthController.php
│   │       ├── WalletController.php
│   │       ├── PortfolioController.php
│   │       └── Admin/
│   │           ├── ProviderController.php
│   │           └── TokenController.php
│   └── Middleware/
│       └── AdminMiddleware.php
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
```

## 🛠️ Instalación

### 1. Requisitos Previos

- PHP 8.3+
- Composer
- PostgreSQL 15+
- Redis
- Node.js & NPM

### 2. Instalar Dependencias

```bash
composer install
```

### 3. Configurar Entorno

```bash
cp .env.example .env
php artisan key:generate
```

Editar `.env`:

```env
DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=gwydecrypt
DB_USERNAME=postgres
DB_PASSWORD=tu_password

# Configurar APIs
COINGECKO_API_KEY=tu_api_key_opcional
ZERION_API_KEY=tu_api_key_zerion
```

### 4. Crear Base de Datos

```sql
CREATE DATABASE gwydecrypt;
```

### 5. Ejecutar Migraciones y Seeders

```bash
php artisan migrate
php artisan db:seed
```

### 6. Iniciar Servicios

```bash
# Terminal 1: Servidor
php artisan serve

# Terminal 2: Queue Worker
php artisan queue:work

# Terminal 3: Scheduler (development)
php artisan schedule:work
```

## 📡 API Endpoints

### Autenticación
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`

### Wallets
- `GET /api/wallets`
- `POST /api/wallets`
- `GET /api/wallets/{id}`
- `PUT /api/wallets/{id}`
- `DELETE /api/wallets/{id}`
- `POST /api/wallets/{id}/sync`

### Portfolio
- `GET /api/portfolio`
- `GET /api/portfolio/distribution`
- `GET /api/portfolio/history?period=1w`
- `GET /api/portfolio/token/{id}/performance`

### Admin (requiere rol admin)
- `GET /api/admin/providers`
- `POST /api/admin/providers`
- `GET /api/admin/tokens`
- `POST /api/admin/tokens`

## 🔐 Usuario por Defecto

- **Email**: admin@gwydecrypt.com
- **Password**: password (¡CAMBIAR EN PRODUCCIÓN!)

## 📚 Documentación

- [ARQUITECTURA.md](../ARQUITECTURA.md) - Arquitectura completa del sistema
- [SETUP_GUIDE.md](SETUP_GUIDE.md) - Guía detallada de configuración
- [PROGRESO.md](PROGRESO.md) - Estado del desarrollo

## 📄 Licencia

MIT

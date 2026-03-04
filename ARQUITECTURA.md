# GwydeCrypt - Documento de Arquitectura

## 📋 Tabla de Contenidos

1. [Visión General](#visión-general)
2. [Stack Tecnológico](#stack-tecnológico)
3. [Arquitectura del Sistema](#arquitectura-del-sistema)
4. [Modelo de Datos](#modelo-de-datos)
5. [Servicios y Componentes](#servicios-y-componentes)
6. [APIs Externas](#apis-externas)
7. [Flujo de Datos](#flujo-de-datos)
8. [Seguridad](#seguridad)
9. [Escalabilidad y Rendimiento](#escalabilidad-y-rendimiento)
10. [Despliegue](#despliegue)

---

## 🎯 Visión General

GwydeCrypt es una plataforma web para tracking y análisis de portfolios de criptomonedas multi-chain. El sistema permite a los usuarios conectar múltiples wallets de diferentes blockchains, analizar el valor total de su portfolio, ver rendimientos individuales por token, y comparar con el mercado general.

### Características Principales

- **Multi-wallet**: Soporte para múltiples wallets en diferentes redes
- **Multi-chain**: Ethereum, Solana, Polygon, SUI
- **Tracking en tiempo real**: Actualización cada 1-5 minutos
- **Análisis avanzado**: Histórico de precios, distribución del portfolio, P&L, comparación con mercado
- **Datos de mercado**: Ver tokens importantes (BTC, ETH, SOL) aunque no se tengan en wallet
- **Scan automático**: Detección automática de tokens en las wallets

---

## 🛠 Stack Tecnológico

### Backend
- **Framework**: Laravel 12 (PHP 8.3+)
- **Base de Datos**: MySQL 8.0+ / PostgreSQL 15+
- **Cache**: Redis 7+
- **Queue**: Laravel Queue (Redis/Database)
- **Websockets**: Laravel Reverb / Pusher
- **ORM**: Eloquent ORM
- **API REST**: Laravel API Resources

### Frontend
- **Framework**: React 18+
- **UI Library**: Mantine UI 7+
- **State Management**: Zustand / Redux Toolkit
- **Data Fetching**: React Query / TanStack Query
- **Charts**: Recharts / Chart.js
- **Forms**: React Hook Form + Zod
- **HTTP Client**: Axios
- **Real-time**: Socket.IO / Laravel Echo

### DevOps & Infraestructura
- **Docker**: Docker Compose para desarrollo
- **Container Registry**: Docker Hub / GitHub Container Registry
- **Web Server**: Nginx
- **Process Manager**: Supervisor
- **Monitoring**: Laravel Telescope / Laravel Pulse
- **Logging**: Laravel Log + Monolog

### APIs Externas
- **Precios**: Sistema multi-provider con fallback
  - **Primary**: CoinGecko API (Free tier: 100 calls/min)
  - **Secondary**: Zerion API (DeFi tokens, multi-chain)
  - **Solana**: Jupiter API (Solana tokens y precios)
- **Blockchain RPCs**:
  - Ethereum: Infura / Alchemy / Cloudflare
  - Solana: Solana RPC (Quicknode/GenesysGo)
  - Polygon: Polygon RPC
  - SUI: SUI Network RPC

---

## 🏗 Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND LAYER                            │
│                    (React + Mantine UI)                          │
│                                                                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐         │
│  │ Dashboard│  │ Wallets  │  │ Portfolio│  │  Market  │         │
│  │   View   │  │  Manager │  │ Analysis │  │  Watch   │         │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        API GATEWAY                               │
│                      (Laravel API Routes)                        │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │ Auth API     │  │ Wallet API   │  │ Portfolio API│           │
│  │ /api/auth/*  │  │ /api/wallets │  │ /api/portfolio│          │
│  └──────────────┘  └──────────────┘  └──────────────┘           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     SERVICE LAYER                                │
│                                                                   │
│  ┌──────────────────┐  ┌──────────────────┐                     │
│  │  AuthService     │  │ WalletService    │                     │
│  │  - Register      │  │  - Add Wallet    │                     │
│  │  - Login         │  │  - Sync Wallet   │                     │
│  │  - JWT Tokens    │  │  - Validate Addr │                     │
│  └──────────────────┘  └──────────────────┘                     │
│                                                                   │
│  ┌──────────────────┐  ┌──────────────────┐                     │
│  │ PortfolioService │  │ AnalyticsService │                     │
│  │  - Calculate     │  │  - P&L Calc      │                     │
│  │  - Aggregate     │  │  - Charts Data   │                     │
│  │  - Historical    │  │  - Comparisons   │                     │
│  └──────────────────┘  └──────────────────┘                     │
│                                                                   │
│  ┌──────────────────┐  ┌──────────────────┐                     │
│  │ PriceAggregator  │  │ BlockchainService│                     │
│  │ Service          │  │  - Scan Chain    │                     │
│  │  - Multi-provider│  │  - Get Balance   │                     │
│  │  - Fallback      │  │  - Get Tokens    │                     │
│  │  - Cache Manage  │  │                  │                     │
│  └──────────────────┘  └──────────────────┘                     │
│                                                                   │
│  ┌──────────────────┐  ┌──────────────────┐                     │
│  │ AdminPanelService│  │ TokenConfigService│                     │
│  │  - Manage APIs   │  │  - Add Tokens    │                     │
│  │  - Providers     │  │  - Map IDs       │                     │
│  └──────────────────┘  └──────────────────┘                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     DATA LAYER                                   │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ MySQL/PG     │  │ Redis        │  │ Laravel Queue│          │
│  │ Database     │  │ Cache        │  │ Jobs         │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   EXTERNAL APIS                                  │
│                                                                   │
│  ┌─────────────────────────────────────────────────┐             │
│  │        PRICE PROVIDERS (with Fallback)          │             │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐      │             │
│  │  │CoinGecko │  │ Zerion   │  │ Jupiter  │      │             │
│  │  │(Primary) │  │(Backup)  │  │(Solana)  │      │             │
│  │  └──────────┘  └──────────┘  └──────────┘      │             │
│  └─────────────────────────────────────────────────┘             │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Ethereum RPC │  │ Solana RPC   │  │ Polygon RPC  │          │
│  │ (Infura)     │  │ (Quicknode)  │  │ (Polygon)    │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                   │
│  ┌──────────────┐                                                │
│  │ SUI RPC      │                                                │
│  └──────────────┘                                                │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📊 Modelo de Datos

### Diagrama ER (Entity Relationship)

```
┌─────────────────────────────────────────────────────────────────┐
│ USER                                                             │
│ - id: UUID (PK)                                                  │
│ - name: string                                                   │
│ - email: string (unique)                                         │
│ - password: hashed                                               │
│ - created_at: timestamp                                          │
│ - updated_at: timestamp                                          │
└─────────────────────────────────────────────────────────────────┘
                              │ 1:N
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ WALLET                                                           │
│ - id: UUID (PK)                                                  │
│ - user_id: UUID (FK)                                             │
│ - address: string (indexed)                                      │
│ - chain: enum (eth, sol, polygon, sui)                          │
│ - label: string (ej: "Main Wallet")                              │
│ - is_active: boolean                                             │
│ - last_synced_at: timestamp                                      │
│ - created_at: timestamp                                          │
│ - updated_at: timestamp                                          │
└─────────────────────────────────────────────────────────────────┘
                              │ 1:N
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ WALLET_TOKEN                                                     │
│ - id: UUID (PK)                                                  │
│ - wallet_id: UUID (FK)                                           │
│ - token_id: UUID (FK)                                            │
│ - balance: decimal                                               │
│ - balance_usd: decimal (calculado)                               │
│ - first_seen_at: timestamp                                       │
│ - last_updated_at: timestamp                                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ N:1
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ TOKEN                                                            │
│ - id: UUID (PK)                                                  │
│ - coingecko_id: string (nullable, indexed)                       │
│ - zerion_id: string (nullable, indexed)                          │
│ - jupiter_id: string (nullable, indexed)                         │
│ - symbol: string (ej: "ETH", "SOL")                              │
│ - name: string                                                   │
│ - chain: enum (eth, sol, polygon, sui)                          │
│ - contract_address: string (nullable, indexed)                   │
│ - decimals: int                                                  │
│ - logo_url: string                                               │
│ - is_popular: boolean (para BTC, ETH, SOL aunque no se tengan)   │
│ - primary_provider: enum (coingecko, zerion, jupiter)           │
│ - created_at: timestamp                                          │
│ - updated_at: timestamp                                          │
└─────────────────────────────────────────────────────────────────┘
                              │ 1:N
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ PRICE_HISTORY                                                   │
│ - id: UUID (PK)                                                  │
│ - token_id: UUID (FK)                                            │
│ - price_usd: decimal                                             │
│ - market_cap: decimal                                            │
│ - volume_24h: decimal                                            │
│ - price_change_24h: decimal                                      │
│ - timestamp: timestamp (indexed)                                 │
│ - created_at: timestamp                                          │
│                                                                   │
│ INDEX: (token_id, timestamp) - Para queries rápidas             │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ API_PROVIDER                                                    │
│ - id: UUID (PK)                                                  │
│ - name: string (coingecko, zerion, jupiter)                     │
│ - base_url: string                                               │
│ - api_key: string (encrypted)                                    │
│ - is_active: boolean                                             │
│ - priority: int (1=primary, 2=secondary, 3=tertiary)            │
│ - rate_limit_per_minute: int                                    │
│ - rate_limit_per_day: int                                       │
│ - last_used_at: timestamp                                       │
│ - success_count: int                                            │
│ - failure_count: int                                            │
│ - created_at: timestamp                                          │
│ - updated_at: timestamp                                          │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ PRICE_FETCH_LOG                                                 │
│ - id: UUID (PK)                                                  │
│ - token_id: UUID (FK)                                            │
│ - provider_id: UUID (FK)                                         │
│ - attempt_number: int                                            │
│ - success: boolean                                               │
│ - price_usd: decimal (nullable)                                  │
│ - error_message: string (nullable)                               │
│ - response_time_ms: int                                          │
│ - timestamp: timestamp                                           │
│                                                                   │
│ INDEX: (token_id, timestamp)                                     │
│ INDEX: (provider_id, success, timestamp)                        │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ TRANSACTION (Opcional - Futuro)                                 │
│ - id: UUID (PK)                                                  │
│ - wallet_id: UUID (FK)                                           │
│ - token_id: UUID (FK)                                            │
│ - type: enum (buy, sell, transfer)                              │
│ - amount: decimal                                                │
│ - price_usd: decimal                                             │
│ - tx_hash: string                                                │
│ - timestamp: timestamp                                           │
│ - created_at: timestamp                                          │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ PORTFOLIO_SNAPSHOT                                              │
│ - id: UUID (PK)                                                  │
│ - user_id: UUID (FK)                                             │
│ - total_value_usd: decimal                                       │
│ - total_value_24h_ago: decimal                                   │
│ - change_24h_usd: decimal                                        │
│ - change_24h_percent: decimal                                    │
│ - tokens_count: int                                              │
│ - timestamp: timestamp (indexed)                                 │
│                                                                   │
│ INDEX: (user_id, timestamp) - Para gráficos históricos          │
└─────────────────────────────────────────────────────────────────┘
```

### Migraciones de Base de Datos (Ejemplo)

#### users
```sql
CREATE TABLE users (
    id CHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

#### wallets
```sql
CREATE TABLE wallets (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    address VARCHAR(255) NOT NULL,
    chain ENUM('eth', 'sol', 'polygon', 'sui') NOT NULL,
    label VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    last_synced_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_address (address),
    INDEX idx_chain (chain)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

#### tokens
```sql
CREATE TABLE tokens (
    id CHAR(36) PRIMARY KEY,
    coingecko_id VARCHAR(100) NULL,
    zerion_id VARCHAR(100) NULL,
    jupiter_id VARCHAR(100) NULL,
    symbol VARCHAR(20) NOT NULL,
    name VARCHAR(255) NOT NULL,
    chain ENUM('eth', 'sol', 'polygon', 'sui') NOT NULL,
    contract_address VARCHAR(255) NULL,
    decimals INT DEFAULT 18,
    logo_url VARCHAR(500),
    is_popular BOOLEAN DEFAULT FALSE,
    primary_provider ENUM('coingecko', 'zerion', 'jupiter') DEFAULT 'coingecko',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_coingecko_id (coingecko_id),
    INDEX idx_zerion_id (zerion_id),
    INDEX idx_jupiter_id (jupiter_id),
    INDEX idx_contract (chain, contract_address),
    INDEX idx_symbol (symbol)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

#### price_history
```sql
CREATE TABLE price_history (
    id CHAR(36) PRIMARY KEY,
    token_id CHAR(36) NOT NULL,
    price_usd DECIMAL(20, 8) NOT NULL,
    market_cap DECIMAL(30, 2),
    volume_24h DECIMAL(30, 2),
    price_change_24h DECIMAL(10, 4),
    timestamp TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (token_id) REFERENCES tokens(id) ON DELETE CASCADE,
    INDEX idx_token_timestamp (token_id, timestamp),
    INDEX idx_timestamp (timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

#### portfolio_snapshots
```sql
CREATE TABLE portfolio_snapshots (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    total_value_usd DECIMAL(20, 2) NOT NULL,
    total_value_24h_ago DECIMAL(20, 2),
    change_24h_usd DECIMAL(20, 2),
    change_24h_percent DECIMAL(10, 4),
    tokens_count INT DEFAULT 0,
    timestamp TIMESTAMP NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_timestamp (user_id, timestamp),
    INDEX idx_timestamp (timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

#### api_providers
```sql
CREATE TABLE api_providers (
    id CHAR(36) PRIMARY KEY,
    name VARCHAR(50) NOT NULL, -- coingecko, zerion, jupiter
    base_url VARCHAR(500) NOT NULL,
    api_key VARCHAR(255) NULL, -- encrypted
    is_active BOOLEAN DEFAULT TRUE,
    priority INT NOT NULL DEFAULT 999, -- 1=primary, 2=secondary, etc
    rate_limit_per_minute INT DEFAULT 100,
    rate_limit_per_day INT DEFAULT 10000,
    last_used_at TIMESTAMP NULL,
    success_count INT DEFAULT 0,
    failure_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_priority (priority),
    INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

#### price_fetch_log
```sql
CREATE TABLE price_fetch_log (
    id CHAR(36) PRIMARY KEY,
    token_id CHAR(36) NOT NULL,
    provider_id CHAR(36) NOT NULL,
    attempt_number INT NOT NULL DEFAULT 1,
    success BOOLEAN NOT NULL,
    price_usd DECIMAL(20, 8) NULL,
    error_message VARCHAR(500) NULL,
    response_time_ms INT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (token_id) REFERENCES tokens(id) ON DELETE CASCADE,
    FOREIGN KEY (provider_id) REFERENCES api_providers(id) ON DELETE CASCADE,
    INDEX idx_token_timestamp (token_id, timestamp),
    INDEX idx_provider_success (provider_id, success, timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

---

## 🔧 Servicios y Componentes

### Backend Services (Laravel)

#### 1. AuthService
**Responsabilidad**: Gestión de autenticación y autorización

```php
namespace App\Services;

class AuthService
{
    public function register(array $data): User
    public function login(string $email, string $password): array
    public function logout(User $user): void
    public function refreshToken(User $user): string
    public function validateToken(string $token): bool
}
```

#### 2. WalletService
**Responsabilidad**: Gestión de wallets del usuario

```php
namespace App\Services;

class WalletService
{
    public function addWallet(User $user, array $data): Wallet
    public function removeWallet(User $user, string $walletId): void
    public function listWallets(User $user): Collection
    public function syncWallet(Wallet $wallet): void
    public function validateAddress(string $address, string $chain): bool
}
```

#### 3. PriceAggregatorService
**Responsabilidad**: Obtener precios con sistema multi-provider y fallback

```php
namespace App\Services;

class PriceAggregatorService
{
    // Método principal con fallback automático
    public function fetchPrice(Token $token): ?float
    public function fetchBatchPrices(array $tokens): array
    public function fetchHistoricalPrice(Token $token, Carbon $date): ?float
    public function fetchPriceHistory(Token $token, string $period): Collection

    // Providers específicos
    public function fetchFromCoinGecko(Token $token): ?float
    public function fetchFromZerion(Token $token): ?float
    public function fetchFromJupiter(Token $token): ?float

    // Gestión de providers
    public function getActiveProviders(): Collection
    public function getProviderForToken(Token $token): ApiProvider
    public function setTokenProvider(Token $token, string $provider): void

    // Cache y logging
    public function cachePrices(array $prices): void
    public function logPriceFetch(Token $token, ApiProvider $provider, bool $success, ?float $price): void
    public function getPopularTokensPrices(): array
}
```

**Estrategia de Fallback**:
1. Intentar con el provider primario del token
2. Si falla, intentar con el secundario (por prioridad)
3. Si todos fallan, marcar como error y loggear
4. Reintentar en el siguiente ciclo (2-5 min)

**Lógica de Selección de Provider**:
```php
foreach ($tokens as $token) {
    $providers = $this->getActiveProviders()->sortBy('priority');

    foreach ($providers as $provider) {
        try {
            $price = $this->fetchFromProvider($token, $provider);

            if ($price !== null) {
                $this->logPriceFetch($token, $provider, true, $price);
                $this->cachePrice($token, $price);
                break; // Éxito, pasar al siguiente token
            }
        } catch (Exception $e) {
            $this->logPriceFetch($token, $provider, false, null);
            continue; // Intentar con siguiente provider
        }
    }
}
```

#### 4. BlockchainService
**Responsabilidad**: Interacción con las blockchains

```php
namespace App\Services;

class BlockchainService
{
    public function getBalance(string $address, string $chain): float
    public function getTokens(string $address, string $chain): Collection
    public function getTokenBalance(string $address, string $contract, string $chain): float
    public function validateAddress(string $address, string $chain): bool

    // Chain-specific methods
    public function scanEthereumWallet(string $address): Collection
    public function scanSolanaWallet(string $address): Collection
    public function scanPolygonWallet(string $address): Collection
    public function scanSuiWallet(string $address): Collection
}
```

#### 5. PortfolioService
**Responsabilidad**: Cálculos y agregaciones del portfolio

```php
namespace App\Services;

class PortfolioService
{
    public function calculateTotalValue(User $user): array
    public function getPortfolioDistribution(User $user): array
    public function getPortfolioHistory(User $user, string $period): Collection
    public function getTokenPerformance(User $user, string $tokenId): array
    public function createSnapshot(User $user): PortfolioSnapshot
    public function compareWithMarket(User $user): array
}
```

#### 6. AnalyticsService
**Responsabilidad**: Análisis avanzado y métricas

```php
namespace App\Services;

class AnalyticsService
{
    public function calculatePnL(User $user, string $tokenId): array
    public function getBestPerformers(User $user, int $limit = 5): Collection
    public function getWorstPerformers(User $user, int $limit = 5): Collection
    public function getDailyChange(User $user): array
    public function getWeeklyChange(User $user): array
    public function getMonthlyChange(User $user): array
}
```

#### 7. AdminPanelService
**Responsabilidad**: Gestión de configuración del sistema desde panel admin

```php
namespace App\Services;

class AdminPanelService
{
    // Gestión de APIs Providers
    public function listProviders(): Collection
    public function addProvider(array $data): ApiProvider
    public function updateProvider(string $providerId, array $data): ApiProvider
    public function deleteProvider(string $providerId): void
    public function toggleProvider(string $providerId): bool
    public function setProviderPriority(string $providerId, int $priority): void
    public function getProviderStats(string $providerId): array

    // Monitorización
    public function getFetchSuccessRate(string $providerId, int $days = 7): float
    public function getAverageResponseTime(string $providerId, int $days = 7): int
    public function getFailedFetches(string $providerId, int $limit = 50): Collection
}
```

#### 8. TokenConfigService
**Responsabilidad**: Gestión de tokens y sus mapeos a APIs

```php
namespace App\Services;

class TokenConfigService
{
    // Gestión de Tokens
    public function addToken(array $data): Token
    public function updateToken(string $tokenId, array $data): Token
    public function deleteToken(string $tokenId): void
    public function listTokens(array $filters = []): Collection
    public function getTokenBySymbolAndChain(string $symbol, string $chain): ?Token

    // Mapeos de APIs
    public function setCoinGeckoId(Token $token, string $coingeckoId): void
    public function setZerionId(Token $token, string $zerionId): void
    public function setJupiterId(Token $token, string $jupiterId): void
    public function setPrimaryProvider(Token $token, string $provider): void

    // Batch operations
    public function importTokensFromApi(string $provider, string $chain): Collection
    public function syncTokenMetadata(Token $token): Token
}
```

### Laravel Queue Jobs

#### FetchPricesJob
```php
namespace App\Jobs;

class FetchPricesJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    protected array $tokenIds;

    public function __construct(array $tokenIds)
    {
        $this->tokenIds = $tokenIds;
        $this->onQueue('prices');
    }

    public function handle(PriceAggregatorService $priceService): void
    {
        $tokens = Token::whereIn('id', $this->tokenIds)->get();

        foreach ($tokens as $token) {
            // El servicio ya maneja el fallback automático
            $price = $priceService->fetchPrice($token);

            if ($price) {
                $this->storePrice($token, $price);
            }
        }
    }

    private function storePrice(Token $token, float $price): void
    {
        // Guardar en price_history
        // Actualizar cache en Redis
        // Dispatch websocket event
    }
}
```

#### SyncWalletJob
```php
namespace App\Jobs;

class SyncWalletJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    protected Wallet $wallet;

    public function __construct(Wallet $wallet)
    {
        $this->wallet = $wallet;
        $this->onQueue('wallets');
    }

    public function handle(BlockchainService $blockchainService): void
    {
        // Scan blockchain for tokens
        // Update wallet_token balances
        // Update last_synced_at
    }
}
```

#### CreatePortfolioSnapshotJob
```php
namespace App\Jobs;

class CreatePortfolioSnapshotJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    protected User $user;

    public function __construct(User $user)
    {
        $this->user = $user;
        $this->onQueue('analytics');
    }

    public function handle(PortfolioService $portfolioService): void
    {
        // Calculate total value
        // Store snapshot
        // Dispatch websocket event
    }
}
```

### Frontend Components (React + Mantine)

#### Structure
```
src/
├── components/
│   ├── layout/
│   │   ├── AppLayout.tsx
│   │   ├── Navbar.tsx
│   │   ├── Sidebar.tsx
│   │   └── Footer.tsx
│   ├── dashboard/
│   │   ├── PortfolioSummary.tsx
│   │   ├── TotalValueChart.tsx
│   │   ├── TokenDistribution.tsx
│   │   └── RecentActivity.tsx
│   ├── wallets/
│   │   ├── WalletList.tsx
│   │   ├── WalletCard.tsx
│   │   ├── AddWalletModal.tsx
│   │   └── WalletTokens.tsx
│   ├── portfolio/
│   │   ├── TokenList.tsx
│   │   ├── TokenPerformance.tsx
│   │   ├── PnLCalculator.tsx
│   │   └── AllocationChart.tsx
│   ├── market/
│   │   ├── MarketOverview.tsx
│   │   ├── PopularTokens.tsx
│   │   ├── TokenComparison.tsx
│   │   └── MarketChart.tsx
│   ├── admin/
│   │   ├── AdminDashboard.tsx
│   │   ├── ProviderList.tsx
│   │   ├── ProviderCard.tsx
│   │   ├── AddProviderModal.tsx
│   │   ├── TokenManagement.tsx
│   │   ├── TokenList.tsx
│   │   ├── EditTokenModal.tsx
│   │   ├── ProviderStats.tsx
│   │   └── FetchLogs.tsx
│   └── shared/
│       ├── ChartCard.tsx
│       ├── StatCard.tsx
│       ├── LoadingSpinner.tsx
│       └── ErrorBoundary.tsx
├── pages/
│   ├── Dashboard.tsx
│   ├── Wallets.tsx
│   ├── Portfolio.tsx
│   ├── Market.tsx
│   ├── Admin.tsx
│   ├── Login.tsx
│   └── Register.tsx
├── hooks/
│   ├── useAuth.ts
│   ├── useWallets.ts
│   ├── usePortfolio.ts
│   ├── usePrices.ts
│   ├── useChartData.ts
│   ├── useAdminProviders.ts
│   └── useAdminTokens.ts
├── services/
│   ├── api.ts
│   ├── auth.ts
│   ├── wallets.ts
│   ├── portfolio.ts
│   ├── prices.ts
│   ├── adminProviders.ts
│   └── adminTokens.ts
├── stores/
│   ├── authStore.ts
│   ├── walletStore.ts
│   ├── portfolioStore.ts
│   └── marketStore.ts
├── types/
│   ├── user.ts
│   ├── wallet.ts
│   ├── token.ts
│   └── portfolio.ts
└── utils/
    ├── formatters.ts
    ├── validators.ts
    └── constants.ts
```

---

## 🔐 Panel de Administración

El panel de administración permite gestionar los providers de APIs y la configuración de tokens sin necesidad de modificar código.

### Características del Panel Admin

#### 1. Gestión de API Providers

**Vista de Providers**:
```
┌─────────────────────────────────────────────────────────────────┐
│  API PROVIDERS                              [+ Add Provider]    │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ 🟢 CoinGecko                           Priority: 1        │    │
│  │    Primary provider - Most comprehensive                │    │
│  │                                                         │    │
│  │    ✅ Success Rate: 98.5%   (Last 7 days)               │    │
│  │    ⚡ Avg Response: 245ms                               │    │
│  │    📊 Calls: 1,245/day                                  │    │
│  │                                                         │    │
│  │    [Edit] [Disable] [View Logs]                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ 🟢 Zerion                              Priority: 2        │    │
│  │    DeFi specialist - Multi-chain support                │    │
│  │                                                         │    │
│  │    ✅ Success Rate: 95.2%   (Last 7 days)               │    │
│  │    ⚡ Avg Response: 312ms                               │    │
│  │    📊 Calls: 342/day                                    │    │
│  │                                                         │    │
│  │    [Edit] [Disable] [View Logs]                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ 🟢 Jupiter                            Priority: 3        │    │
│  │    Solana specialist - Real-time prices                 │    │
│  │                                                         │    │
│  │    ✅ Success Rate: 99.8%   (Last 7 days)               │    │
│  │    ⚡ Avg Response: 120ms                               │    │
│  │    📊 Calls: 156/day (Solana only)                      │    │
│  │                                                         │    │
│  │    [Edit] [Disable] [View Logs]                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

**Acciones Disponibles**:
- **Add Provider**: Añadir nueva API (CoinGecko, Zerion, Jupiter, o custom)
- **Edit Provider**: Modificar API key, rate limits, base URL
- **Toggle Active/Inactive**: Habilitar/deshabilitar temporalmente
- **Set Priority**: Definir orden de prioridad (1, 2, 3...)
- **View Logs**: Ver logs de fetchs recientes (success/failure)
- **View Stats**: Métricas detalladas de performance

#### 2. Gestión de Tokens

**Vista de Tokens**:
```
┌─────────────────────────────────────────────────────────────────┐
│  TOKENS                                     [+ Add Token]       │
├─────────────────────────────────────────────────────────────────┤
│  Filter: [All Chains ▼] [All Providers ▼]  Search: [________] │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ 🪙 Bitcoin (BTC)                                        │    │
│  │    Chain: ETH (ERC-20 wrapper)                          │    │
│  │                                                         │    │
│  │    Provider IDs:                                        │    │
│  │    • CoinGecko: bitcoin                                 │    │
│  │    • Zerion: 0x...                                      │    │
│  │                                                         │    │
│  │    Primary: CoinGecko  ✅                               │    │
│  │                                                         │    │
│  │    [Edit IDs] [Change Primary] [View Price History]     │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ 🪙 Solana (SOL)                                          │    │
│  │    Chain: SOL (Native)                                  │    │
│  │                                                         │    │
│  │    Provider IDs:                                        │    │
│  │    • CoinGecko: solana                                  │    │
│  │    • Jupiter: SOL                                       │    │
│  │                                                         │    │
│  │    Primary: CoinGecko  ✅                               │    │
│  │                                                         │    │
│  │    [Edit IDs] [Change Primary] [View Price History]     │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ ⚠️  UnknownToken (UNK)                                   │    │
│  │    Chain: Polygon                                       │    │
│  │                                                         │    │
│  │    ❌ No CoinGecko ID found                             │    │
│  │    ⚠️  Trying Zerion... (Last: 5 min ago)              │    │
│  │                                                         │    │
│  │    [Add Manual ID] [Search Zerion]                      │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

**Acciones Disponibles**:
- **Add Token**: Añadir nuevo token manualmente
- **Edit Provider IDs**: Modificar IDs de cada API
- **Set Primary Provider**: Cambiar provider principal
- **Import from API**: Importar tokens desde CoinGecko/Zerion/Jupiter
- **Sync Metadata**: Actualizar logo, nombre, decimals
- **View Price History**: Ver gráfico de precios del token

#### 3. Logs de Fetch de Precios

**Vista de Logs**:
```
┌─────────────────────────────────────────────────────────────────┐
│  PRICE FETCH LOGS                                               │
├─────────────────────────────────────────────────────────────────┤
│  Filter: [All ▼] [Last 24h ▼]                [Export CSV]      │
│                                                                   │
│  Timestamp           │ Token    │ Provider    │ Status │ Time   │
│  ─────────────────────┼──────────┼─────────────┼────────┼───────│
│  2024-02-14 15:32:01 │ BTC      │ CoinGecko   │ ✅     │ 230ms │
│  2024-02-14 15:32:01 │ ETH      │ CoinGecko   │ ✅     │ 245ms │
│  2024-02-14 15:32:01 │ SOL      │ CoinGecko   │ ❌     │ -     │
│                      │          │ Jupiter     │ ✅     │ 120ms │
│  2024-02-14 15:32:00 │ UNK_TOK  │ CoinGecko   │ ❌     │ -     │
│                      │          │ Zerion      │ ✅     │ 310ms │
│  2024-02-14 15:31:58 │ MATIC    │ CoinGecko   │ ✅     │ 225ms │
│                                                                   │
│  [Load More]                                                     │
└─────────────────────────────────────────────────────────────────┘
```

### API Endpoints del Panel Admin

```php
// Providers
GET    /api/admin/providers
POST   /api/admin/providers
GET    /api/admin/providers/{id}
PUT    /api/admin/providers/{id}
DELETE /api/admin/providers/{id}
POST   /api/admin/providers/{id}/toggle
PUT   /api/admin/providers/{id}/priority
GET    /api/admin/providers/{id}/stats
GET    /api/admin/providers/{id}/logs

// Tokens
GET    /api/admin/tokens
POST   /api/admin/tokens
GET    /api/admin/tokens/{id}
PUT    /api/admin/tokens/{id}
DELETE /api/admin/tokens/{id}
POST   /api/admin/tokens/{id}/provider-ids
PUT   /api/admin/tokens/{id}/primary-provider
POST   /api/admin/tokens/import
GET    /api/admin/tokens/{id}/price-history

// Logs
GET    /api/admin/logs/fetches
GET    /api/admin/logs/fetches/{providerId}
GET    /api/admin/logs/stats
```

### Middleware de Seguridad

```php
// Solo admins pueden acceder
Route::middleware(['auth', 'role:admin'])
    ->prefix('api/admin')
    ->group(function () {
        // Todas las rutas admin
    });
```

### Configuración por Defecto

**Providers Iniciales** (Se crean en la primera migración):

```php
// database/seeders/ApiProviderSeeder.php
public function run()
{
    ApiProvider::create([
        'name' => 'coingecko',
        'base_url' => 'https://api.coingecko.com/api/v3',
        'api_key' => null, // No requiere para free tier
        'is_active' => true,
        'priority' => 1,
        'rate_limit_per_minute' => 50,
        'rate_limit_per_day' => 10000,
    ]);

    ApiProvider::create([
        'name' => 'zerion',
        'base_url' => 'https://api.zerion.io/v1',
        'api_key' => encrypt(env('ZERION_API_KEY')),
        'is_active' => false, // Requiere API key
        'priority' => 2,
        'rate_limit_per_minute' => 100,
        'rate_limit_per_day' => 10000,
    ]);

    ApiProvider::create([
        'name' => 'jupiter',
        'base_url' => 'https://price.jup.ag/v4',
        'api_key' => null, // No requiere
        'is_active' => true,
        'priority' => 3,
        'rate_limit_per_minute' => 100,
        'rate_limit_per_day' => 100000,
    ]);
}
```

---

## 🌐 APIs Externas

### Estrategia Multi-Provider

GwydeCrypt utiliza un sistema de **múltiples providers con fallback automático** para asegurar que siempre se obtengan los precios, incluso si una API falla o no tiene un token específico.

#### Orden de Prioridad (Default)

1. **CoinGecko** (Primary) - Cobertura más amplia
2. **Zerion** (Secondary) - Especializado en DeFi
3. **Jupiter** (Tertiary para Solana) - Mejor data para Solana

#### Lógica de Fallback

```
┌─────────────────────────────────────────────────────────────┐
│ Request: Get price for TOKEN_X                               │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
            ┌─────────────────────────┐
            │ ¿Token tiene provider   │
            │ primario configurado?   │
            └─────────────────────────┘
                     │ YES │ NO
                     ▼     ▼
            ┌──────────┐  ┌──────────────────┐
            │ Usar     │  │ Usar CoinGecko   │
            │ provider │  │ (default)        │
            │ primario │  └──────────────────┘
            └──────────┘           │
                 │                 ▼
                 ▼         ┌─────────────┐
        ┌─────────────┐    │ ¿Success?   │
        │ ¿Success?   │    └─────────────┘
        └─────────────┘          │ NO
             │ YES │ NO          ▼
             ▼     ▼      ┌─────────────┐
        ┌─────┐  ┌──────────────────────┐
        │Return│ │ Intentar Zerion      │
        │Price │ └──────────────────────┘
        └─────┘           │
                     ┌────┴────┐
                     ▼         ▼
              ┌─────────┐ ┌────────────┐
              │Success? │ │ NO - Para   │
              └─────────┘ │ Solana:     │
                   │     │ Intentar    │
              YES  │     │ Jupiter     │
                   ▼     └────────────┘
              ┌─────────┐          │
              │ Return  │     ┌─────┴─────┐
              │ Price   │     ▼           ▼
              └─────────┐  ┌─────────┐ ┌─────────┐
                          │ Success │ │ Log     │
                          └─────────┘ │ Error   │
                                      └─────────┘
```

### CoinGecko API (Primary)

**Propósito**: API principal por su amplia cobertura de tokens

**Endpoints Utilizados**:

1. **Precio Actual**
```
GET https://api.coingecko.com/api/v3/simple/price
?ids=bitcoin,ethereum,solana,polygon,sui
&vs_currencies=usd
&include_market_cap=true
&include_24hr_vol=true
&include_24hr_change=true
```

2. **Precio Histórico**
```
GET https://api.coingecko.com/api/v3/coins/{id}/history
?date={dd-mm-yyyy}
```

3. **Gráfico de Mercado**
```
GET https://api.coingecko.com/api/v3/coins/{id}/market_chart
?vs_currency=usd
&days={1|7|30|365|max}
```

4. **Lista de Tokens**
```
GET https://api.coingecko.com/api/v3/coins/list
```

**Rate Limiting**:
- Free tier: 10-50 calls/minute
- Implementar caching agresivo en Redis
- Usar batch endpoints cuando sea posible

### Zerion API (Secondary)

**Propósito**: Especializado en tokens DeFi, excelente cobertura multi-chain

**API Key**: Requerida (obtener en https://zerion.io/developers)

**Endpoints Utilizados**:

1. **Precio de Token**
```
GET https://api.zerion.io/v1/wallets/{address}/positions
?filter[positions]=only_simple
&currency=usd
```

2. **Precio por Contract Address**
```
GET https://api.zerion.io/v1/fungibles/{address}
?filter[chain_ids]=eth,sol,polygon
```

3. **Lista de Tokens Soportados**
```
GET https://api.zerion.io/v1/fungibles
?filter[chain_ids]=eth,sol,polygon,sui
&currency=usd
```

**Rate Limiting**:
- Free tier: 100 requests/hour
- Implementar batch requests
- Caching agresivo (5 min)

**Ventajas**:
- Excelente para tokens DeFi poco comunes
- Soporte nativo multi-chain
- Datos de portfolio muy completos

**Desventajas**:
- Menos tokens que CoinGecko
- Rate limit más estricto en free tier

### Jupiter API (Tertiary para Solana)

**Propósito**: Mejor data y precios para ecosistema Solana

**Base URL**: https://price.jup.ag/v4

**Endpoints Utilizados**:

1. **Precio por Token Address**
```
GET https://price.jup.ag/v4/price
?ids={token_address1},{token_address2}
```

2. **Precio por Symbol**
```
GET https://price.jup.ag/v4/price
?ids=SOL,USDC,USDT
```

3. **Lista de Tokens**
```
GET https://price.jup.ag/v4/list
```

**Rate Limiting**:
- Muy generoso: ~100 requests/minute
- No requiere API key (rate limit por IP)

**Ventajas**:
- Mejor fuente para Solana
- Muy rápido y confiable
- Actualización en tiempo real
- No requiere API key

**Desventajas**:
- Solo Solana
- No tiene datos históricos extensos

### Integración de las 3 APIs

```php
// Ejemplo de implementación
class PriceAggregatorService
{
    public function fetchPrice(Token $token): ?float
    {
        // 1. Intentar con provider configurado
        if ($token->primary_provider) {
            $price = $this->tryProvider($token, $token->primary_provider);
            if ($price !== null) return $price;
        }

        // 2. CoinGecko (default)
        if ($token->coingecko_id) {
            $price = $this->fetchFromCoinGecko($token);
            if ($price !== null) {
                $this->logSuccess($token, 'coingecko');
                return $price;
            }
        }

        // 3. Zerion (backup)
        if ($token->chain === 'eth' || $token->chain === 'polygon') {
            $price = $this->fetchFromZerion($token);
            if ($price !== null) {
                $this->logSuccess($token, 'zerion');
                return $price;
            }
        }

        // 4. Jupiter (para Solana)
        if ($token->chain === 'sol' && $token->contract_address) {
            $price = $this->fetchFromJupiter($token);
            if ($price !== null) {
                $this->logSuccess($token, 'jupiter');
                return $price;
            }
        }

        // Todos fallaron
        $this->logFailure($token, 'all_providers_failed');
        return null;
    }
}
```

### Blockchain RPCs

#### Ethereum (via Infura/Alchemy)
```javascript
// Get ETH Balance
web3.eth.getBalance(address)

// Get ERC-20 Tokens
// Usar The Graph o multicall
const multicall = [
  ethBalance(address),
  tokenBalance(contract1, address),
  tokenBalance(contract2, address),
  // ...
]
```

#### Solana
```javascript
// Get SOL Balance
connection.getBalance(publicKey)

// Get SPL Tokens
connection.getTokenAccountsByOwner(publicKey)
```

#### Polygon
```javascript
// Similar a Ethereum (Web3.js/Ethers.js)
web3.eth.getBalance(address)
```

#### SUI
```javascript
// Get SUI Balance
provider.getBalance(address)

// Get Objects/Tokens
provider.getObjectsOwnedByAddress(address)
```

---

## 🔄 Flujo de Datos

### 1. Flujo de Sincronización de Wallets

```
Usuario añade wallet
        ↓
WalletService.addWallet()
        ↓
Dispatch SyncWalletJob (Queue)
        ↓
BlockchainService.scanWallet()
        ↓
Para cada token encontrado:
  - Verificar si existe en DB
  - Si no existe, crear desde CoinGecko
  - Actualizar/crear wallet_token
        ↓
Actualizar wallet.last_synced_at
        ↓
Dispatch FetchPricesJob
        ↓
WebSocket event: wallet.synced
```

### 2. Flujo de Actualización de Precios

```
Scheduler: Cada 1-5 minutos
        ↓
Obtener todos los tokens activos
        ↓
FetchPricesJob->handle()
        ↓
PriceService->fetchBatchPrices()
        ↓
CoinGecko API (batch request)
        ↓
Para cada precio:
  - Guardar en Redis cache (TTL: 1 min)
  - Guardar en price_history table
        ↓
WebSocket event: prices.updated
        ↓
Frontend actualiza gráficos
```

### 3. Flujo de Cálculo de Portfolio

```
Usuario accede a portfolio
        ↓
PortfolioService->calculateTotalValue()
        ↓
Obtener todos los wallets del usuario
        ↓
Para cada wallet:
  - Sumar balance * precio_actual
        ↓
Calcular métricas:
  - Valor total
  - Cambio 24h
  - Distribución %
        ↓
Retornar datos formateados
        ↓
Frontend renderiza gráficos
```

### 4. Flujo de Snapshot Histórico

```
Scheduler: Cada hora
        ↓
CreatePortfolioSnapshotJob->dispatch(user)
        ↓
Para cada usuario activo:
  - Calcular valor total
  - Obtener valor hace 24h
  - Calcular cambio
  - Guardar snapshot
        ↓
Usado para gráficos históricos
```

---

## 🔒 Seguridad

### Autenticación

1. **JWT Tokens**
   - Access token: 15 minutos
   - Refresh token: 7 días
   - Almacenado en HttpOnly cookies

2. **Hashing de Contraseñas**
   - Laravel bcrypt (cost: 12)
   - Rehashing automático

3. **Rate Limiting**
   - Login: 5 intentos por minuto
   - API: 100 requests/minuto por usuario

### Protección de Datos

1. **Wallets**
   - Las private keys NUNCA se almacenan
   - Solo se guardan public addresses
   - Validación de formato de dirección

2. **API Keys**
   - Almacenadas en .env
   - Nunca en el repositorio
   - Rotación periódica

3. **CORS**
   - Whitelist de orígenes permitidos
   - Credentials: same-origin

### Validaciones

1. **Direcciones de Wallet**
```php
// Ethereum: 0x + 40 hex chars
/^0x[a-fA-F0-9]{40}$/

// Solana: Base58, 32-44 chars
/^[1-9A-HJ-NP-Za-km-z]{32,44}$/

// SUI: 0x + hex
/^0x[a-fA-F0-9]{40,}$/
```

2. **Inputs de Usuario**
   - Sanitización en todos los endpoints
   - Validación de tipos
   - Escaping de outputs

---

## 📈 Escalabilidad y Rendimiento

### Estrategias de Escalado

#### Horizontal Scaling
- **Backend**: Múltiples instancias de Laravel con load balancer
- **Database**: Read replicas para queries de lectura
- **Redis**: Cluster para cache distribuido

#### Vertical Scaling
- **Database**: Indexación adecuada
- **Cache**: Redis para hot data
- **Queue**: Workers dedicados por tipo de job

### Optimizaciones de Rendimiento

1. **Caching Strategy**
```
- Precios actuales: Redis (1 min TTL)
- Datos de usuario: Redis (5 min TTL)
- Gráficos históricos: Cache por 15 min
- Tokens populares: Redis cache permanente
```

2. **Database Indexing**
```sql
-- Índices compuestos para queries frecuentes
CREATE INDEX idx_wallet_user ON wallets(user_id);
CREATE INDEX idx_price_token_time ON price_history(token_id, timestamp);
CREATE INDEX idx_snapshot_user_time ON portfolio_snapshots(user_id, timestamp);

-- Índices para joins
CREATE INDEX idx_wallet_token_wallet ON wallet_tokens(wallet_id);
CREATE INDEX idx_wallet_token_token ON wallet_tokens(token_id);
```

3. **Query Optimization**
```php
// MAL: N+1 queries
$wallets = Wallet::all();
foreach ($wallets as $wallet) {
    $wallet->tokens; // N queries
}

// BIEN: Eager loading
$wallets = Wallet::with('tokens')->get();
```

4. **Queue Priorities**
```
- high: user-initiated actions (sync wallet now)
- default: periodic price updates
- low: historical data sync
```

5. **Lazy Loading**
```javascript
// Frontend: Cargar datos por demanda
- Dashboard: Load summary first
- Gráficos: Load on scroll/click
- Lista de tokens: Pagination
```

### Monitoreo

1. **Laravel Telescope**
   - Queries lentas
   - Requests entrantes
   - Jobs ejecutados

2. **Laravel Pulse**
   - Performance en tiempo real
   - Cuellos de botella
   - Uso de recursos

3. **Custom Metrics**
   - Tiempo de respuesta de APIs externas
   - Tasa de éxito de wallet syncs
   - Precisión de datos de portfolio

---

## 🚀 Despliegue

### Docker Setup

#### docker-compose.yml
```yaml
version: '3.8'

services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./docker/nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./docker/nginx/sites:/etc/nginx/sites-available
      - ./src:/var/www/html
    depends_on:
      - laravel

  laravel:
    build:
      context: .
      dockerfile: docker/Dockerfile
    volumes:
      - ./src:/var/www/html
    environment:
      - DB_HOST=mysql
      - DB_PORT=3306
      - DB_DATABASE=gwydecrypt
      - DB_USERNAME=gwyde
      - DB_PASSWORD=secret
      - REDIS_HOST=redis
      - REDIS_PORT=6379
    depends_on:
      - mysql
      - redis

  mysql:
    image: mysql:8.0
    environment:
      - MYSQL_ROOT_PASSWORD=secret
      - MYSQL_DATABASE=gwydecrypt
      - MYSQL_USER=gwyde
      - MYSQL_PASSWORD=secret
    ports:
      - "3306:3306"
    volumes:
      - mysql_data:/var/lib/mysql

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  queue-worker:
    build:
      context: .
      dockerfile: docker/Dockerfile
    command: php artisan queue:work --sleep=3 --tries=3 --max-time=3600
    depends_on:
      - laravel
      - redis
    restart: unless-stopped

  scheduler:
    build:
      context: .
      dockerfile: docker/Dockerfile
    command: php artisan schedule:work
    depends_on:
      - laravel
    restart: unless-stopped

volumes:
  mysql_data:
```

### Cron Jobs (Laravel Scheduler)

```php
// app/Console/Kernel.php

protected function schedule(Schedule $schedule)
{
    // Actualizar precios cada 2 minutos
    $schedule->job(new FetchPricesJob())
             ->everyTwoMinutes()
             ->withoutOverlapping();

    // Sincronizar wallets cada 5 minutos
    $schedule->job(new SyncActiveWalletsJob())
             ->everyFiveMinutes()
             ->withoutOverlapping();

    // Crear snapshots cada hora
    $schedule->job(new CreatePortfolioSnapshotsJob())
             ->hourly()
             ->withoutOverlapping();

    // Limpiar cache antigua
    $schedule->command('cache:prune-stale-tags')
             ->daily();

    // Backup de base de datos
    $schedule->command('db:backup')
             ->dailyAt('02:00');
}
```

### Environment Variables

```env
# APP
APP_NAME=GwydeCrypt
APP_ENV=production
APP_DEBUG=false
APP_URL=https://gwydecrypt.com

# DATABASE
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=gwydecrypt
DB_USERNAME=gwyde
DB_PASSWORD=your_password

# REDIS
REDIS_HOST=127.0.0.1
REDIS_PASSWORD=null
REDIS_PORT=6379

# COINGECKO API (Primary)
COINGECKO_API_KEY=your_api_key_optional
COINGECKO_API_URL=https://api.coingecko.com/api/v3

# ZERION API (Secondary - DeFi tokens)
ZERION_API_KEY=your_zerion_api_key
ZERION_API_URL=https://api.zerion.io/v1

# JUPITER API (Tertiary - Solana only)
JUPITER_API_URL=https://price.jup.ag/v4
JUPITER_API_KEY=null

# BLOCKCHAIN RPCs
INFURA_PROJECT_ID=your_infura_id
INFURA_PROJECT_SECRET=your_infura_secret
SOLANA_RPC_URL=https://solana-api.project.com
POLYGON_RPC_URL=https://polygon-rpc.com
SUI_RPC_URL=https://sui-rpc.com

# QUEUE
QUEUE_CONNECTION=redis

# CACHE
CACHE_DRIVER=redis
SESSION_DRIVER=redis
```

---

## 📋 Roadmap de Implementación

### Fase 1: MVP (4-6 semanas)
- [ ] Setup del proyecto (Laravel + React)
- [ ] Sistema de autenticación
- [ ] Añadir/eliminar wallets
- [ ] Mostrar balance total
- [ ] Integración CoinGecko API
- [ ] Gráficos básicos (Recharts)

### Fase 2: Core Features (4-6 semanas)
- [ ] Multi-chain support (ETH, SOL, Polygon, SUI)
- [ ] Sincronización automática de wallets
- [ ] Gráficos de distribución
- [ ] Histórico de precios
- [ ] Snapshots del portfolio

### Fase 3: Analytics (3-4 semanas)
- [ ] Cálculo de P&L
- [ ] Comparación con mercado
- [ ] Top performers/peor performers
- [ ] Métricas avanzadas

### Fase 4: Polish & Optimización (2-3 semanas)
- [ ] Optimización de performance
- [ ] Testing suite
- [ ] Documentación
- [ ] Deploy a producción

---

## 🎓 Consideraciones Adicionales

### Testing
- **PHPUnit**: Tests unitarios de servicios
- **Pest**: Testing framework moderno para Laravel
- **Jest/Vitest**: Tests frontend
- **Laravel Dusk**: Tests E2E

### Logging
- **Laravel Log**: Canal diario
- **Sentry**: Error tracking
- **Custom Logs**: Audit log de acciones críticas

### Documentación
- **API Docs**: OpenAPI/Swagger
- **Code Comments**: PHPDoc para servicios
- **Wiki**: Guías de uso

### Costos Estimados (Mensual)
- **VPS**: $20-50 (DigitalOcean, Linode)
- **Database Managed**: $15-50 (PlanetScale, RDS)
- **CoinGecko Pro**: $0-79 (Free tier inicial)
- **RPC Endpoints**: $0-50 (Infura free tier)
- **Total**: ~$35-179/mes

---

## 📚 Recursos y Referencias

### Documentación Oficial
- [Laravel 12 Documentation](https://laravel.com/docs/12.x)
- [React Documentation](https://react.dev)
- [Mantine UI](https://mantine.dev)
- [CoinGecko API](https://www.coingecko.com/en/api/documentation)
- [Web3.js](https://web3js.readthedocs.io)
- [Solana Web3.js](https://solana-labs.github.io/solana-web3.js)

### Tutoriales y Guías
- [Laravel + React Tutorial](https://laravel.com/docs/12.x/frontend#react)
- [Building a Crypto Portfolio Tracker](https://dev.to/series/crypto-tracker)
- [Advanced Laravel Queues](https://laravel.com/docs/12.x/queues)

---

## ✅ Conclusión

Este documento de arquitectura proporciona una base sólida para el desarrollo de GwydeCrypt. La arquitectura propuesta es:

- **Escalable**: Capaz de crecer con la base de usuarios
- **Mantenible**: Código organizado y documentado
- **Segura**: Protección de datos y autenticación robusta
- **Performance-optimizada**: Caching, colas, y optimizaciones de DB

El siguiente paso es comenzar con el setup del proyecto e implementar las funcionalidades del MVP siguiendo este plan.

**¿Listo para empezar el desarrollo?**

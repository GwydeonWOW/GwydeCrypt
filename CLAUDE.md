# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## ⚠️ CRITICAL RULE - GIT OPERATIONS

**🚨 NUNCA, JAMÁS, UNDER NO CIRCUMSTANCES puedes hacer git add, git commit o git push SIN permiso EXPLÍCITO del usuario.**

**THIS IS THE MOST IMPORTANT RULE IN THIS FILE - VIOLATION IS GROUNDS FOR IMMEDIATE SESSION TERMINATION**

### Workflow OBLIGATORIO para cambios en git:

1. ✅ **Hacer los cambios de código** - Modificar archivos según instrucciones del usuario
2. ✅ **Mostrar los cambios** - Ejecutar `git status` o `git diff` para que el usuario revise
3. ✅ **ESPERAR** - NO hacer NINGUNA operación git hasta que el usuario diga explícitamente:
   - "commit y push" ✅
   - "haz commit de estos cambios" ✅
   - "sube los cambios a git" ✅
   - "puedes commitear" ✅

4. ❌ **NUNCA asumir** que puedes hacer commit/push solo porque terminaste los cambios
5. ❌ **NUNCA hacer git push** sin que el usuario lo pida explícitamente

**Repository URL:** https://github.com/GwydeonWOW/GwydeCrypt.git

**Si tienes duda: PREGUNTA al usuario antes de cualquier operación git**

## Project Overview

GwydeCrypt is a multi-chain cryptocurrency portfolio tracking platform with backend (Laravel 12/PHP) and frontend (React/TypeScript). The system tracks wallets across multiple blockchains (Ethereum, Solana, Polygon, SUI, Optimism, BNB, Arbitrum, BTC), provides real-time price data from multiple APIs with automatic fallback, and includes investment/sales tracking.

## Git Guidelines

**Allowed operations (no permission needed):**
- Reading files from the repository ✅
- Making local code changes ✅
- Modifying files according to user instructions ✅
- Checking git status or history ✅

**Operations that REQUIRE explicit user permission:**
- `git add` - ❌ SOLO con permiso explícito
- `git commit` - ❌ SOLO con permiso explícito
- `git push` - ❌ SOLO con permiso explícito
- `git remote` - ❌ SOLO con permiso explícito

## Common Development Commands

### Backend (Laravel)

```bash
cd gwydecrypt-backend

# Install dependencies
composer install

# Setup environment (first time)
cp .env.example .env
php artisan key:generate

# Run migrations
php artisan migrate

# Seed database (creates default admin user)
php artisan db:seed

# Start development server (port 8000)
php artisan serve

# Start queue worker
php artisan queue:work

# Start scheduler (development)
php artisan schedule:work

# Run all services together (server, queue, logs, vite)
composer run dev

# Run tests
php artisan test
# Run specific test
php artisan test --filter testMethodName

# Code style check
./vendor/bin/pint

# Clear caches
php artisan config:clear
php artisan cache:clear
php artisan route:clear
```

### Frontend (React)

```bash
cd gwydecrypt-frontend

# Install dependencies
npm install

# Start dev server (port 3000, proxies to backend at 8000)
npm run dev

# Build for production
npm run build

# Lint code
npm run lint

# Preview production build
npm run preview
```

## Architecture Overview

### Monorepo Structure

```
GwydeCrypt/
├── gwydecrypt-backend/     # Laravel 12 API backend
└── gwydecrypt-frontend/    # React + TypeScript frontend
```

### Backend Architecture (Laravel 12)

**Key Services** (`app/Services/`):
- `AuthService` - Authentication, JWT tokens
- `WalletService` - Wallet management
- `PortfolioService` - Portfolio calculations, aggregation
- `PriceAggregatorService` - Multi-provider price fetching with fallback
- `InvestmentService` - Investment tracking logic
- `SaleService` - Sales tracking logic
- `AnalyticsService` - P&L, performance metrics
- `AdminPanelService` - Admin panel functionality
- `TokenConfigService` - Token configuration and metadata
- `CacheService` - Caching layer

**Price Providers** (`app/Services/PriceProviders/`):
- `CoinGeckoProvider` - Primary price source
- `ZerionProvider` - Secondary DeFi-focused source
- `JupiterProvider` - Solana-specific prices

**Controllers** (`app/Http/Controllers/Api/`):
- `AuthController` - Register, login, logout
- `WalletController` - CRUD for wallets
- `PortfolioController` - Portfolio data, history, analytics
- `InvestmentController` - Investment management
- `SaleController` - Sales tracking
- `PolymarketController` - Polymarket integration
- `PoolsController` - DeFi pools data
- `Admin/ProviderController` - API provider management
- `Admin/TokenController` - Token management

**Database Models**:
- `User` - Users (with `is_admin`, `is_approved` flags)
- `Wallet` - User wallets (multi-chain support)
- `Token` - Token definitions with `tokenChains` relationship
- `TokenChain` - Tokens can exist on multiple chains
- `WalletToken` - Tokens in wallets with manual balance support
- `PriceHistory` - Historical price data
- `PortfolioSnapshot` - Portfolio value snapshots over time
- `ApiProvider` - External API configurations
- `PriceFetchLog` - Price fetch success/failure logging
- `Investment` - Investment records
- `Sale` - Sale records

### Frontend Architecture (React + TypeScript)

**State Management** (`src/store/`):
- `authStore.ts` - Zustand store for auth state
- `autoRefreshStore.ts` - Auto-refresh behavior
- `privacyStore.ts` - Privacy settings

**Pages** (`src/pages/`):
- `Dashboard.tsx` - Main dashboard
- `Wallets.tsx` - Wallet management
- `Portfolio.tsx` - Portfolio analysis
- `Admin.tsx` - Admin panel
- `Pools.tsx` - DeFi pools view
- `News.tsx` - News feed
- `Settings.tsx` - User settings

**API Layer** (`src/api/`):
- `axios.ts` - Axios configuration with base URL
- `pools.ts` - Pools API calls
- `users.ts` - User API calls

**UI**: Mantine v6 component library
**Routing**: React Router v6
**HTTP**: Axios
**Charts**: Recharts
**Drag & Drop**: @dnd-kit

### Key Design Patterns

1. **Multi-Provider Price Fetching**: `PriceAggregatorService` automatically falls back through CoinGecko → Zerion → Jupiter if providers fail
2. **Multi-Chain Tokens**: Tokens can exist on multiple chains via `token_chains` table with `is_virtual` flag for wrapped tokens
3. **Manual Balances**: `wallet_tokens` table supports manual balance entry for tokens that can't be auto-scanned
4. **Admin Role System**: Users must be approved (`is_approved`) and can have admin privileges (`is_admin`)
5. **Queue-Based Jobs**: Price fetching, wallet sync, and snapshots run via Laravel queues

## API Endpoints Structure

### Public Routes
- `GET /api/health` - Health check
- `POST /api/auth/register` - Register
- `POST /api/auth/login` - Login
- `GET /api/market/tokens` - All tokens
- `GET /api/market/popular` - Popular tokens prices
- `GET /api/polymarket/trending` - Polymarket trending
- `GET /api/pools/*` - DeFi pools data

### Authenticated Routes (Sanctum)
- `/api/auth/*` - Logout, refresh, profile
- `/api/wallets/*` - Wallet CRUD
- `/api/portfolio/*` - Portfolio data, analytics
- `/api/investments/*` - Investment tracking
- `/api/sales/*` - Sales tracking

### Admin Routes (requires `is_admin=true`)
- `/api/admin/providers/*` - API provider management
- `/api/admin/tokens/*` - Token management
- `/api/admin/users/*` - User management (approve/reject)

## Environment Configuration

### Backend `.env` Key Variables
```env
DB_CONNECTION=pgsql
# ... database config

COINGECKO_API_KEY=          # Optional, for higher rate limits
ZERION_API_KEY=             # Required for Zerion provider
```

### Frontend
- Dev server: `http://localhost:3000`
- Proxies `/api` requests to backend at `http://127.0.0.1:8000`

## Testing

### Backend Tests
```bash
cd gwydecrypt-backend
php artisan test

# Run specific test suite
php artisan test --testsuite=Feature
php artisan test --testsuite=Unit
```

Tests use PHPUnit with SQLite in-memory database (configured in `phpunit.xml`).

### Frontend Tests
```bash
cd gwydecrypt-frontend
npm run lint  # ESLint
```

## Database Migrations

Migrations are timestamped in `gwydecrypt-backend/database/migrations/`. Key tables:
- Users, wallets, tokens, token_chains
- Price tracking (price_histories, price_fetch_logs)
- Portfolio tracking (portfolio_snapshots)
- Investment/sales tracking
- Admin (api_providers)

Run `php artisan migrate:fresh --seed` to reset database with seed data.

## Default Credentials

After running `php artisan db:seed`:
- Email: `admin@gwydecrypt.com`
- Password: `password` (CHANGE IN PRODUCTION)

## Important Notes

- Backend uses Laravel Sanctum for API authentication (token-based)
- Frontend proxies API calls to backend in development
- Price updates happen via scheduled jobs in queues
- Admin panel allows managing API providers and tokens without code changes
- Tokens can be configured to show on dashboard via `show_on_dashboard` flag
- Chain support includes: eth, sol, polygon, sui, optimism, bnb, arbitrum, btc

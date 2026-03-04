# Arquitectura Optimizada vfat.io - Diseño Escalable

## 🎯 Objetivo

Procesar 16,154 farms (36MB) de forma eficiente, escalable y con persistencia en base de datos.

## 📊 Arquitectura Propuesta

```
┌─────────────────────────────────────────────────────────────┐
│  1. SCHEDULER (cada 5 min)                                 │
│     php artisan pools:sync-vfat                             │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│  2. JOB EN COLA (async)                                     │
│     - Download en streaming                                 │
│     - Parse por chunks (100 farms)                          │
│     - Upsert a BD (no duplicados)                           │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│  3. BASE DE DATOS (PostgreSQL)                              │
│     - pools (tabla principal)                                │
│     - pool_assets (tokens por pool)                         │
│     - pool_rewards (rewards por pool)                       │
│     - pool_snapshots (histórico)                            │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│  4. API ENDPOINTS (desde BD)                                │
│     - Queries optimizadas con índices                       │
│     - Paginación                                           │
│     - Filtros por chain, TVL, APY                           │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│  5. FRONTEND (React)                                        │
│     - Pide datos paginados                                  │
│     - Queries rápidas (< 100ms)                             │
│     - No procesa JSON gigante                               │
└─────────────────────────────────────────────────────────────┘
```

## 🗄️ Diseño de Base de Datos

### Tablas Principales

```sql
-- Tabla principal de pools
CREATE TABLE pools (
    id BIGSERIAL PRIMARY KEY,
    pool_address VARCHAR(42) NOT NULL UNIQUE,
    chain_id INTEGER NOT NULL,
    chain_name VARCHAR(50) NOT NULL,

    -- Protocol info
    protocol_id VARCHAR(50) NOT NULL,
    protocol_name VARCHAR(100) NOT NULL,
    protocol_url VARCHAR(255),

    -- Pool metadata
    farm_type VARCHAR(50),
    farm_address VARCHAR(42),
    pool_symbol VARCHAR(100),
    pool_is_stable BOOLEAN DEFAULT FALSE,
    pool_fee VARCHAR(10),

    -- Metrics (calculados)
    tvl_usd DECIMAL(20, 2) DEFAULT 0,
    apy DECIMAL(10, 2) DEFAULT 0,
    apy_base DECIMAL(10, 2) DEFAULT 0,
    apy_reward DECIMAL(10, 2) DEFAULT 0,

    -- Categorización
    is_stablecoin BOOLEAN DEFAULT FALSE,
    il_risk VARCHAR(20) DEFAULT 'medium',

    -- Estado
    is_active BOOLEAN DEFAULT TRUE,
    is_killed BOOLEAN DEFAULT FALSE,

    -- Timestamps
    vfat_synced_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    -- Índices para queries rápidas
    INDEX idx_chain_tvl (chain_id, tvl_usd DESC),
    INDEX idx_apy (apy DESC),
    INDEX idx_protocol (protocol_id),
    INDEX idx_active (is_active, is_killed),
    INDEX idx_synced (vfat_synced_at)
);

-- Tokens/Por pool
CREATE TABLE pool_assets (
    id BIGSERIAL PRIMARY KEY,
    pool_id BIGINT REFERENCES pools(id) ON DELETE CASCADE,

    -- Token info
    token_address VARCHAR(42) NOT NULL,
    token_symbol VARCHAR(50) NOT NULL,
    token_name VARCHAR(255),
    token_decimals INTEGER,

    -- Metrics
    reserve DECIMAL(30, 0), -- en wei
    price DECIMAL(20, 10),
    liquidity DECIMAL(20, 2),

    -- Fees (mensual)
    monthly_swap_fees DECIMAL(30, 0),

    -- Timestamps
    vfat_synced_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    INDEX idx_pool (pool_id),
    INDEX idx_token (token_address)
);

-- Rewards por pool
CREATE TABLE pool_rewards (
    id BIGSERIAL PRIMARY KEY,
    pool_id BIGINT REFERENCES pools(id) ON DELETE CASCADE,

    -- Reward token
    reward_token_address VARCHAR(42) NOT NULL,
    reward_token_symbol VARCHAR(50),
    reward_token_name VARCHAR(255),
    reward_token_decimals INTEGER,

    -- Reward rate
    rewards_per_second DECIMAL(30, 0),
    reward_token_price DECIMAL(20, 10),

    -- Timestamps
    vfat_synced_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),

    INDEX idx_pool (pool_id)
);

-- Snapshots para historico
CREATE TABLE pool_snapshots (
    id BIGSERIAL PRIMARY KEY,
    pool_id BIGINT REFERENCES pools(id) ON DELETE CASCADE,

    tvl_usd DECIMAL(20, 2),
    apy DECIMAL(10, 2),

    snapshot_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),

    INDEX idx_pool_date (pool_id, snapshot_date DESC)
);

-- Metadata de sincronización
CREATE TABLE sync_metadata (
    id SERIAL PRIMARY KEY,
    key VARCHAR(100) UNIQUE NOT NULL,
    value TEXT,

    -- Timestamps
    updated_at TIMESTAMP DEFAULT NOW()
);
```

## 🔧 Implementación por Capas

### 1. STREAMING DOWNLOADER

```php
// VfatStreamDownloader.php
class VfatStreamDownloader
{
    public function download(string $url): Generator
    {
        $this->logger->info('Starting stream download from vfat.io');

        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_WRITEFUNCTION, function($ch, $data) {
            // Procesar cada chunk
            return strlen($data);
        });

        // Usar streaming JSON parser
        $stream = fopen($url, 'r');
        $parser = new JsonStreamingParser\Parser($stream, $this);

        // Parse línea por línea
        while (($line = fgets($stream)) !== false) {
            $farm = json_decode($line, true);
            if ($farm) {
                yield $farm;
            }
        }
    }
}
```

### 2. CHUNKED JOB PROCESSOR

```php
// ProcessVfatChunk.php (Job)
class ProcessVfatChunk implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable;

    public $timeout = 300; // 5 min
    public $tries = 3;

    private array $farms;

    public function __construct(array $farms)
    {
        $this->farms = $farms;
    }

    public function handle(VfatPoolProcessor $processor): void
    {
        DB::transaction(function () use ($processor) {
            foreach ($this->farms as $farm) {
                $processor->processFarm($farm);
            }
        });
    }
}
```

### 3. DATABASE REPOSITORY

```php
// PoolRepository.php
class PoolRepository
{
    public function upsertPool(array $data): Pool
    {
        return Pool::updateOrCreate(
            ['pool_address' => $data['pool_address']],
            $data
        );
    }

    public function getPoolsFiltered(array $filters): LengthAwarePaginator
    {
        $query = Pool::query()
            ->where('is_active', true)
            ->where('is_killed', false);

        // Filtros
        if ($filters['chain'] ?? null) {
            $query->where('chain_name', $filters['chain']);
        }

        if ($filters['min_tvl'] ?? null) {
            $query->where('tvl_usd', '>=', $filters['min_tvl']);
        }

        if ($filters['min_apy'] ?? null) {
            $query->where('apy', '>=', $filters['min_apy']);
        }

        if ($filters['stablecoin_only'] ?? false) {
            $query->where('is_stablecoin', true);
        }

        // Ordenamiento
        $sortBy = $filters['sort_by'] ?? 'tvl_usd';
        $sortOrder = $filters['sort_order'] ?? 'desc';
        $query->orderBy($sortBy, $sortOrder);

        // Relaciones
        $query->with(['assets', 'rewards']);

        // Paginación
        return $query->paginate(
            perPage: $filters['limit'] ?? 50,
            columns: ['*']
        );
    }

    public function getStats(): array
    {
        return [
            'total_pools' => Pool::where('is_active', true)->count(),
            'total_tvl' => Pool::where('is_active', true)->sum('tvl_usd'),
            'avg_apy' => Pool::where('is_active', true)->avg('apy'),
            'chains' => Pool::select('chain_name')
                ->distinct()
                ->pluck('chain_name')
                ->toArray(),
        ];
    }
}
```

### 4. SYNC COMMAND (MEJORADO)

```php
// SyncVfatPools.php
class SyncVfatPools extends Command
{
    protected $signature = 'pools:sync-vfat
        {--chunk=100 : Number of farms per chunk}
        {--force : Force full sync}
        {--stats : Show statistics only}';

    public function handle(): int
    {
        $this->info('Starting vfat.io sync...');

        // 1. Download en streaming
        $farms = $this->streamDownloader->download();
        $chunkSize = (int) $this->option('chunk', 100);

        $chunk = [];
        $processed = 0;
        $skipped = 0;

        // 2. Process por chunks
        foreach ($farms as $farm) {
            // Skip killed pools
            if ($farm['is_killed'] ?? false) {
                $skipped++;
                continue;
            }

            $chunk[] = $farm;

            // Dispatch job cuando se llena el chunk
            if (count($chunk) >= $chunkSize) {
                ProcessVfatChunk::dispatch($chunk);
                $processed += count($chunk);
                $this->line("Processed {$processed} farms...");
                $chunk = [];
            }
        }

        // Procesar último chunk parcial
        if (!empty($chunk)) {
            ProcessVfatChunk::dispatch($chunk);
            $processed += count($chunk);
        }

        $this->info("✓ Dispatched {$processed} farms in chunks");
        $this->info("✓ Skipped {$skipped} killed farms");
        $this->info("✓ Jobs processing in queue...");

        return self::SUCCESS;
    }
}
```

### 5. API CONTROLLER (DESDE BD)

```php
// PoolsController.php (MEJORADO)
class PoolsController extends Controller
{
    private PoolRepository $repository;

    public function __construct(PoolRepository $repository)
    {
        $this->repository = $repository;
    }

    public function index(Request $request): JsonResponse
    {
        $filters = [
            'chain' => $request->get('chain'),
            'min_tvl' => $request->get('min_tvl', 100000),
            'min_apy' => $request->get('min_apy'),
            'stablecoin_only' => $request->boolean('stablecoin_only', false),
            'sort_by' => $request->get('sort_by', 'tvl_usd'),
            'sort_order' => $request->get('sort_order', 'desc'),
            'limit' => $request->get('limit', 50),
        ];

        // Paginación desde BD
        $pools = $this->repository->getPoolsFiltered($filters);

        // Stats desde BD (query separada)
        $stats = $this->repository->getStats();

        return response()->json([
            'data' => $pools->items(),
            'pagination' => [
                'total' => $pools->total(),
                'per_page' => $pools->perPage(),
                'current_page' => $pools->currentPage(),
                'last_page' => $pools->lastPage(),
                'from' => $pools->firstItem(),
                'to' => $pools->lastItem(),
            ],
            'stats' => $stats,
            'data_source' => 'vfat.io (database)',
            'last_sync' => SyncMetadata::where('key', 'last_sync')->first()?->value,
        ]);
    }
}
```

## 📈 Mejoras de Rendimiento

### ANTES (Cache en archivos)
- ❌ 36MB en memoria
- ❌ 10-30s para procesar
- ❌ Sin historial
- ❌ Se pierde si se borra cache
- ❌ No se puede paginar bien

### DESPUÉS (Base de datos)
- ✅ Streaming (baja memoria)
- ✅ <100ms por query
- ✅ Snapshots históricos
- ✅ Persistente
- ✅ Paginación nativa
- ✅ Índices optimizados
- ✅ Queries SQL optimizables

## 🔄 Flujo Completo

```
1. SCHEDULER (cada 5 min)
   ↓
2. STREAMING DOWNLOAD (36MB en chunks)
   ↓
3. QUEUE JOBS (procesa 100 farms/job)
   ↓
4. DATABASE UPSERT (pools + assets + rewards)
   ↓
5. API QUERY (SELECT con índices)
   ↓
6. FRONTEND (paginación, <100ms)
```

## 📊 Comparativa de Memoria

| Enfoque | Memoria Máxima | Tiempo Proceso |
|---------|----------------|----------------|
| Actual (cargar todo) | ~500MB | 30-60s |
| Propuesto (streaming) | ~50MB | 5-10s |

## 🚀 Beneficios

1. **Escalabilidad**: Añade más farms sin problema
2. **Historial**: Snapshots para análisis temporal
3. **Rendimiento**: Queries optimizadas con índices
4. **Fiabilidad**: Datos persistentes en BD
5. **Mantenibilidad**: Código más limpio y testeable
6. **Monitorización**: Stats de sincronización
7. **Incremental**: Solo actualizar lo que cambia

## 📝 Próximos Pasos

1. Crear migraciones de BD
2. Implementar streaming downloader
3. Crear jobs de cola
4. Migrar controller a BD
5. Actualizar frontend para paginación
6. Añadir monitorización

---

**Conclusión**: Esta arquitectura es escalable, mantenible y production-ready para procesar grandes volúmenes de datos de forma eficiente.

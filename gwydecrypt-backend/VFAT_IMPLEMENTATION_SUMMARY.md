# 🎯 IMPLEMENTACIÓN VFAT - RESUMEN ACTUALIZADO

## ✅ ARCHIVOS CREADOS

### 1. Migraciones de Base de Datos
- `database/migrations/2025_03_03_160000_add_pool_type_to_pools.php`
  - Añade campo `pool_type` ENUM('pool', 'farm', 'inactive')

- `database/migrations/2025_03_03_160001_create_user_positions_table.php`
  - Tabla para posiciones de usuario en pools/farms

- `database/migrations/2026_03_03_230719_add_user_id_to_user_positions_table.php`
  - Añade `user_id` a la tabla `user_positions`
  - Relaciona posiciones con usuarios existentes

### 2. Modelos Actualizados
- `app/Models/Pool.php`
  - Añadidos scopes: `byType()`, `farms()`, `pools()`

- `app/Models/UserPosition.php` (NUEVO)
  - Modelo para posiciones de usuario
  - Relaciones con Pool y User
  - Scopes: `forWallet()`, `forUser()`, `recentlySynced()`

### 3. Servicios
- `app/Services/VfatUserPositionsService.php` (NUEVO)
  - `fetchUserPositions()` - Obtiene posiciones desde info-api.vf.at
  - `syncUserPositions()` - Sincroniza con BD (acepta user_id opcional)
  - `getUserStats()` - Estadísticas por usuario
  - `getStatsByWallet()` - Estadísticas por wallet (para CLI)

### 4. Comandos
- `app/Console/Commands/SyncVfatPools.php` (MODIFICADO)
  - Ahora incluye reclasificación automática basada en rewards de la BD
  - El método `reclassifyPoolTypes()` se ejecuta después de cada sync
  - `determinePoolType()` determina el tipo basándose en rewards_per_second y apy_reward

- `app/Console/Commands/ReclassifyPoolTypes.php` (NUEVO)
  - Comando: `php artisan pools:reclassify-types`
  - Reclasifica todos los pools basándose en rewards de la BD

- `app/Console/Commands/SyncVfatUserPositions.php` (NUEVO)
  - Comando: `php artisan vfat:sync-positions {wallet_address}`
  - Sincroniza posiciones de una wallet específica

### 5. Controladores
- `app/Http/Controllers/Api/VfatController.php` (NUEVO)
  - `farms()` - GET /api/vfat/farms (solo farms con rewards)
  - `pools()` - GET /api/vfat/pools (todos o solo pools sin rewards)
  - `yield()` - GET /api/vfat/yield (alias de farms)
  - `userPositions()` - GET /api/vfat/user/positions
    - **Automáticamente obtiene posiciones de todas las wallets del usuario autenticado**
  - `syncUserPositions()` - POST /api/vfat/user/positions/sync
    - **Sincroniza posiciones de todas las wallets del usuario autenticado**
  - `chains()` - GET /api/vfat/chains

### 6. Repositorio
- `app/Repositories/PoolRepository.php` (MODIFICADO)
  - Añadido filtro `pool_type` en `applyFilters()`

---

## 🚀 PASOS PARA PONER EN MARCHA

### Paso 1: Ejecutar migraciones (YA HECHO)
```bash
cd gwydecrypt-backend
php artisan migrate
```

Esto creó:
- Campo `pool_type` en tabla `pools`
- Nueva tabla `user_positions`
- Campo `user_id` en tabla `user_positions`

### Paso 2: Re-sincronizar pools (YA HECHO)
```bash
# Sincronizar todos los pools
php artisan pools:sync-vfat --force

# O reclasificar manualmente
php artisan pools:reclassify-types
```

Resultado:
- **561 Farms** (con rewards activos)
- **1,976 Pools** (sin rewards, solo liquidity)
- **9 Inactive** (killed)

### Paso 3: Probar endpoints de posiciones

```bash
# Obtener posiciones del usuario autenticado
curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:8000/api/vfat/user/positions

# Sincronizar posiciones del usuario autenticado
curl -X POST \
     -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:8000/api/vfat/user/positions/sync
```

**Importante:** Los endpoints de posiciones usan **las wallets del usuario autenticado**. No es necesario especificar la dirección de wallet.

---

## 📊 DIFERENCIAS FARMS vs POOLS

### FARMS (`pool_type = 'farm'`)
- ✅ Tienen rewards activos en la BD (`rewards_per_second > 0` o `apy_reward > 0`)
- ✅ Incentivados para proveer liquidity
- ✅ Usuario gana tokens extra por depositar
- ✅ APY incluye parte de reward
- Endpoint: `/api/vfat/farms`
- Total: **561 farms**

### POOLS (`pool_type = 'pool'`)
- ✅ Solo liquidity (sin rewards)
- ✅ No hay incentivos adicionales
- ✅ Solo ganancias de trading fees (base APY)
- ✅ APY reward = 0%
- Endpoint: `/api/vfat/pools`
- Total: **1,976 pools**

### INACTIVE (`pool_type = 'inactive'`)
- ❌ Marcados como `is_killed = true`
- ❌ Ya no están disponibles
- Se excluyen de los endpoints por defecto
- Total: **9 pools**

---

## 📡 ENDPOINTS DISPONIBLES

### Públicos (no requieren autenticación)

| Endpoint | Descripción | Filtro |
|----------|-------------|--------|
| `GET /api/vfat/farms` | Farms con rewards | `pool_type='farm'` |
| `GET /api/vfat/pools` | Todos los pools | Todos por defecto |
| `GET /api/vfat/pools?simple_only=true` | Solo pools sin rewards | `pool_type='pool'` |
| `GET /api/vfat/yield` | Alias de farms | `pool_type='farm'` |
| `GET /api/vfat/chains` | Chains disponibles | - |

### Requieren autenticación (usan wallets del usuario)

| Endpoint | Descripción | Funcionamiento |
|----------|-------------|----------------|
| `GET /api/vfat/user/positions` | Posiciones del usuario | Obtiene posiciones de **todas las wallets activas** del usuario autenticado |
| `POST /api/vfat/user/positions/sync` | Sincronizar posiciones | Sincroniza **todas las wallets activas** del usuario autenticado |

**Nota:** El usuario debe tener wallets activas en la tabla `wallets`. Las posiciones se agrupan por wallet_address.

---

## 🔍 CÓMO FUNCIONA LA INTEGRACIÓN CON WALLETS

### Estructura de Wallests

El sistema usa la tabla `wallets` existente:
- `user_id` - ID del usuario dueño de la wallet
- `address` - Dirección de la wallet (ej: 0x123...)
- `chain` - Blockchain (eth, polygon, etc.)
- `label` - Etiqueta personalizada
- `is_active` - Si la wallet está activa

### Flujo de Posiciones de Usuario

1. **Usuario autenticado** hace request a `/api/vfat/user/positions`
2. **Sistema obtiene** todas las wallets activas del usuario: `$user->wallets()->where('is_active', true)`
3. **Sistema busca** posiciones en `user_positions` donde `user_id = $user->id`
4. **Sistema retorna** posiciones agrupadas por wallet

### Sincronización de Posiciones

1. **POST** a `/api/vfat/user/positions/sync`
2. **Sistema obtiene** todas las wallets activas del usuario
3. **Por cada wallet:**
   - Llama a `https://info-api.vf.at/open-positions-v2?admin_address={wallet_address}`
   - Guarda posiciones en `user_positions` con `user_id` y `wallet_address`
4. **Retorna** resumen con resultados por wallet

---

## 🔍 CÓMO FUNCIONA LA CLASIFICACIÓN

### Importante: La clasificación se basa en datos de la BD, no del API

El API de vfat.io (`https://info-api.vf.at/get-farms`) **NO** incluye el array de rewards para los farms con TVL alto. Por eso:

1. **Durante el sync:**
   - Se descargan todos los farms/pools del API
   - Se guardan con el `pool_type` existente (o 'pool' por defecto)
   - Se sincronizan los rewards en la tabla `pool_rewards`

2. **Después del sync (automático):**
   - Se reclasifican TODOS los pools basándose en los rewards de la BD
   - Si `rewards_per_second > 0` o `apy_reward > 0` → **FARM**
   - Si no tiene rewards → **POOL**
   - Si `is_killed = true` → **INACTIVE**

---

## 🧪 TESTING

### Test 1: Ver clasificación de pools
```bash
# Ver distribución de tipos
php artisan tinker
>>> App\Models\Pool::where('pool_type', 'farm')->count();  // 561
>>> App\Models\Pool::where('pool_type', 'pool')->count();  // 1976
>>> App\Models\Pool::where('pool_type', 'inactive')->count();  // 9
```

### Test 2: Ver endpoints API (públicos)
```bash
# Probar endpoint de farms
curl http://localhost:8000/api/vfat/farms | python -m json.tool | head -50

# Probar endpoint de pools
curl http://localhost:8000/api/vfat/pools | python -m json.tool | head -50
```

### Test 3: Ver endpoints de usuario (requiere token)
```bash
# Primero obtén un token con login
TOKEN=$(curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@gwydecrypt.com","password":"password"}' \
  | jq -r '.token')

# Obtener posiciones del usuario
curl -H "Authorization: Bearer $TOKEN" \
     http://localhost:8000/api/vfat/user/positions

# Sincronizar posiciones
curl -X POST \
     -H "Authorization: Bearer $TOKEN" \
     http://localhost:8000/api/vfat/user/positions/sync
```

### Test 4: Sincronizar posiciones por wallet (CLI)
```bash
# Sincronizar una wallet específica (útil para testing)
php artisan vfat:sync-positions 0x5839b07cED12823B88b70F9d562B8118560A1175
```

---

## 📈 ESTADÍSTICAS ACTUALES

```
Total pools: 2,546
├── Farms: 561 (22%)
├── Pools: 1,976 (78%)
└── Inactive: 9 (0.35%)

Total TVL: $1.49B
├── Farms: $272M (18%)
└── Pools: $1.22B (82%)

Pools con rewards en BD: 568
Pools con apy_reward > 0: 564
```

---

## 📋 PRÓXIMOS PASOS OPCIONALES

1. ✅ **Ejecutar migraciones** - COMPLETADO
2. ✅ **Sincronizar pools** - COMPLETADO
3. ✅ **Clasificar farms/pools** - COMPLETADO
4. ✅ **Integrar con wallets existentes** - COMPLETADO
5. ⏳ **Probar endpoints de usuario** - PENDIENTE
6. ⏳ **Frontend integration** - PENDIENTE
7. ⏳ **Scheduler configuration** - Opcional (sync automático de posiciones)

---

## 🔧 COMANDOS ÚTILES

```bash
# Sincronizar pools (automático via cron o scheduler)
php artisan pools:sync-vfat

# Forzar sync (ignora cache de tiempo)
php artisan pools:sync-vfat --force

# Sync solo pools con TVL alto
php artisan pools:sync-vfat --min-tvl=100000

# Reclasificar tipos manualmente
php artisan pools:reclassify-types

# Sincronizar posiciones de una wallet específica
php artisan vfat:sync-positions 0x5839b07cED12823B88b70F9d562B8118560A1175
```

---

## 📄 RESPUESTA DE EJEMPLO - User Positions

```json
{
  "positions": [
    {
      "id": 1,
      "wallet_address": "0x5839b07cED12823B88b70F9d562B8118560A1175",
      "pool": {
        "id": 123,
        "name": "PancakeSwap - UNI-V3",
        "protocol": "PancakeSwap",
        "chain": "BSC",
        "pool_type": "farm",
        "tvl_usd": 37688135.00,
        "apy": 38.28,
        "apy_base": 32.60,
        "apy_reward": 5.68
      },
      "user_balance": "1000000000000000000",
      "user_balance_usd": 1234.56,
      "pool_share": 0.0003,
      "user_tokens": [...],
      "pending_rewards": [...]
    }
  ],
  "positions_by_wallet": {
    "0x5839...": {
      "count": 5,
      "total_value_usd": 15000.00
    }
  },
  "stats": {
    "total_positions": 5,
    "total_value_usd": 15000.00,
    "wallets_checked": 2,
    "wallets_with_positions": 1
  },
  "last_sync_at": "2026-03-03T23:30:00Z",
  "data_source": "vfat.io (open-positions-v2)"
}
```

---

¿Quieres que pruebe los endpoints de posiciones de usuario o prefieres que prepare algo para el frontend?

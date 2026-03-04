# vfat.io Integration - Guía de Uso

## Resumen

Se ha integrado exitosamente la API de **vfat.io** (https://info.vf.at/) para reemplazar DefiLlama en el tracking de pools de liquidez y farming.

## Estadísticas Actuales

- **16,154 farms** monitorizados
- **34 chains** soportadas
- **48 protocolos**: Uniswap V4, Uniswap, PancakeSwap, Aerodrome, Velodrome, etc.
- **1,413 pools** con TVL > $100k
- **$2.02 billones** en TVL total

## Arquitectura

La integración usa un approach de **cache + scheduler** para evitar problemas de memoria:

1. **Comando Artisan**: `php artisan pools:fetch-vfat`
   - Descarga los 36MB de datos de vfat.io
   - Procesa y filtra pools (TVL > $100k)
   - Almacena en cache por chain
   - Se ejecuta automáticamente cada 5 minutos

2. **API Endpoints**:
   - Leen de cache (no descargan datos en cada petición)
   - Filtran por chain, TVL, límite
   - Devuelven datos normalizados

## Uso

### Ejecución Manual del Comando

```bash
# Fetch pools (normal)
php artisan pools:fetch-vfat

# Forzar actualización (incluso si hay datos recientes)
php artisan pools:fetch-vfat --force
```

### API Endpoints

```bash
# Listado general (por defecto: min TVL $100k, max 100 pools)
curl "http://localhost:8000/api/pools"

# Filtrar por chain
curl "http://localhost:8000/api/pools?chain=Base"

# Cambiar límite de pools
curl "http://localhost:8000/api/pools?limit=20"

# Filtrar por TVL mínimo
curl "http://localhost:8000/api/pools?min_tvl=500000"

# Combinar filtros
curl "http://localhost:8000/api/pools?chain=Ethereum&limit=10&min_tvl=1000000"

# Top pools por APY
curl "http://localhost:8000/api/pools/top?limit=20"

# Chains disponibles
curl "http://localhost:8000/api/pools/chains"

# Detalle de pool específico
curl "http://localhost:8000/api/pools/0x88e6a0c2ddd26feeb64f039a2c41296fcb3f5640"
```

### Ejemplos de Respuestas

```json
{
  "pools": [
    {
      "chain": "Ethereum",
      "chain_id": 1,
      "project": "Uniswap",
      "symbol": "UNI-V3",
      "name": "Uniswap - UNI-V3",
      "tvlUsd": 50812725.61,
      "apy": 53.0,
      "apyBase": 53.0,
      "apyReward": 0.0,
      "stablecoin": false,
      "ilRisk": "medium",
      "exposure": "USDC, WETH",
      "pool": "0x88e6a0c2ddd26feeb64f039a2c41296fcb3f5640",
      "pool_metadata": {
        "farm_address": "0x88e6a0c2ddd26feeb64f039a2c41296fcb3f5640",
        "farm_type": "UNISWAP_V3",
        "pool_symbol": "UNI-V3",
        "pool_is_stable": false,
        "pool_fee": "500",
        "protocol_url": "https://app.uniswap.org"
      },
      "underlyingTokens": [
        "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
        "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2"
      ],
      "underlying_assets": [...],
      "rewards": [],
      "reward_tokens": []
    }
  ],
  "stats": {
    "total_pools": 5,
    "total_tvl": 150234932.45,
    "avg_apy": 35.67,
    "best_apy": {
      "name": "Uniswap - UNI-V3",
      "apy": 97.53,
      "chain": "Ethereum"
    },
    "highest_tvl": {
      "name": "Aerodrome - UNI-V3",
      "tvlUsd": 50812725.61,
      "chain": "Ethereum"
    }
  },
  "by_chain": {
    "Ethereum": {
      "count": 3,
      "total_tvl": 120000000.00,
      "avg_apy": 45.23
    }
  },
  "data_source": "vfat.io",
  "last_update": "2026-03-03T10:54:00Z"
}
```

## Configuración

### Cache (Archivo)

El cache usa el driver de archivos para evitar problemas de codificación con PostgreSQL:

```
CACHE_DRIVER=file
CACHE_STORE=file
```

Ubicación: `storage/framework/cache/data/`

### Memory Limit

El límite de memoria de PHP está configurado en `bootstrap/app.php`:

```php
ini_set('memory_limit', '512M');
```

### Scheduler

El comando se ejecuta automáticamente cada 5 minutos (configurado en `routes/console.php`):

```php
Schedule::command('pools:fetch-vfat')
    ->everyFiveMinutes()
    ->description('Fetch pools from vfat.io API')
    ->withoutOverlapping();
```

## Mantenimiento

### Verificar Estado del Cache

```bash
php artisan tinker
>>> cache()->get('vfat:pools:last_update')
=> "2026-03-03T10:54:00Z"
>>> cache()->get('vfat:pools:stats')
=> [
    "total_pools" => 1413,
    "total_tvl" => 2019082683.18,
    "chains" => ["Ethereum", "BSC", "Base", ...]
  ]
```

### Limpiar Cache

```bash
# Limpiar todo el cache
php artisan cache:clear

# Limpiar solo pools
php artisan cache:forget 'vfat:pools:*'
```

### Logs de Errores

```bash
# Ver logs de Laravel
tail -f storage/logs/laravel.log

# Buscar errores de vfat
grep "vfat" storage/logs/laravel.log
```

## Rendimiento

- **Tiempo de descarga inicial**: 30-60 segundos
- **Tiempo de procesamiento**: 20-30 segundos
- **Tiempo de respuesta API**: <100ms (desde cache)
- **Uso de memoria del comando**: ~200-300MB
- **Tamaño del cache**: ~10MB (serializado)

## Chains Soportadas

Las chains principales soportadas incluyen:
- Ethereum
- BSC (BNB Chain)
- Polygon
- Arbitrum
- Optimism
- Base
- Avalanche
- Linea
- Celo
- Moonbeam
- Y más de 20 chains adicionales

## Troubleshooting

### Error: "No pool data available"

**Causa**: El cache está vacío o expiró.

**Solución**:
```bash
php artisan pools:fetch-vfat
```

### Error: "Allowed memory size exhausted"

**Causa**: El límite de memoria de PHP es demasiado bajo.

**Solución**:
```bash
# Verificar límite actual
php -i | grep memory_limit

# Aumentar en bootstrap/app.php
ini_set('memory_limit', '1G');  // Si 512MB no es suficiente
```

### Error: "Connection timeout"

**Causa**: La API de vfat.io está tardando demasiado en responder.

**Solución**:
- Verificar conexión a internet
- Intentar de nuevo más tarde
- Verificar estado de https://info.vf.at/

### Los datos no se actualizan

**Causa**: El scheduler no está corriendo.

**Solución**:
```bash
# Ejecutar scheduler manualmente
php artisan schedule:work

# O ejecutar el comando directamente
php artisan pools:fetch-vfat --force
```

## Comparación con DefiLlama

| Característica | vfat.io | DefiLlama |
|----------------|---------|-----------|
| Pools totales | 16,154 farms | ~5,000 pools |
| Chains | 34 | ~100 |
| Protocolos | 48 | ~200 |
| Granularidad | Muy alta (NFT manager, rewards) | Media |
| Frecuencia actualización | Tiempo real | ~5-10 min |
| Tamaño datos | 36MB | ~5MB |
| APY cálculo | Fees + Rewards | ApyBase + ApyReward |

## Próximos Pasos (Opcionales)

1. **Implementar persistencia en BD**: Guardar pools en tabla dedicada
2. **Añadir más métricas**: Volume, fees históricos, etc.
3. **Alertas**: Notificar cuando APY cambie significativamente
4. **Comparador**: Comparar pools lado a lado
5. **Exportar datos**: CSV, JSON para análisis externo

## Soporte

- **vfat.io Web**: https://info.vf.at/
- **vfat.io API**: https://info-api.vf.at/get-farms
- **Documentación Laravel**: https://laravel.com/docs

## Cambios Realizados

1. ✅ Creado `VfatService` para integración con API
2. ✅ Actualizado `PoolsController` para usar vfat.io
3. ✅ Creado comando `pools:fetch-vfat` Artisan
4. ✅ Configurado scheduler automático (cada 5 min)
5. ✅ Migrado cache a archivos (evita encoding issues)
6. ✅ Aumentado límite de memoria a 512MB
7. ✅ Creado migración `pool_metadata` table
8. ✅ Añadido endpoint de debug `/api/test-vfat`

---
**Fecha de integración**: 2026-03-03
**Versión**: Laravel 12
**Estado**: ✅ Production Ready

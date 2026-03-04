# Gestión de API Keys en GwydeCrypt

## ⚠️  IMPORTANTE: API Keys NO van en .env

Las API keys **NO se configuran en el archivo `.env`**, se gestionan dinámicamente desde el **Panel de Administración** del backend.

## 🎯 ¿Por qué este enfoque?

1. **Flexibilidad**: Puedes cambiar API keys sin reiniciar el servidor
2. **Seguridad**: Las API keys se guardan **encriptadas** en la base de datos
3. **Multi-tenant**: Cada aplicación puede tener sus propias API keys
4. **Rotación**: Puedes rotar API keys fácilmente desde el panel admin
5. **Testing**: Puedes deshabilitar providers temporalmente sin modificar código

## 📋 API Keys Configurables

### ✅ No Requieren API Key (Free Tier)

1. **CoinGecko** - Funciona sin API key (limitado pero suficiente para empezar)
2. **Jupiter** - No requiere API key (100 requests/minuto gratis)

### 🔑 Requieren API Key (Opcional)

3. **Zerion** - Requiere API key para tokens DeFi
   - Obtener en: https://zerion.io/developers
   - Se añade desde el panel admin

## 🔧 Cómo Configurar API Keys desde el Panel Admin

### Paso 1: Iniciar Sesión como Admin

```bash
# Usuario admin por defecto
Email: admin@gwydecrypt.com
Password: password
```

### Paso 2: Añadir API Key de Zerion

```bash
# POST http://localhost:8000/api/admin/providers
# Header: Authorization: Bearer {tu_token}

Body:
{
  "name": "zerion",
  "base_url": "https://api.zerion.io/v1",
  "api_key": "tu_zerion_api_key_aqui",
  "is_active": true,
  "priority": 2,
  "rate_limit_per_minute": 100,
  "rate_limit_per_day": 10000
}
```

### Paso 3: Actualizar API Key Existente

```bash
# PUT http://localhost:8000/api/admin/providers/{provider_id}
# Header: Authorization: Bearer {tu_token}

Body:
{
  "api_key": "nueva_api_key_aqui"
}
```

### Paso 4: Verificar que Funciona

```bash
# Ver el provider
GET http://localhost:8000/api/admin/providers/{id}

# Ver estadísticas
GET http://localhost:8000/api/admin/providers/{id}/success-rate?days=7

# Ver logs de errores
GET http://localhost:8000/api/admin/providers/{id}/failed-fetches
```

## 📊 Flujo Completo de Gestión

### 1. Instalación Inicial

```bash
# 1. Ejecutar seeders
php artisan db:seed

# 2. Verificar providers creados
php artisan tinker
>>> App\Models\ApiProvider::all()->toArray();
```

### 2. Proveedores por Defecto Creados

```
✅ CoinGecko
   - API Key: null (no necesita)
   - Estado: Activo
   - Prioridad: 1 (primario)

⚠️  Zerion
   - API Key: null (PENDIENTE DE AÑADIR DESDE PANEL)
   - Estado: Inactivo
   - Prioridad: 2 (secundario)

✅ Jupiter
   - API Key: null (no necesita)
   - Estado: Activo
   - Prioridad: 3 (terciario para Solana)
```

### 3. Activar Zerion con API Key

```bash
# Usando cURL
curl -X PUT http://localhost:8000/api/admin/providers/{zerion_id} \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "api_key": "tu_zerion_api_key",
    "is_active": true
  }'

# Usando Postman/Insomnia
# PUT http://localhost:8000/api/admin/providers/{zerion_id}
# Headers:
#   Authorization: Bearer {token}
# Body (raw JSON):
{
  "api_key": "tu_api_key_aqui",
  "is_active": true
}
```

### 4. El Sistema Automáticamente

1. **Encripta** la API key en la base de datos
2. **Desencripta** cuando la necesita
3. **Usa** la API key para hacer requests
4. **Loguea** success/failure de cada request

## 🔐 Seguridad de las API Keys

### Encriptación en Base de Datos

```php
// Al guardar (Modelo ApiProvider)
public function setApiKeyAttribute($value)
{
    $this->attributes['api_key'] = $value ? encrypt($value) : null;
}

// Al leer
public function getDecryptedApiKeyAttribute(): ?string
{
    return $this->api_key ? decrypt($this->api_key) : null;
}
```

### En la Base de Datos (PostgreSQL)

```sql
-- La API key se guarda encriptada
SELECT id, name, api_key FROM api_providers;

-- Resultado:
-- id                                | name    | api_key
-- -----------------------------------+---------+--------------------------
-- 550e8400-e29b-41d4-a716-446655440000 | zerion  | eyJpdi...
--                                      (encriptado)
```

### En las Respuestas API

```json
// GET /api/admin/providers
{
  "providers": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "zerion",
      "base_url": "https://api.zerion.io/v1",
      "api_key": "********",  // ⚠️  OCULTA en respuestas
      "is_active": true,
      "priority": 2
    }
  ]
}
```

## 🔄 Rotación de API Keys

Si necesitas cambiar una API key:

### Opción 1: Actualizar API Key Existente

```bash
PUT /api/admin/providers/{provider_id}
{
  "api_key": "nueva_api_key"
}
```

### Opción 2: Crear Nuevo Provider y Eliminar Antiguo

```bash
# 1. Crear nuevo con nueva key
POST /api/admin/providers
{
  "name": "zerion",
  "base_url": "https://api.zerion.io/v1",
  "api_key": "nueva_api_key",
  "is_active": true,
  "priority": 2
}

# 2. Eliminar antiguo (opcional)
DELETE /api/admin/providers/{old_provider_id}
```

## ⚙️ Configuración Inicial Recomendada

### Para Desarrollo (Gratis)

```bash
# Solo configura los providers que no necesitan API key:
✅ CoinGecko (free tier)
✅ Jupiter (free tier)

# Zerion déjalo inactivo hasta que tengas API key
```

### Para Producción

```bash
# 1. Obtén API keys:
# - CoinGecko Pro (opcional, para más rate limit)
# - Zerion (requerido para DeFi completo)
# - Infura/Alchemy para Ethereum RPC
# - Quicknode para Solana RPC

# 2. Añádelas desde el panel admin
# 3. Active los providers que necesites
# 4. Configura prioridades (1 = primario, 2 = secundario, etc)
```

## 📝 Ejemplo Completo de Uso

### Escenario: Añadir Zerion API Key

```bash
# 1. Login
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@gwydecrypt.com","password":"password"}'

# Response: {"token":"santum_token_here"}

# 2. Obtener ID del provider Zerion
curl -X GET http://localhost:8000/api/admin/providers \
  -H "Authorization: Bearer santum_token_here"

# 3. Actualizar Zerion con API key
curl -X PUT http://localhost:8000/api/admin/providers/{zerion_id} \
  -H "Authorization: Bearer santum_token_here" \
  -H "Content-Type: application/json" \
  -d '{
    "api_key": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "is_active": true
  }'

# 4. Verificar que funciona
curl http://localhost:8000/api/admin/providers/{zerion_id}/success-rate \
  -H "Authorization: Bearer santum_token_here"

# 5. Ver logs si hay errores
curl http://localhost:8000/api/admin/providers/{zerion_id}/failed-fetches \
  -H "Authorization: Bearer santum_token_here"
```

## ✨ Ventajas de este Sistema

1. ✅ **No reinicios**: Cambia API keys sin `php artisan config:clear`
2. ✅ **Multi-ambiente**: Dev, staging, production con diferentes keys
3. ✅ **Auditoría**: Logs de qué provider se usó y cuándo
4. ✅ **Testing**: Activa/desactiva providers para testing
5. ✅ **Panel visual**: Interfaz gráfica para gestión (cuando exista)
6. ✅ **Seguridad**: API keys encriptadas, ocultas en respuestas

## 🚀 Resumen

- ❌ **NO** uses variables de entorno para API keys
- ✅ **SÍ** gestionalas desde el panel admin (`/api/admin/providers`)
- ✅ **SÍ** se guardan encriptadas en PostgreSQL
- ✅ **SÍ** se pueden rotar dinámicamente

**El backend está diseñado para gestionar API keys dinámicamente sin tocar código ni reiniciar servicios.**

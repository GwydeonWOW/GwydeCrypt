# Configuración de PostgreSQL para GwydeCrypt

## ✅ Verificación de Drivers

El driver de PostgreSQL está **INSTALADO** correctamente:
```
pdo_pgsql → ✅ Disponible
```

## 📋 Pasos para Configurar PostgreSQL

### Opción 1: PostgreSQL en Laragon (Recomendado)

Laragon ya viene con PostgreSQL integrado. Sigue estos pasos:

1. **Abrir Laragon**
2. **Iniciar PostgreSQL**
   - Click en "Start All" o iniciar solo PostgreSQL
3. **Crear Base de Datos**
   - Ve a "Menu" → "PostgreSQL" → "phpPgAdmin"
   - O usa la línea de comandos:

```bash
# Abrir terminal en Laragon (Menu → Laravel Terminal)

# Acceder a PostgreSQL
psql -U postgres

# Crear base de datos
CREATE DATABASE gwydecrypt;

# Verificar que se creó
\l

# Salir
\q
```

### Opción 2: PostgreSQL Standalone

Si tienes PostgreSQL instalado separadamente:

#### Windows
```bash
# Abrir PowerShell o CMD como administrador

# Crear base de datos
createdb -U postgres gwydecrypt

# O usando psql
psql -U postgres -c "CREATE DATABASE gwydecrypt;"
```

#### Linux/Mac
```bash
# Crear base de datos
sudo -u postgres createdb gwydecrypt

# O usando psql
sudo -u postgres psql
CREATE DATABASE gwydecrypt;
\q
```

## 🔧 Configurar Laravel para PostgreSQL

### 1. Editar `.env`

```env
# En la carpeta: C:\laragon\www\gwydecrypt-backend

DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=gwydecrypt
DB_USERNAME=postgres
DB_PASSWORD=

# Si Laragon usa password diferente, verificar:
# Laragon default password: (vacío)
# Si pusiste contraseña al instalar PG, ponerla aquí
```

**IMPORTANTE**: En Laragon, el password de PostgreSQL por defecto es **vacío** (no tiene password).

### 2. Ejecutar Migraciones

```bash
cd C:\laragon\www\gwydecrypt-backend

# Verificar que la conexión funciona
php artisan db:show

# Ejecutar migraciones
php artisan migrate

# Deberías ver:
#   Migrating: 2026_02_14_213359_create_api_providers_table
#   Migrating: 2026_02_14_213434_create_wallets_table
#   ...
#   Migrated:  7 tables successfully ✅
```

### 3. Ejecutar Seeders

```bash
php artisan db:seed

# Deberías ver:
#   API providers seeded successfully.
#   Admin user created (admin@gwydecrypt.com / password)
#   Database seeded successfully!
```

## 🧪 Verificar Instalación

### 1. Ver Tablas Creadas

```bash
# Usando psql
psql -U postgres -d gwydecrypt

# Ver tablas
\dt

# Deberías ver:
# - Schema | Name | Type | Owner
# - public | api_providers | table | postgres
# - public | wallets | table | postgres
# - public | tokens | table | postgres
# - public | wallet_tokens | table | postgres
# - public | price_history | table | postgres
# - public | portfolio_snapshots | table | postgres
# - public | price_fetch_log | table | postgres
# - public | users | table | postgres
# - public | personal_access_tokens | table | postgres
# - public | migrations | table | postgres
# - public | jobs | table | postgres
# - public | cache | table | postgres
# - public | failed_jobs | table | postgres
# - public | sessions | table | postgres

# Salir
\q
```

### 2. Ver Datos Iniciales

```sql
-- Conectarse a la BD
psql -U postgres -d gwydecrypt

-- Verificar providers
SELECT name, is_active, priority FROM api_providers;

-- Deberías ver:
--  coingecko   | t   | 1
--  zerion     | f   | 2
--  jupiter    | t   | 3

-- Verificar admin user
SELECT id, name, email FROM users;

-- Deberías ver:
--  <uuid> | Admin User | admin@gwydecrypt.com

-- Salir
\q
```

## ⚠️ Troubleshooting

### Error: "could not connect to server"

**Problema**: PostgreSQL no está corriendo.

**Solución**:
1. Abre Laragon
2. Click en "Start All" o inicia PostgreSQL manualmente
3. Verifica que el puerto sea 5432

### Error: "password authentication failed"

**Problema**: Password incorrecto en `.env`.

**Solución**:
```env
# En Laragon, el password por defecto es vacío
DB_PASSWORD=

# Si pusiste password al instalar PostgreSQL, cámbialo
DB_PASSWORD=tu_password_real
```

### Error: "database "gwydecrypt" does not exist"

**Problema**: La base de datos no se creó.

**Solución**:
```bash
psql -U postgres -c "CREATE DATABASE gwydecrypt;"
```

### Error: "driver not found" (no debería pasar)

Ya verificamos que **pdo_pgsql está instalado**, así que esto no debería ocurrir.

## 🚀 Una Vez Configurado

Después de configurar PostgreSQL correctamente:

```bash
# Todo debería funcionar:
php artisan migrate        ✅ Crea tablas con UUIDs
php artisan db:seed         ✅ Crea providers y admin
php artisan serve          ✅ Inicia servidor
php artisan queue:work      ✅ Inicia worker
```

## 📚 Comandos Útiles de PostgreSQL

```bash
# Conectarse a la BD
psql -U postgres -d gwydecrypt

# Desde psql:
\dt                    # Listar tablas
\d tabla_nombre         # Ver estructura de tabla
\du                    # Listar usuarios
SELECT * FROM api_providers;  # Consultar datos
\q                     # Salir

# Desde bash (sin entrar a psql):
psql -U postgres -d gwydecrypt -c "SELECT COUNT(*) FROM tokens;"
```

## ✅ Verificación Final

```bash
# Este comando debería mostrar todas las tablas
php artisan db:table

# Y esto debería devolver JSON válido
curl http://localhost:8000/api/market/popular
```

## 🎯 Resumen

1. ✅ **Driver pdo_pgsql INSTALADO**
2. ✅ **Migraciones COMPATIBLES con PostgreSQL** (usan UUID, ENUM, DECIMAL)
3. ✅ **`.env.example` ACTUALIZADO** con configuración PostgreSQL
4. ✅ **Guía completa** para configurar PostgreSQL

**¿Listo para configurar PostgreSQL y probar el backend?**

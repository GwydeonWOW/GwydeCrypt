# GwydeCrypt - Multi-chain DeFi Portfolio Tracker

Sistema completo de seguimiento de portfolios cripto con soporte multi-cadena, integración con VFAT.io para pools de liquidez, y tracking de inversiones/ganancias.

## 🚀 Características Principales

### Backend (Laravel 12/PHP)
- **Multi-chain wallet tracking**: Ethereum, Solana, Polygon, SUI, Optimism, BNB Chain, Arbitrum, BTC
- **Price aggregation**: CoinGecko, Zerion, Jupiter con fallback automático
- **VFAT.io integration**: Sincronización de pools y posiciones de liquidez
- **Investment & Sales tracking**: Registro de inversiones y ventas con cálculo de P&L
- **Admin panel**: Gestión de providers API y tokens
- **Queue-based jobs**: Actualización automática de precios y snapshots
- **PostgreSQL**: Base de datos optimizada

### Frontend (React + TypeScript)
- **Real-time dashboard**: Dashboard con gráficos de precios y portfolio
- **Pool positions monitoring**: Monitoreo de posiciones en pools con detección de rango
- **Auto-refresh system**: Refresco automático cada 15-30 segundos
- **Privacy mode**: Modo privacidad para valores sensibles
- **Mantine UI**: Interfaz moderna con tema oscuro

## 📋 Requisitos Previos

- **PHP**: 8.2+
- **Composer**: 2.x
- **Node.js**: 18+
- **PostgreSQL**: 14+
- **Git**: Para clonar el repositorio

## 🔧 Instalación

### 1. Clonar el Repositorio

```bash
git clone https://github.com/GwydeonWOW/GwydeCrypt.git
cd GwydeCrypt
```

### 2. Configurar Backend

```bash
cd gwydecrypt-backend

# Instalar dependencias
composer install

# Configurar entorno
cp .env.example .env
php artisan key:generate

# Configurar base de datos en .env
# DB_CONNECTION=pgsql
# DB_HOST=127.0.0.1
# DB_PORT=5432
# DB_DATABASE=gwydecrypt
# DB_USERNAME=your_username
# DB_PASSWORD=your_password

# Ejecutar migraciones
php artisan migrate

# Seed de datos (usuario admin por defecto)
php artisan db:seed
```

### 3. Configurar Frontend

```bash
cd gwydecrypt-frontend

# Instalar dependencias
npm install

# Copiar configuración de ejemplo
cp .env.example .env

# Configurar URL del backend si es necesario
# VITE_API_URL=http://127.0.0.1:8000
```

### 4. Iniciar Servicios

**Terminal 1 - Backend:**
```bash
cd gwydecrypt-backend
php artisan serve
# Server corriendo en http://127.0.0.1:8000
```

**Terminal 2 - Frontend:**
```bash
cd gwydecrypt-frontend
npm run dev
# Server corriendo en http://localhost:3000
```

**Terminal 3 - Queue Worker (opcional, para trabajos en background):**
```bash
cd gwydecrypt-backend
php artisan queue:work
```

**Terminal 4 - Scheduler (opcional, para tareas programadas):**
```bash
cd gwydecrypt-backend
php artisan schedule:work
```

### 5. Acceder a la Aplicación

- **Frontend**: http://localhost:3000
- **Backend API**: http://127.0.0.1:8000
- **Usuario Admin**:
  - Email: `admin@gwydecrypt.com`
  - Password: `password` (¡CAMBIAR EN PRODUCCIÓN!)

## 📂 Estructura del Proyecto

```
GwydeCrypt/
├── gwydecrypt-backend/          # Laravel 12 API Backend
│   ├── app/
│   │   ├── Console/Commands/    # Comandos artesanales (sync pools, snapshots)
│   │   ├── Http/Controllers/Api/ # Controladores API
│   │   ├── Models/              # Modelos Eloquent
│   │   ├── Repositories/        # Repositorios de datos
│   │   └── Services/            # Lógica de negocio
│   ├── database/migrations/     # Migraciones de BD
│   ├── routes/api.php          # Rutas API
│   └── .env.example           # Configuración de ejemplo
│
└── gwydecrypt-frontend/         # React + TypeScript Frontend
    ├── src/
    │   ├── api/                # Clientes HTTP (axios)
    │   ├── components/         # Componentes React
    │   │   ├── layout/        # Layout principal (Sidebar, Header)
    │   │   ├── common/        # Componentes comunes
    │   │   └── PoolPositions.tsx # Monitoreo de posiciones
    │   ├── hooks/             # Custom React hooks
    │   ├── pages/             # Páginas de la aplicación
    │   ├── store/             # Zustand state management
    │   └── types/             # TypeScript types
    ├── public/                # Archivos estáticos
    └── .env.example          # Configuración de ejemplo
```

## 🔑 Credenciales por Defecto

⚠️ **IMPORTANTE**: Cambiar estas credenciales antes de usar en producción.

| Rol | Email | Password |
|-----|-------|----------|
| Admin | admin@gwydecrypt.com | password |

## 🌐 APIs Externas Utilizadas

El proyecto se integra con varias APIs externas:

- **CoinGecko**: Precios de tokens (primary)
- **Zerion**: Precios DeFi (secondary)
- **Jupiter**: Precios Solana (tertiary)
- **VFAT.io**: Pools de liquidez y posiciones

Las API keys se configuran a través del panel de admin o en el archivo `.env`:

```env
COINGECKO_API_KEY=tu_key_aqui  # Opcional, para mayor rate limit
ZERION_API_KEY=tu_key_aqui     # Requerido para provider Zerion
```

## 🔄 Sincronización Automática

El sistema tiene varios procesos automáticos:

### Backend Jobs (Queue)
- **Price updates**: Actualización de precios cada minuto
- **Portfolio snapshots**: Snapshots del portfolio cada hora
- **VFAT pools sync**: Sincronización de pools cada 4 horas

### Frontend Auto-refresh
- **Pool positions**: Cada 15 segundos (desde BD)
- **Sync desde vfat.io**: Cada 30 segundos (cuando toggle está ON)
- **Toggle ON/OFF**: Control del auto-sync en "Mis Pools"

## 💡 Funcionalidades Destacadas

### 1. Pool Positions con Monitoreo de Rango

- **Badge "EN RANGO"** (verde): Cuando tienes rewards pendientes
- **Badge "FUERA RANGO"** (rojo): Cuando no estás generando rewards
- **Columna Rewards**: Muestra rewards acumulados sin expandir
- **Auto-sync**: Sincronización cada 30s desde vfat.io
- **Toggle ON/OFF**: Para pausar el auto-sync cuando no estés en pools

### 2. Multi-chain Wallet Management

- Soporte para 8 blockchains diferentes
- Direcciones automáticamente detectadas por chain
- Balance manual para tokens que no se pueden escanear

### 3. Investment & Sales Tracking

- Registro de inversiones con fecha y monto
- Tracking de ventas con cálculo de P&L
- Historial completo de transacciones

### 4. Admin Panel

- **Providers Management**: Activar/desactivar APIs de precios
- **Tokens Management**: Configurar tokens y su visibilidad
- **Users Management**: Aprobar/rechazar usuarios registrados

## 🛠️ Comandos de Consola Útiles

### Backend

```bash
# Sincronizar pools desde VFAT
php artisan pools:sync-vfat

# Crear snapshots del portfolio
php artisan portfolio:snapshots

# Limpiar logs antiguos
php artisan logs:clean

# Test de conexión a APIs
php artisan test:api-providers

# Ver estado de queues
php artisan queue:monitor
```

### Frontend

```bash
# Instalar dependencias
npm install

# Iniciar development server
npm run dev

# Build para producción
npm run build

# Preview de producción
npm run preview

# Lint código
npm run lint
```

## 📊 Base de Datos

### Tablas Principales

- `users` - Usuarios del sistema
- `wallets` - Wallets multi-chain de usuarios
- `tokens` - Tokens soportados
- `token_chains` - Tokens en diferentes chains
- `wallet_tokens` - Balances de tokens en wallets
- `pools` - Pools de liquidez de VFAT.io
- `user_positions` - Posiciones de usuarios en pools
- `investments` - Registro de inversiones
- `sales` - Registro de ventas
- `portfolio_snapshots` - Snapshots históricos del portfolio
- `price_histories` - Historial de precios
- `api_providers` - Configuración de APIs externas

## 🐛 Solución de Problemas

### El frontend no se conecta al backend

Verifica que el backend esté corriendo en el puerto 8000:
```bash
php artisan serve
```

### Error de boolean en PostgreSQL

Asegúrate de haber aplicado los mutadores en los models. Los campos boolean usan strings 'true'/'false' en PostgreSQL.

### Las posiciones no se sincronizan

1. Verifica que la API de VFAT.io esté accesible
2. Revisa los logs: `tail -f storage/logs/laravel.log`
3. Verifica que las credenciales de API estén configuradas

### Auto-refresh no funciona

1. Abre la consola del navegador (F12)
2. Verifica que no haya errores JavaScript
3. Revisa el toggle de Auto-sync en "Mis Pools"

## 📄 Licencia

Este proyecto es de código abierto. Ver archivo LICENSE para más detalles.

## 👥 Contribuir

Las contribuciones son bienvenidas. Por favor:

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/NuevaCaracteristica`)
3. Commit tus cambios (`git commit -m 'Add some NuevaCaracteristica'`)
4. Push a la rama (`git push origin feature/NuevaCaracteristica`)
5. Abre un Pull Request

## 📞 Soporte

Para problemas o preguntas:
- Abre un issue en GitHub
- Revisa la documentación en `CLAUDE.md` y `ARQUITECTURA.md`

---

**Desarrollado con ❤️ usando Laravel 12, React, TypeScript y Mantine**

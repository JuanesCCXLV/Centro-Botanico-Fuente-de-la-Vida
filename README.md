# Centro Botánico Fuente de la Vida

Sitio web de la tienda naturista Centro Botánico Fuente de la Vida (Cali): catálogo público con pedidos por WhatsApp y panel de administración.

**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · Prisma 7 + PostgreSQL · Zod · argon2.

## Requisitos

- Node.js 22 (ver `.nvmrc`)
- Podman con `podman-compose` (o Docker con `docker compose`)

## Puesta en marcha local

```bash
npm ci
cp .env.example .env            # luego cambia ADMIN_EMAIL y ADMIN_PASSWORD
podman-compose up -d            # PostgreSQL en localhost:5232

# Esperar a que Postgres acepte conexiones
until podman exec centro-botanico-fuente-de-la-vida_db_1 pg_isready -U tienda; do sleep 1; done

npx prisma migrate deploy       # crea las tablas
npx prisma db seed              # administrador + datos de ejemplo
npm run dev                     # http://localhost:3000
```

El panel está en `/admin` y el ingreso en `/admin/login`.

**Después de cada `git pull`** que traiga cambios en `prisma/`, ejecuta:

```bash
npm run db:update   # aplica migraciones y regenera el cliente de Prisma
```

y reinicia `npm run dev`.

## Verificación

```bash
npm run lint && npm run typecheck && npm test
```

Pruebas de punta a punta (Playwright), con la base de datos encendida y la semilla aplicada:

```bash
npx playwright install chromium   # solo la primera vez
npm run test:e2e                   # usa ADMIN_EMAIL y ADMIN_PASSWORD de tu .env
npx playwright show-report         # reporte con capturas si algo falla
```

La integración continua (GitHub Actions) ejecuta todo lo anterior, además de `next build`, `npm audit` y gitleaks.

## Arquitectura

Monolito modular por capas; cada capa solo llama a la inmediatamente inferior:

| Capa | Ubicación |
| --- | --- |
| Presentación y Server Actions | `src/app/` |
| Servicios (reglas de negocio) | `src/services/` |
| Acceso a datos (Prisma) | `src/repositories/` |
| Infraestructura (sesión, entorno, utilidades) | `src/lib/` |

La autorización se verifica siempre en el servidor con `requireAdmin()` (`src/lib/sesion.ts`) en cada página y Server Action del panel. `src/proxy.ts` solo hace una redirección optimista cuando no hay cookie de sesión.

## Despliegue

Vercel + Neon + Cloudinary + Cloudflare (solo DNS). Guía paso a paso: [`docs/despliegue.md`](docs/despliegue.md).

## Administradores

Crear cuentas, restablecer contraseñas y desactivar accesos: `npm run admin` (ver [`docs/administradores.md`](docs/administradores.md)).

## Respaldos

Respaldo diario automático, verificado y cifrado con GitHub Actions. La configuración y la restauración están en [`docs/respaldos.md`](docs/respaldos.md).

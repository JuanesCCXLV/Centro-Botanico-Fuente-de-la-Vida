# Guía de despliegue

Cómo publicar el sitio la primera vez (semanas 16–17 del cronograma). Sigue los pasos en orden; cada uno dice qué copiar y dónde pegarlo.

El sitio puede alojarse en **Vercel Pro** (unos $20 USD al mes, la opción probada) o en **Netlify Free** (sin costo, permite uso comercial). Los pasos 0 a 3 y 5 a 8 son iguales; el paso 4 cambia según la plataforma. Antes de elegir Netlify, haz el [despliegue de prueba](#prueba-en-netlify-antes-de-decidir).

**Arquitectura en producción**

```
Visitante → Cloudflare (solo DNS) → Vercel (Next.js, región iad1) → Neon (PostgreSQL, us-east-1)
                                              └→ Cloudinary (imágenes)
```

## 0. Antes de empezar

- **Todas las cuentas van a nombre del cliente**, con un correo del negocio y su tarjeta. El desarrollador entra como invitado.
- **Verificación en dos pasos (2FA) obligatoria** en GitHub, Vercel, Neon, Cloudinary, Cloudflare y el registrador del dominio (Plan de Pruebas, A08).
- Ten a mano un gestor de contraseñas para guardar lo que se genera en esta guía.
- Decide el dominio con el cliente (recomendado: `.com.co`).

## 1. GitHub

1. **Settings → Branches → Add rule** para `main`: exigir *pull request* y que pase el check **CI / verificar** antes de fusionar. Así nada llega a producción sin pruebas.
2. Opcional: hacer el repositorio **privado**. No contiene secretos (lo verifica gitleaks en cada PR), pero privado expone menos. Vercel Pro funciona igual con repositorios privados.

## 2. Neon (base de datos)

1. Crea el proyecto `centro-botanico`: **PostgreSQL 17**, región **AWS US East (N. Virginia)**, la misma zona donde corre Vercel (`iad1`).
2. En **Branches**, crea una rama `preview` a partir de `main`. Los despliegues de vista previa usan esa rama, así nunca tocan los datos reales.
3. Para cada rama (`main` y `preview`) abre **Connect** y copia **dos** cadenas:
   - **Con pool** (el host tiene `-pooler`) → será `DATABASE_URL`.
   - **Directa** (sin `-pooler`) → será `DIRECT_URL`. La usan las migraciones.
4. Para los respaldos, crea un usuario de solo lectura en el editor SQL de la rama `main`:

   ```sql
   CREATE ROLE respaldo WITH LOGIN PASSWORD 'una-clave-larga-y-aleatoria';
   GRANT pg_read_all_data TO respaldo;
   ```

## 3. Cloudinary (imágenes)

1. Crea la cuenta (plan Free).
2. En **Settings → API Keys** copia *Cloud name*, *API Key* y *API Secret*.

## 4A. Vercel (hosting)

1. Crea un equipo con plan **Pro** a nombre del cliente e invita al desarrollador.
2. **Add New → Project → Import** el repositorio de GitHub. Vercel detecta Next.js y toma `vercel.json`:
   - Comando de build: `npm run build:produccion` (genera Prisma, **aplica las migraciones** y compila).
   - Región de las funciones: `iad1`.
3. Antes de desplegar, en **Settings → Environment Variables**:

| Variable | Production | Preview |
|---|---|---|
| `DATABASE_URL` | Neon `main`, **con** `-pooler` | Neon `preview`, **con** `-pooler` |
| `DIRECT_URL` | Neon `main`, directa | Neon `preview`, directa |
| `SITE_URL` | `https://<dominio>` (en el paso 6; mientras tanto, omitirla) | omitir: usa la URL de Vercel |
| `CLOUDINARY_CLOUD_NAME` | de Cloudinary | igual |
| `CLOUDINARY_API_KEY` | de Cloudinary | igual |
| `CLOUDINARY_API_SECRET` | de Cloudinary | igual |

4. **Deploy.** El primer build crea las tablas. Si falta una variable obligatoria, el build se detiene y dice cuál (`Configuración de entorno inválida → …`).

## 4B. Netlify (alternativa sin costo)

1. Crea la cuenta a nombre del cliente (plan **Free**) e invita al desarrollador.
2. **Add new project → Import an existing project →** GitHub → el repositorio. Netlify detecta Next.js y toma `netlify.toml`:
   - Comando de build: `npm run build:produccion` (genera Prisma, **aplica las migraciones** y compila).
   - Node.js 22.
3. **Project configuration → Build & deploy → Functions → Region:** elige **US East (N. Virginia) us-east-1**, junto a Neon. Si no aparece, la más cercana de EE. UU. (Ohio).
4. Antes del primer despliegue, en **Project configuration → Environment variables → Add a variable**, con **"Different value for each deploy context"** y alcance **Builds** y **Functions**:

| Variable | Production | Deploy Previews y Branch deploys |
|---|---|---|
| `DATABASE_URL` | Neon `main`, **con** `-pooler` | Neon `preview`, **con** `-pooler` |
| `DIRECT_URL` | Neon `main`, directa | Neon `preview`, directa |
| `SITE_URL` | `https://<dominio>` (en el paso 6; mientras tanto, omitirla: usa `https://<proyecto>.netlify.app`) | omitir: usa la URL de la vista previa |
| `CLOUDINARY_CLOUD_NAME` | de Cloudinary | igual |
| `CLOUDINARY_API_KEY` | de Cloudinary | igual |
| `CLOUDINARY_API_SECRET` | de Cloudinary | igual |

En `DIRECT_URL` y `DATABASE_URL`, pega solo la URL de PostgreSQL que entrega Neon (`postgresql://…`), sin `psql`, comillas ni el nombre de la variable. Para cada contexto, ambas URLs deben apuntar a la misma base de datos, una directa y la otra con pool.

5. **Deploy.** Si Prisma muestra `P1013` en `prisma migrate deploy`, revisa primero `DIRECT_URL`: Prisma usa esa URL para aplicar las migraciones antes de ejecutar `next build`. Después de corregir las variables, inicia un nuevo despliegue para verificar el cambio.

**Diferencias con Vercel que ya resuelve el código:**

- Netlify solo expone `CONTEXT` y `DEPLOY_PRIME_URL` durante el build. `next.config.ts` calcula la URL del sitio, el entorno y la plataforma al compilar y los deja fijos (`src/lib/url-sitio.ts`). Por eso, **después de cambiar `SITE_URL` hay que volver a desplegar.**
- La IP del visitante se toma de `x-nf-client-connection-ip`, la cabecera que fija Netlify. `x-real-ip` no se usa allí porque el visitante podría inventarla y saltarse el límite de intentos (CS-14).
- Netlify acepta peticiones de hasta 6 MB; el panel reduce las fotos en el navegador antes de enviarlas.

**Límites del plan Free (créditos):** 300 créditos al mes, sin recarga. Cada despliegue a producción gasta 15, cada GB de tráfico 20 y cada 10.000 peticiones 2. Las fotos salen de Cloudinary, así que por Netlify pasa casi solo el HTML. Revisa el consumo en **Usage & billing** el primer mes; si se acerca al límite, sube al plan de pago o evita desplegar varias veces al día.

### Prueba en Netlify antes de decidir

Hazla con una cuenta de prueba del desarrollador, apuntando a la rama `preview` de Neon (nunca a datos reales):

1. Sigue los pasos 2, 3 y 4B usando los valores de `preview` también en **Production**.
2. Crea un administrador con `npm run admin -- crear` sobre esa base.
3. Comprueba:

| Qué | Esperado |
|---|---|
| El build termina | Sin errores de Prisma ni de `cacheComponents` |
| Catálogo, detalle, local | Cargan con datos; el detalle de un producto oculto muestra «No encontramos esta página» |
| Iniciar sesión en `/admin` | Entra; con 5 intentos fallidos se bloquea la cuenta (argon2 funciona en Netlify) |
| Editar un precio (CP-15) | El cambio se ve en el catálogo público en segundos (la caché `use cache` se invalida) |
| Subir una foto de celular (CP-13) | Se guarda en Cloudinary |
| Registro de eventos | El inicio de sesión aparece con la IP real del visitante, no vacía |
| [securityheaders.com](https://securityheaders.com) | Calificación A |

Si todo pasa, Netlify Free sirve para producción. Si algo falla, anótalo y se corrige o se usa Vercel.

## 5. Primer administrador y contenido

Desde el equipo del desarrollador, con la cadena **directa** de `main`:

```bash
DATABASE_URL="<cadena directa de main>" npm run admin -- crear --nombre "Nombre Apellido" --correo correo@negocio.com
```

Entrega la contraseña temporal en persona (ver `docs/administradores.md`).

> ⚠️ **No ejecutes `npx prisma db seed` en producción:** crea un producto y datos de ejemplo.

Luego, en `https://<proyecto>.vercel.app/admin` (o `https://<proyecto>.netlify.app/admin`):

1. **Información del local**: dirección, horarios, coordenadas, WhatsApp, teléfonos y redes.
2. **Categorías**.
3. **Productos**, con las fotos reales.

## 6. Dominio y DNS

1. Registra el dominio a nombre del cliente.
2. En **Cloudflare** (plan Free): **Add a site** con el dominio. Cloudflare indica dos *nameservers*; ponlos en el registrador del dominio.
3. En **Vercel → Settings → Domains** agrega `<dominio>` y `www.<dominio>`, y deja `www` redirigiendo al dominio principal. Vercel muestra los registros DNS que necesita.
   - **En Netlify:** **Domain management → Add a domain**, con `www` redirigiendo al dominio principal. Netlify muestra los registros (por lo general uno para el dominio y un `CNAME` de `www` a `<proyecto>.netlify.app`).
4. Crea esos registros en Cloudflare **con el proxy desactivado (nube gris, "DNS only")**.
   - Ni Vercel ni Netlify recomiendan poner el proxy de Cloudflare delante: duplica la caché, oculta el tráfico a su firewall y puede romper la emisión del certificado.
   - Con el proxy activo, el límite de intentos de inicio de sesión vería la IP de Cloudflare en lugar de la del visitante.
5. Espera a que la plataforma marque el dominio como válido, con el certificado emitido.
6. Agrega la variable `SITE_URL = https://<dominio>` en **Production** y vuelve a desplegar. Con eso se activan HSTS y la redirección a HTTPS, y el sitemap usa el dominio.

## 7. Respaldos

En GitHub → **Settings → Secrets and variables → Actions**:

- `RESPALDO_DATABASE_URL`: cadena **directa** de `main` con el usuario `respaldo` del paso 2.
- `RESPALDO_CLAVE`: frase larga y aleatoria. **Guárdala en el gestor de contraseñas del cliente**; sin ella los respaldos no se pueden abrir.

Ejecuta **Actions → Respaldo diario de la base de datos → Run workflow** y revisa el resumen. Detalles: `docs/respaldos.md`.

## 8. Verificación antes de entregar

| Revisión | Cómo | Esperado |
|---|---|---|
| HTTPS y certificado (CS-03) | [SSL Labs](https://www.ssllabs.com/ssltest/) con el dominio | Calificación A |
| Cabeceras de seguridad (CS-06) | [securityheaders.com](https://securityheaders.com) | Calificación A |
| Rendimiento y SEO (RNF-09, RNF-11) | Lighthouse en Chrome, modo celular, con productos reales | ≥ 90 en todo |
| Pedido por WhatsApp (CP-08) | Desde un celular, "Pedir por WhatsApp" en un producto | Abre el chat del negocio con el producto escrito |
| Panel protegido (CS-01) | Abrir `/admin` en una ventana privada | Pide iniciar sesión |
| Respaldo y restauración (CS-16) | Pasos de `docs/respaldos.md` | Datos completos |
| Auditoría OWASP ZAP (CS-17) | Escaneo base sobre el sitio, en una ventana acordada con el cliente | Sin hallazgos altos |
| Google | [Search Console](https://search.google.com/search-console): verificar el dominio y enviar `https://<dominio>/sitemap.xml` | Sitemap aceptado |

Anota cada resultado en el registro de ejecución del Plan de Pruebas.

## Después de la entrega

- Cada cambio entra por *pull request*. Al fusionarlo en `main`, Vercel o Netlify despliegan solos, aplicando las migraciones nuevas.
- Cada PR genera una **vista previa** con su propia URL, conectada a la rama `preview` de Neon, para revisar antes de fusionar.
- Si un despliegue sale mal: **Vercel → Deployments →** el anterior **→ Promote to Production** (en Netlify: **Deploys →** el anterior **→ Publish deploy**) lo revierte en segundos. Las migraciones de base de datos no se revierten solas: evalúa el caso antes.

# Guía de despliegue

Cómo publicar el sitio la primera vez (semanas 16–17 del cronograma). Sigue los pasos en orden; cada uno dice qué copiar y dónde pegarlo.

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

## 4. Vercel (hosting)

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

## 5. Primer administrador y contenido

Desde el equipo del desarrollador, con la cadena **directa** de `main`:

```bash
DATABASE_URL="<cadena directa de main>" npm run admin -- crear --nombre "Nombre Apellido" --correo correo@negocio.com
```

Entrega la contraseña temporal en persona (ver `docs/administradores.md`).

> ⚠️ **No ejecutes `npx prisma db seed` en producción:** crea un producto y datos de ejemplo.

Luego, en `https://<proyecto>.vercel.app/admin`:

1. **Información del local**: dirección, horarios, coordenadas, WhatsApp, teléfonos y redes.
2. **Categorías**.
3. **Productos**, con las fotos reales.

## 6. Dominio y DNS

1. Registra el dominio a nombre del cliente.
2. En **Cloudflare** (plan Free): **Add a site** con el dominio. Cloudflare indica dos *nameservers*; ponlos en el registrador del dominio.
3. En **Vercel → Settings → Domains** agrega `<dominio>` y `www.<dominio>`, y deja `www` redirigiendo al dominio principal. Vercel muestra los registros DNS que necesita.
4. Crea esos registros en Cloudflare **con el proxy desactivado (nube gris, "DNS only")**.
   - Vercel no recomienda poner el proxy de Cloudflare delante: duplica la caché, oculta el tráfico a su firewall y rompe la verificación del certificado.
   - Con el proxy activo, el límite de intentos de inicio de sesión vería la IP de Cloudflare en lugar de la del visitante.
5. Espera a que Vercel marque el dominio como válido, con el certificado emitido.
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

- Cada cambio entra por *pull request*. Al fusionarlo en `main`, Vercel despliega solo, aplicando las migraciones nuevas.
- Cada PR genera una **vista previa** con su propia URL, conectada a la rama `preview` de Neon, para revisar antes de fusionar.
- Si un despliegue sale mal: **Vercel → Deployments →** el anterior **→ Promote to Production** lo revierte en segundos. Las migraciones de base de datos no se revierten solas: evalúa el caso antes.

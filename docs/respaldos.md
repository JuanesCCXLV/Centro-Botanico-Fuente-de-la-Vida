# Respaldos de la base de datos (RNF-08)

Opción elegida por el cliente: **respaldo diario gratuito con GitHub Actions**, además de la restauración instantánea de 6 horas que trae el plan gratuito de Neon.

| | Qué cubre | Hasta cuándo |
|---|---|---|
| Restauración instantánea de Neon | Errores recientes ("borré algo hace una hora") | Últimas 6 horas |
| Respaldo diario (este documento) | Pérdida de datos, errores descubiertos tarde, problemas con el proveedor | Últimos 30 días, una copia por día |

Objetivos propuestos en el Plan de Pruebas: pérdida máxima tolerable de **24 horas** y restauración en **menos de 4 horas**.

## Cómo funciona

El flujo `.github/workflows/respaldo.yml` se ejecuta todos los días a las **2:41 a. m.** (hora de Colombia) y llama a `scripts/respaldo.sh`, que:

1. Vuelca la base de producción con `pg_dump`, usando la misma versión de PostgreSQL que el servidor.
2. **La restaura en una base temporal y comprueba que tenga migraciones y administradores.** Si el respaldo no se puede restaurar, el flujo falla y GitHub envía un correo.
3. La **cifra con AES-256** (`gpg`) y borra la copia sin cifrar. El repositorio es público: los archivos sin cifrar nunca se suben.
4. Guarda el archivo `.dump.gpg` como artefacto del flujo durante **30 días**.

Además, el CI prueba en cada cambio que el respaldo, la restauración y el cifrado funcionen (paso *"Prueba de respaldo y restauración (CS-16)"*).

## Configuración (una sola vez, al desplegar)

En GitHub → **Settings → Secrets and variables → Actions → New repository secret**:

| Secreto | Valor |
|---|---|
| `RESPALDO_DATABASE_URL` | Cadena de conexión **directa** de Neon (no la de *pooling*, la que no tiene `-pooler` en el host), con `?sslmode=require`. |
| `RESPALDO_CLAVE` | Una frase larga y aleatoria (mínimo 32 caracteres). |

> ⚠️ **Guarda `RESPALDO_CLAVE` en el gestor de contraseñas del cliente.** Sin ella los respaldos no se pueden abrir, y GitHub no permite volver a ver un secreto después de guardarlo.

**Recomendado:** usa un rol de solo lectura en lugar del dueño de la base. En el editor SQL de Neon:

```sql
CREATE ROLE respaldo WITH LOGIN PASSWORD 'una-clave-larga';
GRANT pg_read_all_data TO respaldo;
```

Para probar la configuración sin esperar a la madrugada: **Actions → Respaldo diario de la base de datos → Run workflow**. El resumen de la ejecución muestra el tamaño y la cantidad de productos, usuarios y categorías respaldados.

Mientras los secretos no existan, el flujo se omite con un aviso; no falla.

## Restaurar un respaldo

1. En **Actions → Respaldo diario de la base de datos**, abre la ejecución del día deseado y descarga el artefacto `respaldo-…` (es un `.zip` con el `.dump.gpg`).
2. **Primero restaura en una base de prueba** (por ejemplo, una *branch* nueva en Neon o el Postgres local) y revisa que los datos sean los esperados.
3. Restaura en producción:

```bash
unzip respaldo-*.zip
DESTINO_URL="postgresql://…" scripts/restaurar.sh respaldo-2026-12-01T0741Z.dump.gpg
```

El script pide la clave de cifrado (o la toma de `RESPALDO_CLAVE`) y pide escribir `RESTAURAR` para confirmar. Reemplaza **todas** las tablas del destino en una sola transacción: si algo falla, no se aplica nada.

Requisitos en el equipo: `gpg` y `podman` o `docker` (los scripts usan la imagen oficial de PostgreSQL, así no hay que instalarlo).

## Prueba de restauración (CS-16)

Hacerla **antes de la entrega y luego cada semestre**, y dejar evidencia en el registro de ejecución del Plan de Pruebas:

1. Descargar el respaldo más reciente.
2. Restaurarlo en el Postgres local (`podman-compose up -d`) con `DESTINO_URL="postgresql://tienda:cambiar-en-local@localhost:5232/tienda_dev"`.
3. Levantar el sitio con `npm run dev` y comprobar que el catálogo y el panel muestran los datos de producción.
4. Anotar la fecha, el archivo usado, el tiempo que tomó y el resultado.

## Imágenes

Las imágenes de los productos **no** están en la base de datos sino en Cloudinary. El plan de pruebas recomienda que el cliente conserve las fotos originales. Si se pierden las de Cloudinary, se vuelven a subir desde el panel.

## Si ocurre un incidente

Seguir el procedimiento de la sección 7 del Plan de Pruebas y Seguridad: contener (cerrar sesiones, desactivar cuentas, modo mantenimiento si hace falta) → rotar secretos y contraseñas → **restaurar desde un respaldo limpio** → analizar la causa con la tabla `Evento` → informar al cliente → documentar lo aprendido.

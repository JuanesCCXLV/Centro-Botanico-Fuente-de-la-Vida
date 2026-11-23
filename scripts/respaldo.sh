#!/usr/bin/env bash
# Respaldo de la base de datos (RNF-08, CS-16).
#
#   1. Vuelca la base de ORIGEN_URL con pg_dump (formato custom).
#   2. La restaura en un PostgreSQL temporal de la misma versión y comprueba que tiene datos.
#      Un respaldo que no se puede restaurar no es un respaldo.
#   3. La cifra con AES-256 (gpg) usando RESPALDO_CLAVE y borra la copia sin cifrar.
#
# Uso:
#   ORIGEN_URL="postgresql://..." RESPALDO_CLAVE="..." scripts/respaldo.sh [carpeta_salida]
#
# Requiere docker o podman (para usar pg_dump de la misma versión que el servidor) y gpg.
set -euo pipefail

: "${ORIGEN_URL:?Define ORIGEN_URL con la cadena de conexión de la base a respaldar}"
: "${RESPALDO_CLAVE:?Define RESPALDO_CLAVE con la clave de cifrado}"

SALIDA="${1:-respaldos}"
RUNTIME="${RUNTIME:-$(command -v docker || command -v podman || true)}"
[ -n "$RUNTIME" ] || { echo "Se necesita docker o podman" >&2; exit 1; }
# Con docker, los archivos creados dentro del contenedor deben quedar a nombre del usuario actual.
# Con podman sin root eso ya ocurre (root del contenedor = usuario del sistema).
USUARIO=()
[ "$(basename "$RUNTIME")" = "docker" ] && USUARIO=(--user "$(id -u):$(id -g)")
command -v gpg >/dev/null || { echo "Se necesita gpg" >&2; exit 1; }

PUERTO_VERIFICACION="${PUERTO_VERIFICACION:-55432}"
CLAVE_VERIFICACION="verificacion-$RANDOM$RANDOM"
CONTENEDOR="respaldo-verificacion-$$"
TEMPORAL="$(mktemp -d)"

limpiar() {
  "$RUNTIME" rm -f "$CONTENEDOR" >/dev/null 2>&1 || true
  # La copia sin cifrar nunca debe quedar en disco
  find "$TEMPORAL" -type f -exec shred -u {} + 2>/dev/null || true
  rm -rf "$TEMPORAL"
}
trap limpiar EXIT

pg() { # Ejecuta una herramienta de PostgreSQL de la versión indicada
  local version="$1"; shift
  "$RUNTIME" run --rm -i --network host "${USUARIO[@]}" -v "$TEMPORAL:/datos:z" "docker.io/library/postgres:$version" "$@"
}

echo "→ Detectando la versión del servidor…"
VERSION_NUM="$(pg 17 psql "$ORIGEN_URL" -Atc "SHOW server_version_num")"
MAYOR=$((VERSION_NUM / 10000))
echo "  PostgreSQL $MAYOR"

echo "→ Volcando la base de datos…"
pg "$MAYOR" pg_dump "$ORIGEN_URL" --format=custom --no-owner --no-privileges --file=/datos/respaldo.dump
TAMANO="$(du -h "$TEMPORAL/respaldo.dump" | cut -f1)"
echo "  Volcado: $TAMANO"

echo "→ Restaurando en una base temporal para verificar…"
"$RUNTIME" run -d --name "$CONTENEDOR" --network host \
  -e POSTGRES_PASSWORD="$CLAVE_VERIFICACION" -e POSTGRES_DB=verificacion \
  "docker.io/library/postgres:$MAYOR" -c port="$PUERTO_VERIFICACION" >/dev/null
DESTINO="postgresql://postgres:$CLAVE_VERIFICACION@localhost:$PUERTO_VERIFICACION/verificacion"
for _ in $(seq 1 60); do
  pg "$MAYOR" pg_isready -q -d "$DESTINO" && break
  sleep 1
done
pg "$MAYOR" pg_restore --no-owner --no-privileges --exit-on-error --dbname="$DESTINO" /datos/respaldo.dump

CONTEO="$(pg "$MAYOR" psql "$DESTINO" -Atc \
  'SELECT (SELECT count(*) FROM _prisma_migrations), (SELECT count(*) FROM "Usuario"), (SELECT count(*) FROM "Producto"), (SELECT count(*) FROM "Categoria")')"
IFS='|' read -r MIGRACIONES USUARIOS PRODUCTOS CATEGORIAS <<<"$CONTEO"
echo "  Migraciones: $MIGRACIONES · Usuarios: $USUARIOS · Productos: $PRODUCTOS · Categorías: $CATEGORIAS"
if [ "$MIGRACIONES" -lt 1 ] || [ "$USUARIOS" -lt 1 ]; then
  echo "El respaldo restaurado no tiene migraciones o administradores: se descarta" >&2
  exit 1
fi

echo "→ Cifrando…"
mkdir -p "$SALIDA"
ARCHIVO="$SALIDA/respaldo-$(date -u +%Y-%m-%dT%H%MZ).dump.gpg"
gpg --batch --yes --quiet --pinentry-mode loopback --passphrase-fd 3 \
  --symmetric --cipher-algo AES256 --output "$ARCHIVO" "$TEMPORAL/respaldo.dump" 3<<<"$RESPALDO_CLAVE"

echo "✓ Respaldo verificado y cifrado: $ARCHIVO"
if [ -n "${GITHUB_OUTPUT:-}" ]; then
  echo "archivo=$ARCHIVO" >>"$GITHUB_OUTPUT"
fi
if [ -n "${GITHUB_STEP_SUMMARY:-}" ]; then
  {
    echo "### Respaldo de la base de datos"
    echo "| PostgreSQL | Tamaño | Migraciones | Usuarios | Productos | Categorías |"
    echo "|---|---|---|---|---|---|"
    echo "| $MAYOR | $TAMANO | $MIGRACIONES | $USUARIOS | $PRODUCTOS | $CATEGORIAS |"
  } >>"$GITHUB_STEP_SUMMARY"
fi

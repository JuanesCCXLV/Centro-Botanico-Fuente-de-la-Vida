#!/usr/bin/env bash
# Restaura un respaldo cifrado en la base de DESTINO_URL (ver docs/respaldos.md).
#
#   DESTINO_URL="postgresql://..." scripts/restaurar.sh respaldo-AAAA-MM-DDTHHMMZ.dump.gpg
#
# ⚠️ REEMPLAZA las tablas del destino por las del respaldo. Pide confirmación escribiendo
#    RESTAURAR (o CONFIRMAR=RESTAURAR para uso no interactivo, por ejemplo en CI).
# La clave se pide por teclado, o se toma de RESPALDO_CLAVE si está definida.
set -euo pipefail

ARCHIVO="${1:?Indica el archivo .dump.gpg a restaurar}"
: "${DESTINO_URL:?Define DESTINO_URL con la base donde se restaurará}"
[ -f "$ARCHIVO" ] || { echo "No existe $ARCHIVO" >&2; exit 1; }

RUNTIME="${RUNTIME:-$(command -v docker || command -v podman || true)}"
[ -n "$RUNTIME" ] || { echo "Se necesita docker o podman" >&2; exit 1; }
# Con docker, los archivos creados dentro del contenedor deben quedar a nombre del usuario actual.
# Con podman sin root eso ya ocurre (root del contenedor = usuario del sistema).
USUARIO=()
[ "$(basename "$RUNTIME")" = "docker" ] && USUARIO=(--user "$(id -u):$(id -g)")

# Muestra el destino sin la contraseña
DESTINO_VISIBLE="$(sed -E 's#://([^:/@]+):[^@]*@#://\1:****@#' <<<"$DESTINO_URL")"
echo "Se va a restaurar $ARCHIVO en:"
echo "  $DESTINO_VISIBLE"
echo "Las tablas actuales de esa base serán REEMPLAZADAS."
if [ "${CONFIRMAR:-}" != "RESTAURAR" ]; then
  read -r -p "Escribe RESTAURAR para continuar: " respuesta
  [ "$respuesta" = "RESTAURAR" ] || { echo "Cancelado."; exit 1; }
fi

TEMPORAL="$(mktemp -d)"
trap 'find "$TEMPORAL" -type f -exec shred -u {} + 2>/dev/null; rm -rf "$TEMPORAL"' EXIT

if [ -n "${RESPALDO_CLAVE:-}" ]; then
  gpg --batch --yes --quiet --pinentry-mode loopback --passphrase-fd 3 \
    --decrypt --output "$TEMPORAL/respaldo.dump" "$ARCHIVO" 3<<<"$RESPALDO_CLAVE"
else
  gpg --yes --quiet --decrypt --output "$TEMPORAL/respaldo.dump" "$ARCHIVO"
fi

pg() {
  "$RUNTIME" run --rm -i --network host "${USUARIO[@]}" -v "$TEMPORAL:/datos:z" "docker.io/library/postgres:${PG_VERSION:-17}" "$@"
}

VERSION_NUM="$(pg psql "$DESTINO_URL" -Atc "SHOW server_version_num")"
export PG_VERSION=$((VERSION_NUM / 10000))

echo "→ Restaurando (PostgreSQL $PG_VERSION)…"
pg pg_restore --clean --if-exists --no-owner --no-privileges --exit-on-error \
  --single-transaction --dbname="$DESTINO_URL" /datos/respaldo.dump

CONTEO="$(pg psql "$DESTINO_URL" -Atc 'SELECT (SELECT count(*) FROM "Usuario"), (SELECT count(*) FROM "Producto")')"
IFS='|' read -r USUARIOS PRODUCTOS <<<"$CONTEO"
echo "✓ Restauración completa · Usuarios: $USUARIOS · Productos: $PRODUCTOS"

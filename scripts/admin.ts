// Gestión de administradores desde la terminal. Ver docs/administradores.md.
//
//   npm run admin -- listar
//   npm run admin -- crear --nombre "Ana Pérez" --correo ana@ejemplo.com
//   npm run admin -- restablecer-clave --correo ana@ejemplo.com
//   npm run admin -- desactivar --correo ana@ejemplo.com
//   npm run admin -- activar --correo ana@ejemplo.com
//
// Usa la base de DATABASE_URL (del .env o del entorno). Para producción:
//   DATABASE_URL="postgresql://…" npm run admin -- listar
import "dotenv/config";
import { parseArgs } from "node:util";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import {
  ErrorAdministracion,
  crearAdministradoresService,
  type AdministradorRepo,
} from "../src/services/administradores.service";
import type { EventoRepo } from "../src/services/eventos";

const AYUDA = `Uso: npm run admin -- <comando> [opciones]

Comandos:
  listar                                     Muestra los administradores
  crear --nombre "Nombre" --correo <correo>  Crea una cuenta con contraseña temporal
  restablecer-clave --correo <correo>        Nueva contraseña temporal, desbloquea y cierra sus sesiones
  desactivar --correo <correo>               Impide el acceso y cierra sus sesiones
  activar --correo <correo>                  Vuelve a permitir el acceso`;

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("Define DATABASE_URL (en .env o en el entorno).");
  process.exit(1);
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

const seleccion = { id: true, nombre: true, correo: true, activo: true, ultimoLoginEn: true } as const;

const repo: AdministradorRepo = {
  listar: () => prisma.usuario.findMany({ orderBy: [{ activo: "desc" }, { nombre: "asc" }], select: seleccion }),
  buscarPorCorreo: (correo) => prisma.usuario.findUnique({ where: { correo }, select: seleccion }),
  contarActivos: () => prisma.usuario.count({ where: { activo: true } }),
  crear: (datos) => prisma.usuario.create({ data: datos, select: { id: true } }),
  cambiarClave: async (id, hashContrasena) => {
    await prisma.usuario.update({
      where: { id },
      data: { hashContrasena, intentosFallidos: 0, bloqueadoHasta: null },
    });
  },
  cambiarActivo: async (id, activo) => {
    await prisma.usuario.update({ where: { id }, data: { activo } });
  },
  cerrarSesiones: async (id) => {
    await prisma.sesion.deleteMany({ where: { usuarioId: id } });
  },
};

const eventos: EventoRepo = {
  registrar: async ({ tipo, usuarioId, recurso }) => {
    await prisma.evento.create({ data: { tipo, usuarioId: usuarioId ?? null, recurso: recurso ?? null } });
  },
  contarPorIpDesde: async () => 0,
};

const servicio = crearAdministradoresService({ administradores: repo, eventos });

/** Host y base de datos, sin usuario ni contraseña, para saber dónde se está actuando. */
function destino(): string {
  try {
    const u = new URL(url!);
    return `${u.hostname}${u.port ? `:${u.port}` : ""}${u.pathname}`;
  } catch {
    return "(DATABASE_URL no es una URL válida)";
  }
}

function mostrarClave(correo: string, clave: string) {
  console.log(`\n  Correo:                 ${correo}`);
  console.log(`  Contraseña temporal:    ${clave}\n`);
  console.log("  Entrégala por un medio privado (en persona o por llamada), no por chat ni correo.");
  console.log("  Pide que la cambie en Panel → Mi cuenta al ingresar. No se volverá a mostrar.\n");
}

async function main() {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    options: { correo: { type: "string" }, nombre: { type: "string" }, ayuda: { type: "boolean", short: "h" } },
  });
  const [comando] = positionals;
  if (!comando || values.ayuda) {
    console.log(AYUDA);
    return;
  }

  console.log(`Base de datos: ${destino()}`);
  const correo = values.correo ?? "";

  switch (comando) {
    case "listar": {
      const lista = await servicio.listar();
      console.table(
        lista.map((a) => ({
          Nombre: a.nombre,
          Correo: a.correo,
          Estado: a.activo ? "activo" : "desactivado",
          "Último ingreso": a.ultimoLoginEn?.toLocaleString("es-CO", { timeZone: "America/Bogota" }) ?? "nunca",
        })),
      );
      break;
    }
    case "crear": {
      const r = await servicio.crear(values.nombre ?? "", correo);
      console.log("✓ Administrador creado.");
      mostrarClave(r.correo, r.clave);
      break;
    }
    case "restablecer-clave": {
      const r = await servicio.restablecerClave(correo);
      console.log("✓ Contraseña restablecida. La cuenta quedó desbloqueada y sus sesiones abiertas se cerraron.");
      mostrarClave(r.correo, r.clave);
      break;
    }
    case "desactivar":
      await servicio.desactivar(correo);
      console.log(`✓ ${correo} desactivado. Sus sesiones abiertas se cerraron.`);
      break;
    case "activar":
      await servicio.activar(correo);
      console.log(`✓ ${correo} activado.`);
      break;
    default:
      console.error(`Comando desconocido: ${comando}\n`);
      console.log(AYUDA);
      process.exitCode = 1;
  }
}

main()
  .catch((e) => {
    if (e instanceof ErrorAdministracion) console.error(`✗ ${e.message}`);
    else console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

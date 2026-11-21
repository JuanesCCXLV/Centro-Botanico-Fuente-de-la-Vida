import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hash } from "@node-rs/argon2";

if (process.env.NODE_ENV === "production") {
  throw new Error("La semilla no se puede ejecutar en producción");
}

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const correo = process.env.ADMIN_EMAIL;
  const clave = process.env.ADMIN_PASSWORD;
  if (!correo || !clave || clave.length < 12) {
    throw new Error("Define ADMIN_EMAIL y ADMIN_PASSWORD (mínimo 12 caracteres)");
  }

  // argon2id con parámetros explícitos (confirma los valores recomendados en la documentación)
  const hashContrasena = await hash(clave, { memoryCost: 19456, timeCost: 2, parallelism: 1 });

  await prisma.usuario.upsert({
    where: { correo },
    update: {},
    create: { nombre: "Administrador", correo, hashContrasena },
  });

  // Datos de EJEMPLO para desarrollo: se reemplazan con los reales del cliente
  const infusiones = await prisma.categoria.upsert({
    where: { slug: "infusiones-y-tes" },
    update: {},
    create: { nombre: "Infusiones y tés", slug: "infusiones-y-tes", orden: 1 },
  });
  await prisma.categoria.upsert({
    where: { slug: "suplementos" },
    update: {},
    create: { nombre: "Suplementos", slug: "suplementos", orden: 2 },
  });

  await prisma.producto.upsert({
    where: { slug: "producto-de-ejemplo-1" },
    update: {},
    create: {
      nombre: "Producto de ejemplo 1",
      slug: "producto-de-ejemplo-1",
      descripcion: "Descripción de ejemplo.",
      presentacion: "[PRESENTACIÓN]",
      precioCop: 15000,
      categoriaId: infusiones.id,
    },
  });

  // Datos del local tomados del perfil de Instagram; el cliente debe confirmarlos
  await prisma.infoLocal.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      direccion: "Diagonal 23 #10b-117, barrio Colseguros, Cali",
      telefonos: ["5570937", "3085456"],
      whatsapp: "573122848090",
      horarios: "[POR CONFIRMAR]",
    },
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
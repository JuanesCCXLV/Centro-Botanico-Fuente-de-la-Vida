import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations", seed: "tsx prisma/seed.ts" },
  // Migraciones y demás comandos de Prisma: conexión DIRECTA (en Neon, sin "-pooler").
  // La aplicación usa DATABASE_URL (con pool). En local ambas son la misma, así que DIRECT_URL es opcional.
  datasource: { url: process.env.DIRECT_URL || env("DATABASE_URL") },
});
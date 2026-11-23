import "dotenv/config";
import { defineConfig, devices } from "@playwright/test";

/**
 * Pruebas de punta a punta (Plan de Pruebas, sección 2.1).
 * Usan la base de datos de DATABASE_URL con la semilla aplicada y el administrador de
 * ADMIN_EMAIL / ADMIN_PASSWORD. Nunca apuntar a producción.
 */
export default defineConfig({
  testDir: "./e2e",
  // Comparten la misma base de datos: se ejecutan en orden, una a la vez
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  // El servidor de desarrollo compila cada página la primera vez: tiempos generosos
  timeout: 120_000,
  expect: { timeout: 30_000 },
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    locale: "es-CO",
    navigationTimeout: 60_000,
  },
  projects: [
    { name: "escritorio", use: { ...devices["Desktop Chrome"] } },
    // El catálogo se diseñó primero para celular
    { name: "celular", use: { ...devices["Pixel 7"] }, testMatch: /publico\.spec\.ts/ },
  ],
  // Servidor de desarrollo: permite el almacenamiento local de imágenes (en producción se exige Cloudinary)
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000/admin/login",
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});

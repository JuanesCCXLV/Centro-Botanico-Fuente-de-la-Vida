import { expect, type Page } from "@playwright/test";

export const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "";
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "";

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  throw new Error("Define ADMIN_EMAIL y ADMIN_PASSWORD (los mismos de la semilla) para las pruebas E2E");
}

/** PNG válido de 1×1 px. */
export const PNG = {
  name: "frontal.png",
  mimeType: "image/png",
  buffer: Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    "base64",
  ),
};

/**
 * Campo de formulario VISIBLE por su atributo name. Next 16 conserva ocultas en el DOM las
 * páginas ya visitadas (para restaurar su estado), así que un selector CSS puede encontrar
 * también el formulario de la página anterior.
 */
export const campo = (page: Page, name: string) => page.locator(`[name="${name}"]:visible`);

/** Nombre único por ejecución para no chocar con datos de corridas anteriores. */
export const unico = (base: string) => `${base} ${Date.now().toString(36)}`;

export async function iniciarSesion(page: Page) {
  await page.goto("/admin/login");
  await campo(page, "correo").fill(ADMIN_EMAIL);
  await campo(page, "clave").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page).toHaveURL(/\/admin$/);
}

/** Crea un producto desde el panel y vuelve al listado. */
export async function crearProducto(
  page: Page,
  datos: { nombre: string; precio: string; categoria?: string; posterior?: boolean },
) {
  await page.goto("/admin/productos/nuevo");
  await campo(page, "nombre").fill(datos.nombre);
  await campo(page, "precioCop").fill(datos.precio);
  await campo(page, "categoriaId").selectOption({ label: datos.categoria ?? "Infusiones y tés" });
  await campo(page, "descripcion").fill("Producto creado por las pruebas automáticas.");
  await campo(page, "imagenFRONTAL").setInputFiles(PNG);
  if (datos.posterior) await campo(page, "imagenPOSTERIOR").setInputFiles({ ...PNG, name: "posterior.png" });
  // Espera a que el navegador termine de preparar las imágenes
  await expect(page.getByText("Preparando imagen…")).toHaveCount(0);
  await page.getByRole("button", { name: "Crear producto" }).click();
  await expect(page).toHaveURL(/\/admin\/productos$/);
}

export const filaDe = (page: Page, texto: string) =>
  page.getByRole("row").filter({ hasText: texto, visible: true });

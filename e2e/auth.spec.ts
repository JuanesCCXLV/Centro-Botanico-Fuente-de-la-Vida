import { expect, test } from "@playwright/test";
import { ADMIN_EMAIL, campo, iniciarSesion } from "./utilidades";

test.describe("Autenticación del administrador (HU-06)", () => {
  test("CS-01: el panel y sus páginas exigen sesión", async ({ page }) => {
    for (const ruta of ["/admin", "/admin/productos", "/admin/productos/nuevo", "/admin/categorias", "/admin/local", "/admin/cuenta"]) {
      await page.goto(ruta);
      await expect(page, ruta).toHaveURL(/\/admin\/login$/);
    }
  });

  test("CS-01: una cookie inventada no da acceso", async ({ page, context }) => {
    await context.addCookies([{ name: "sesion_admin", value: "token-inventado", url: "http://localhost:3000" }]);
    await page.goto("/admin/productos");
    await expect(page).toHaveURL(/\/admin\/login$/);
  });

  test("CP-11: credenciales inválidas muestran un mensaje genérico", async ({ page }) => {
    await page.goto("/admin/login");
    await campo(page, "correo").fill(ADMIN_EMAIL);
    await campo(page, "clave").fill("clave-incorrecta-123");
    await page.getByRole("button", { name: "Ingresar" }).click();
    const mensaje = page.getByText(/Correo o contraseña incorrectos/);
    await expect(mensaje).toBeVisible();

    // El mismo mensaje para un correo que no existe: no se revela qué cuentas hay
    await campo(page, "correo").fill("nadie@ejemplo.invalid");
    await campo(page, "clave").fill("clave-incorrecta-123");
    await page.getByRole("button", { name: "Ingresar" }).click();
    await expect(mensaje).toBeVisible();
  });

  test("CP-10 y CP-12: inicia sesión con cookie HttpOnly y al cerrar queda invalidada", async ({ page, context }) => {
    await iniciarSesion(page);
    await expect(page.getByRole("heading", { name: /Hola,/ })).toBeVisible();

    const cookie = (await context.cookies()).find((c) => c.name === "sesion_admin");
    expect(cookie?.httpOnly).toBe(true);
    expect(cookie?.sameSite).toBe("Lax");

    await page.getByRole("button", { name: "Cerrar sesión" }).click();
    await expect(page).toHaveURL(/\/admin\/login$/);

    // CS-09: reutilizar el token anterior ya no sirve
    await context.addCookies([{ name: "sesion_admin", value: cookie!.value, url: "http://localhost:3000" }]);
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/login$/);
  });
});

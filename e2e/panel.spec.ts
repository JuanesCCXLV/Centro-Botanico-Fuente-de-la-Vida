import { expect, test } from "@playwright/test";
import { crearProducto, filaDe, iniciarSesion, PNG, unico } from "./utilidades";

test.describe("Panel de productos y su efecto en el catálogo (HU-07, HU-09)", () => {
  test.beforeEach(async ({ page }) => {
    await iniciarSesion(page);
  });

  test("CP-13: crear un producto con sus dos imágenes y verlo en el catálogo al instante", async ({ page }) => {
    const nombre = unico("Té E2E dos imágenes");
    await crearProducto(page, { nombre, precio: "15.000", posterior: true });
    await expect(filaDe(page, nombre)).toBeVisible();

    // La caché del catálogo se invalida al guardar
    await page.goto("/");
    await page.getByRole("link", { name: nombre }).first().click();
    await expect(page.getByRole("heading", { name: nombre })).toBeVisible();
    await expect(page.getByText(/15\.000/).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /Ver imagen posterior/ })).toBeVisible();

    // CP-08: el botón de WhatsApp lleva el nombre del producto codificado
    const enlace = await page.getByRole("link", { name: "Pedir por WhatsApp" }).first().getAttribute("href");
    expect(enlace).toMatch(/^https:\/\/wa\.me\/\d+\?text=/);
    expect(decodeURIComponent(enlace!.split("text=")[1])).toContain(nombre);
  });

  test("CP-14: datos inválidos se rechazan sin perder lo escrito", async ({ page }) => {
    await page.goto("/admin/productos/nuevo");
    await page.locator('[name="nombre"]').fill("Producto con precio malo");
    await page.locator('[name="precioCop"]').fill("-500");
    await page.locator('[name="descripcion"]').fill("x");
    await page.getByRole("button", { name: "Crear producto" }).click();

    await expect(page.getByText("El precio debe ser un número entero en pesos, sin decimales.")).toBeVisible();
    await expect(page.getByText("Elige una categoría.")).toBeVisible();
    await expect(page.locator('[name="nombre"]')).toHaveValue("Producto con precio malo");
  });

  test("CS-12: un archivo que no es imagen se rechaza aunque diga ser PNG", async ({ page }) => {
    await page.goto("/admin/productos/nuevo");
    await page.locator('[name="nombre"]').fill(unico("Producto con SVG"));
    await page.locator('[name="precioCop"]').fill("1000");
    await page.locator('[name="categoriaId"]').selectOption({ label: "Infusiones y tés" });
    await page.locator('[name="descripcion"]').fill("x");
    await page.locator('[name="imagenFRONTAL"]').setInputFiles({
      name: "foto.png",
      mimeType: "image/png",
      buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'),
    });
    await expect(page.getByText("Preparando imagen…")).toHaveCount(0);
    await page.getByRole("button", { name: "Crear producto" }).click();
    await expect(page.getByText(/no corresponde a una imagen JPG, PNG o WebP/)).toBeVisible();
  });

  test("CP-15, CP-16, CP-02 y CP-17: editar precio, ocultar, 404 público y eliminar", async ({ page }) => {
    const nombre = unico("Árnica E2E ciclo");
    await crearProducto(page, { nombre, precio: "20000" });

    // CP-15: editar el precio
    await filaDe(page, nombre).getByRole("link", { name: "Editar" }).click();
    await page.locator('[name="precioCop"]').fill("23500");
    await page.getByRole("button", { name: "Guardar cambios" }).click();
    await expect(filaDe(page, nombre)).toContainText(/23\.500/);

    // Búsqueda pública sin tildes (CP-04)
    const busqueda = `/?q=${encodeURIComponent(nombre.replace("Árnica", "arnica"))}`;
    await page.goto(busqueda);
    const tarjeta = page.getByRole("link", { name: nombre }).first();
    await expect(tarjeta).toBeVisible();
    const urlPublica = await tarjeta.getAttribute("href");

    // CP-16: ocultar
    await page.goto("/admin/productos");
    await filaDe(page, nombre).getByRole("button", { name: "Visible" }).click();
    await expect(filaDe(page, nombre).getByRole("button", { name: "Oculto" })).toBeVisible();

    // CP-02: deja de verse y su URL responde 404
    await page.goto(busqueda);
    await expect(page.getByText(/No encontramos productos/)).toBeVisible();
    await page.goto(urlPublica!);
    await expect(page.getByRole("heading", { name: "No encontramos esta página" })).toBeVisible();

    // CP-17: eliminar con confirmación
    await page.goto("/admin/productos");
    page.once("dialog", (d) => d.accept());
    await filaDe(page, nombre).getByRole("button", { name: "Eliminar" }).click();
    await expect(filaDe(page, nombre)).toHaveCount(0);
  });

  test("CP-19: reemplazar la imagen frontal", async ({ page }) => {
    const nombre = unico("Producto E2E reemplazo");
    await crearProducto(page, { nombre, precio: "5000" });
    await filaDe(page, nombre).getByRole("link", { name: "Editar" }).click();
    const antes = await page.getByRole("img", { name: /Vista previa imagen frontal/ }).getAttribute("src");

    await page.locator('[name="imagenFRONTAL"]').setInputFiles({ ...PNG, name: "nueva.png" });
    await expect(page.getByText("Preparando imagen…")).toHaveCount(0);
    await page.getByRole("button", { name: "Guardar cambios" }).click();
    await expect(page).toHaveURL(/\/admin\/productos$/);

    await filaDe(page, nombre).getByRole("link", { name: "Editar" }).click();
    const despues = await page.getByRole("img", { name: /Vista previa imagen frontal/ }).getAttribute("src");
    expect(despues).not.toBe(antes);
  });
});

test.describe("Categorías e información del local (HU-08, HU-10)", () => {
  test.beforeEach(async ({ page }) => {
    await iniciarSesion(page);
  });

  test("CP-18: no se puede eliminar una categoría con productos; una vacía sí", async ({ page }) => {
    await page.goto("/admin/categorias");
    page.once("dialog", (d) => d.accept());
    await filaDe(page, "Infusiones y tés").getByRole("button", { name: "Eliminar" }).click();
    await expect(page.getByText(/No se puede eliminar: tiene \d+ productos?/)).toBeVisible();

    const nombre = unico("Categoría E2E");
    await page.goto("/admin/categorias/nueva");
    await page.locator('[name="nombre"]').fill(nombre);
    await page.getByRole("button", { name: "Crear categoría" }).click();
    await expect(filaDe(page, nombre)).toBeVisible();

    page.once("dialog", (d) => d.accept());
    await filaDe(page, nombre).getByRole("button", { name: "Eliminar" }).click();
    await expect(filaDe(page, nombre)).toHaveCount(0);
  });

  test("CP-20: editar horarios del local se refleja en el sitio público", async ({ page }) => {
    const horario = unico("Lunes a sábado 8 a. m. – 6 p. m. ·");
    await page.goto("/admin/local");
    await page.locator('[name="horarios"]').fill(horario);
    await page.getByRole("button", { name: "Guardar" }).click();
    await expect(page.getByText("Información del local actualizada.")).toBeVisible();

    await page.goto("/local");
    await expect(page.getByText(horario)).toBeVisible();
  });

  test("Las redes sociales solo aceptan enlaces del dominio de cada red", async ({ page }) => {
    await page.goto("/admin/local");
    await page.locator('[name="instagram"]').fill("https://instagram.com.sitio-falso.co/tienda");
    await page.getByRole("button", { name: "Guardar" }).click();
    await expect(page.getByText(/Instagram: usa un enlace https:\/\/ de instagram\.com/)).toBeVisible();
  });
});

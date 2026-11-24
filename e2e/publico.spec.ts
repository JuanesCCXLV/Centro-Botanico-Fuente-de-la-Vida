import { expect, test } from "@playwright/test";

test.describe("Sitio público (HU-01 a HU-05)", () => {
  test("CP-01 y CP-03: el catálogo lista productos y filtra por categoría", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Productos naturistas en Cali" })).toBeVisible();
    await expect(page.getByText(/\d+ productos?/)).toBeVisible();

    await page.getByRole("navigation", { name: "Categorías", exact: true }).getByRole("link", { name: "Infusiones y tés" }).click();
    await expect(page).toHaveURL(/categoria=infusiones-y-tes/);
    await expect(
      page.getByRole("navigation", { name: "Categorías", exact: true }).getByRole("link", { name: "Infusiones y tés" }),
    ).toHaveAttribute("aria-current", "page");
  });

  test("CP-04: la búsqueda sin resultados muestra un mensaje claro", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("searchbox", { name: "Buscar productos" }).fill("zzz-no-existe");
    await page.getByRole("button", { name: "Buscar" }).click();
    await expect(page.getByText(/No encontramos productos para “zzz-no-existe”/)).toBeVisible();
  });

  test("CP-05: el detalle muestra descripción, precio y aviso de salud", async ({ page }) => {
    await page.goto("/productos/producto-de-ejemplo-1");
    await expect(page.getByRole("heading", { name: "Producto de ejemplo 1" })).toBeVisible();
    await expect(page.getByText(/15\.000/).first()).toBeVisible();
    await expect(page.getByText("Esta información no reemplaza la consulta con un profesional de la salud.")).toBeVisible();
    // Datos estructurados para Google
    const jsonLd = await page.locator('script[type="application/ld+json"]').first().textContent();
    expect(JSON.parse(jsonLd!)).toMatchObject({ "@type": "Product", offers: { priceCurrency: "COP" } });
  });

  test("CP-07: la página del local muestra mapa, horarios y contacto", async ({ page }) => {
    await page.goto("/local");
    await expect(page.getByRole("heading", { name: "Visítanos" })).toBeVisible();
    await expect(page.locator('iframe[title="Mapa de ubicación del local"]')).toBeVisible();
    await expect(page.getByRole("heading", { name: "Horarios" })).toBeVisible();
    await expect(page.getByRole("main").getByRole("link", { name: "WhatsApp" })).toHaveAttribute("rel", "noopener noreferrer");
  });

  test("Canal URES TV: reproductor en vivo y descarga de la app", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("navigation", { name: "Secciones del sitio" }).getByRole("link", { name: "URES TV" }).click();
    await expect(page).toHaveURL(/\/canal$/);
    await expect(page.getByRole("heading", { name: "URES TV", level: 1 })).toBeVisible();
    // El navegador de las pruebas (Chromium de Playwright) puede no traer HLS: vale el reproductor o el aviso
    await expect(page.locator("video[aria-label='Señal en vivo de URES TV']").or(page.getByRole("status"))).toBeVisible();
    const app = page.getByRole("main").getByRole("link", { name: "Descargar la app" }).first();
    await expect(app).toHaveAttribute("rel", "noopener noreferrer");
  });

  test("Una URL inexistente muestra la página 404 en español y no se indexa", async ({ page }) => {
    await page.goto("/productos/no-existe-este-producto");
    await expect(page.getByRole("heading", { name: "No encontramos esta página" })).toBeVisible();
    await expect(page.locator('meta[name="robots"][content*="noindex"]').first()).toBeAttached();
  });

  test("RNF-11: robots.txt excluye el panel y el sitemap lista productos", async ({ request }) => {
    const robots = await (await request.get("/robots.txt")).text();
    expect(robots).toMatch(/Disallow: \/admin/);
    const sitemap = await (await request.get("/sitemap.xml")).text();
    expect(sitemap).toContain("/productos/producto-de-ejemplo-1");
  });

  test("CS-06: las cabeceras de seguridad están presentes", async ({ request }) => {
    const r = await request.get("/");
    const h = r.headers();
    expect(h["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(h["x-content-type-options"]).toBe("nosniff");
    expect(h["x-frame-options"]).toBe("DENY");
    expect(h["x-powered-by"]).toBeUndefined();
  });
});

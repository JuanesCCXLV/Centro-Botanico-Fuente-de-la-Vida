import { describe, expect, it } from "vitest";
import { absoluta, jsonLdLocal, jsonLdProducto, resumen, serializarJsonLd } from "@/lib/seo";
import { buildWhatsAppLink, enlaceWhatsApp } from "@/lib/whatsapp";
import type { ProductoPublico } from "@/services/catalogo.service";

const BASE = "https://centrobotanico.co";

describe("seo", () => {
  it("convierte rutas en URLs absolutas y respeta las que ya lo son", () => {
    expect(absoluta(BASE, "/productos/te")).toBe("https://centrobotanico.co/productos/te");
    expect(absoluta(BASE, "https://res.cloudinary.com/x.png")).toBe("https://res.cloudinary.com/x.png");
  });

  it("resume en un límite de palabra", () => {
    const r = resumen("palabra ".repeat(50), 30);
    expect(r.length).toBeLessThanOrEqual(30);
    expect(r.endsWith("…")).toBe(true);
    expect(resumen("corto")).toBe("corto");
  });

  it("genera JSON-LD de producto con precio en COP", () => {
    const p = {
      nombre: "Té verde",
      slug: "te-verde",
      descripcion: "Hojas",
      precioCop: 15000,
      categoria: { nombre: "Infusiones", slug: "infusiones" },
      imagenes: [{ tipo: "FRONTAL", url: "/uploads/productos/a.webp", textoAlternativo: null }],
    } as ProductoPublico;
    const ld = jsonLdProducto(p, BASE);
    expect(ld.offers).toMatchObject({ price: 15000, priceCurrency: "COP" });
    expect(ld.image).toEqual(["https://centrobotanico.co/uploads/productos/a.webp"]);
  });

  it("genera JSON-LD del local con coordenadas solo si existen", () => {
    const info = {
      direccion: "Diagonal 23 #10b-117",
      telefonos: [],
      whatsapp: "573001234567",
      correo: null,
      horarios: "",
      latitud: null,
      longitud: null,
      redesSociales: { instagram: "https://www.instagram.com/x" },
    };
    const ld = jsonLdLocal(info, BASE);
    expect(ld).not.toHaveProperty("geo");
    expect(ld.telephone).toBe("+573001234567");
    expect(jsonLdLocal({ ...info, latitud: 3.4, longitud: -76.5 }, BASE)).toHaveProperty("geo");
  });

  it("no permite cerrar la etiqueta <script> desde los datos (XSS)", () => {
    const salida = serializarJsonLd({ name: "</script><script>alert(1)</script>" });
    expect(salida).not.toContain("</script>");
    expect(JSON.parse(salida).name).toBe("</script><script>alert(1)</script>");
  });
});

describe("enlaces de WhatsApp (CP-08)", () => {
  it("codifica el mensaje general y el de producto", () => {
    expect(enlaceWhatsApp("+57 300 123 4567", "Hola & chao")).toBe(
      `https://wa.me/573001234567?text=${encodeURIComponent("Hola & chao")}`,
    );
    expect(decodeURIComponent(buildWhatsAppLink("573001234567", "Té verde").split("text=")[1])).toBe(
      "Hola, quisiera información sobre: Té verde",
    );
  });
});

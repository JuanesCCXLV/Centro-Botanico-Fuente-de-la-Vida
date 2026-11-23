import { describe, expect, it } from "vitest";
import { validarEntorno } from "@/lib/env-esquema";
import { resolverUrlSitio } from "@/lib/url-sitio";

const base = { DATABASE_URL: "postgresql://x@localhost/db" };
const cloudinary = { CLOUDINARY_CLOUD_NAME: "c", CLOUDINARY_API_KEY: "k", CLOUDINARY_API_SECRET: "s" };

describe("resolverUrlSitio", () => {
  it("prefiere SITE_URL y quita la barra final", () => {
    expect(resolverUrlSitio({ SITE_URL: "https://centrobotanico.com.co/", VERCEL_URL: "x.vercel.app" })).toBe(
      "https://centrobotanico.com.co",
    );
  });

  it("en Vercel usa la URL de producción o la del despliegue de vista previa", () => {
    expect(
      resolverUrlSitio({ VERCEL_ENV: "production", VERCEL_PROJECT_PRODUCTION_URL: "tienda.vercel.app", VERCEL_URL: "tienda-abc.vercel.app" }),
    ).toBe("https://tienda.vercel.app");
    expect(resolverUrlSitio({ VERCEL_ENV: "preview", VERCEL_URL: "tienda-abc.vercel.app" })).toBe(
      "https://tienda-abc.vercel.app",
    );
  });

  it("en local usa localhost", () => {
    expect(resolverUrlSitio({})).toBe("http://localhost:3000");
  });
});

describe("validarEntorno", () => {
  it("en desarrollo no exige Cloudinary", () => {
    expect(validarEntorno(base).SITE_URL).toBe("http://localhost:3000");
  });

  it("en la vista previa de Vercel no exige Cloudinary ni dominio propio", () => {
    expect(() => validarEntorno({ ...base, VERCEL_ENV: "preview", VERCEL_URL: "x.vercel.app" })).not.toThrow();
  });

  it("en producción exige https y las tres variables de Cloudinary, y dice cuáles faltan", () => {
    expect(() => validarEntorno({ ...base, VERCEL_ENV: "production", SITE_URL: "http://inseguro.co" })).toThrow(
      /SITE_URL: En producción debe empezar con https:\/\/.*CLOUDINARY_CLOUD_NAME: Obligatoria/,
    );
    expect(() =>
      validarEntorno({ ...base, ...cloudinary, VERCEL_ENV: "production", SITE_URL: "https://centrobotanico.com.co" }),
    ).not.toThrow();
  });

  it("sin DATABASE_URL falla con un mensaje claro", () => {
    expect(() => validarEntorno({})).toThrow(/DATABASE_URL/);
  });
});

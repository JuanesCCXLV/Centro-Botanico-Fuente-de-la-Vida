import { describe, expect, it } from "vitest";
import { validarEntorno } from "@/lib/env-esquema";
import { ipDesdeCabeceras } from "@/lib/ip";
import { entornoSitio, plataforma, resolverUrlSitio } from "@/lib/url-sitio";

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

  it("en Netlify usa la URL principal en producción y la de la vista previa en los demás contextos", () => {
    const netlify = { NETLIFY: "true", URL: "https://centro-botanico.netlify.app", DEPLOY_PRIME_URL: "https://deploy-preview-7--centro-botanico.netlify.app" };
    expect(resolverUrlSitio({ ...netlify, CONTEXT: "production" })).toBe("https://centro-botanico.netlify.app");
    expect(resolverUrlSitio({ ...netlify, CONTEXT: "deploy-preview" })).toBe("https://deploy-preview-7--centro-botanico.netlify.app");
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

  it("en producción de Netlify exige lo mismo que en Vercel", () => {
    const netlify = { ...base, NETLIFY: "true", CONTEXT: "production", URL: "https://centro-botanico.netlify.app" };
    expect(() => validarEntorno(netlify)).toThrow(/CLOUDINARY_CLOUD_NAME: Obligatoria/);
    expect(validarEntorno({ ...netlify, ...cloudinary }).SITE_URL).toBe("https://centro-botanico.netlify.app");
    expect(() => validarEntorno({ ...base, NETLIFY: "true", CONTEXT: "deploy-preview" })).not.toThrow();
  });

  it("los valores fijados al compilar tienen prioridad (en Netlify CONTEXT no existe al atender visitas)", () => {
    expect(() => validarEntorno({ ...base, ENTORNO_SITIO: "produccion", SITE_URL: "https://x.netlify.app" })).toThrow(
      /CLOUDINARY_CLOUD_NAME: Obligatoria/,
    );
  });

  it("sin DATABASE_URL falla con un mensaje claro", () => {
    expect(() => validarEntorno({})).toThrow(/DATABASE_URL/);
  });
});

describe("plataforma y entorno", () => {
  it("detecta Vercel, Netlify y local", () => {
    expect(plataforma({ VERCEL: "1" })).toBe("vercel");
    expect(plataforma({ NETLIFY: "true" })).toBe("netlify");
    expect(plataforma({})).toBe("local");
    expect(plataforma({ PLATAFORMA: "netlify" })).toBe("netlify");
  });

  it("traduce los contextos de cada plataforma", () => {
    expect(entornoSitio({ VERCEL_ENV: "production" })).toBe("produccion");
    expect(entornoSitio({ CONTEXT: "production" })).toBe("produccion");
    expect(entornoSitio({ VERCEL_ENV: "preview" })).toBe("vista-previa");
    expect(entornoSitio({ CONTEXT: "branch-deploy" })).toBe("vista-previa");
    expect(entornoSitio({ CONTEXT: "dev" })).toBe("local");
    expect(entornoSitio({ ENTORNO_SITIO: "produccion" })).toBe("produccion");
  });
});

describe("ipDesdeCabeceras (CS-14)", () => {
  it("en Netlify solo confía en x-nf-client-connection-ip, aunque el visitante envíe x-real-ip", () => {
    const h = new Headers({ "x-real-ip": "1.1.1.1", "x-forwarded-for": "2.2.2.2", "x-nf-client-connection-ip": "203.0.113.9" });
    expect(ipDesdeCabeceras(h, "netlify")).toBe("203.0.113.9");
    expect(ipDesdeCabeceras(new Headers({ "x-real-ip": "1.1.1.1" }), "netlify")).toBeNull();
  });

  it("en Vercel usa x-real-ip o el primer valor de x-forwarded-for", () => {
    expect(ipDesdeCabeceras(new Headers({ "x-real-ip": "203.0.113.5" }), "vercel")).toBe("203.0.113.5");
    expect(ipDesdeCabeceras(new Headers({ "x-forwarded-for": "203.0.113.7, 10.0.0.1" }), "vercel")).toBe("203.0.113.7");
  });
});

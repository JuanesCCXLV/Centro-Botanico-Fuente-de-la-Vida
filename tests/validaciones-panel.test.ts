import { describe, expect, it } from "vitest";
import { leerDatosCategoria } from "@/lib/validaciones/categoria";
import { leerDatosInfoLocal } from "@/lib/validaciones/info-local";

function formulario(campos: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(campos)) fd.set(k, v);
  return fd;
}

describe("leerDatosCategoria", () => {
  it("normaliza y usa orden 0 si viene vacío", () => {
    expect(leerDatosCategoria(formulario({ nombre: " Tés ", orden: "", visible: "on" }))).toEqual({
      ok: true,
      datos: { nombre: "Tés", descripcion: null, orden: 0, visible: true },
    });
  });

  it("rechaza nombre vacío y órdenes inválidos", () => {
    expect(leerDatosCategoria(formulario({ nombre: "" })).ok).toBe(false);
    for (const orden of ["-1", "1.5", "abc", "1000"]) {
      expect(leerDatosCategoria(formulario({ nombre: "Tés", orden })).ok).toBe(false);
    }
  });
});

const localValido = {
  direccion: "Diagonal 23 #10b-117, Colseguros, Cali",
  telefonos: "557 0937\n+57 (2) 308-5456\n",
  whatsapp: "+57 312 284 8090",
  correo: "",
  horarios: "Lunes a sábado 8 a. m. – 6 p. m.",
  latitud: "3,4372",
  longitud: "-76.5225",
  instagram: "https://www.instagram.com/centrobotanico",
  facebook: "",
  tiktok: "",
};

describe("leerDatosInfoLocal (HU-10)", () => {
  it("normaliza teléfonos, WhatsApp, coordenadas y redes", () => {
    const r = leerDatosInfoLocal(formulario(localValido));
    expect(r).toEqual({
      ok: true,
      datos: {
        direccion: localValido.direccion,
        telefonos: ["557 0937", "+57 (2) 308-5456"],
        whatsapp: "573122848090",
        correo: null,
        horarios: localValido.horarios,
        latitud: 3.4372,
        longitud: -76.5225,
        redesSociales: { instagram: "https://www.instagram.com/centrobotanico" },
      },
    });
  });

  it("rechaza enlaces de redes peligrosos o de otros sitios (CS-05, CS-15)", () => {
    for (const instagram of [
      "javascript:alert(1)",
      "http://www.instagram.com/x",
      "https://instagram.com.malicioso.co/x",
      "https://www.facebook.com/x",
    ]) {
      const r = leerDatosInfoLocal(formulario({ ...localValido, instagram }));
      expect(r.ok, instagram).toBe(false);
    }
  });

  it("exige WhatsApp con indicativo, latitud y longitud juntas y teléfonos válidos", () => {
    expect(leerDatosInfoLocal(formulario({ ...localValido, whatsapp: "3001234" })).ok).toBe(false);
    expect(leerDatosInfoLocal(formulario({ ...localValido, longitud: "" })).ok).toBe(false);
    expect(leerDatosInfoLocal(formulario({ ...localValido, latitud: "200" })).ok).toBe(false);
    expect(leerDatosInfoLocal(formulario({ ...localValido, telefonos: "llamar al dueño" })).ok).toBe(false);
  });
});

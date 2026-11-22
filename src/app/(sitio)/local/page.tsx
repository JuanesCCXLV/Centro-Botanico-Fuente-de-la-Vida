import type { Metadata } from "next";
import { obtenerInfoLocal } from "@/lib/catalogo";
import { env } from "@/lib/env";
import { jsonLdLocal, serializarJsonLd } from "@/lib/seo";
import { enlaceWhatsApp } from "@/lib/whatsapp";

export const metadata: Metadata = {
  title: "Visítanos",
  description: "Dirección, mapa, horarios y contacto del Centro Botánico Fuente de la Vida en Cali.",
  alternates: { canonical: "/local" },
};

const NOMBRES_REDES = { instagram: "Instagram", facebook: "Facebook", tiktok: "TikTok" } as const;

/** HU-04 / CP-07: ubicación con mapa, horarios y formas de contacto. */
export default async function PaginaLocal() {
  const info = await obtenerInfoLocal();

  if (!info) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-2xl font-bold">Visítanos</h1>
        <p className="mt-2 text-zinc-600">Pronto publicaremos la información del local.</p>
      </main>
    );
  }

  const conCoordenadas = info.latitud !== null && info.longitud !== null;
  const mapa = conCoordenadas
    ? `https://www.google.com/maps?q=${info.latitud},${info.longitud}&z=17&output=embed`
    : `https://www.google.com/maps?q=${encodeURIComponent(`${info.direccion}, Cali, Colombia`)}&output=embed`;
  const comoLlegar = conCoordenadas
    ? `https://www.google.com/maps/dir/?api=1&destination=${info.latitud},${info.longitud}`
    : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${info.direccion}, Cali, Colombia`)}`;
  const redes = Object.entries(info.redesSociales) as [keyof typeof NOMBRES_REDES, string][];

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializarJsonLd(jsonLdLocal(info, env.SITE_URL)) }} />
      <h1 className="mb-6 text-3xl font-bold">Visítanos</h1>

      <div className="grid gap-8 md:grid-cols-2">
        <div className="overflow-hidden rounded-xl border border-zinc-200">
          <iframe
            title="Mapa de ubicación del local"
            src={mapa}
            className="aspect-square w-full md:aspect-auto md:h-full md:min-h-96"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>

        <div className="flex flex-col gap-6">
          <section>
            <h2 className="mb-1 text-lg font-semibold">Dirección</h2>
            <address className="not-italic text-zinc-700">{info.direccion}</address>
            <a href={comoLlegar} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-green-800 underline">
              Cómo llegar
            </a>
          </section>

          <section>
            <h2 className="mb-1 text-lg font-semibold">Horarios</h2>
            <p className="whitespace-pre-line text-zinc-700">{info.horarios}</p>
          </section>

          <section>
            <h2 className="mb-2 text-lg font-semibold">Contacto</h2>
            <div className="flex flex-wrap gap-2">
              <a
                href={enlaceWhatsApp(info.whatsapp, "Hola, quisiera hacer una consulta.")}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full bg-green-700 px-5 py-2 font-semibold text-white hover:bg-green-800"
              >
                WhatsApp
              </a>
              {info.telefonos.map((t) => (
                <a key={t} href={`tel:${t.replace(/[^\d+]/g, "")}`} className="rounded-full border border-green-700 px-5 py-2 font-semibold text-green-800 hover:bg-green-50">
                  Llamar {t}
                </a>
              ))}
              {info.correo && (
                <a href={`mailto:${info.correo}`} className="rounded-full border border-zinc-300 px-5 py-2 hover:bg-zinc-50">
                  {info.correo}
                </a>
              )}
            </div>
          </section>

          {redes.length > 0 && (
            <section>
              <h2 className="mb-2 text-lg font-semibold">Redes sociales</h2>
              <ul className="flex flex-wrap gap-4">
                {redes.map(([red, url]) => (
                  <li key={red}>
                    {/* CP-09 / CS-15: pestaña nueva y sin filtrar la página de origen */}
                    <a href={url} target="_blank" rel="noopener noreferrer" className="text-green-800 underline">
                      {NOMBRES_REDES[red]}
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </main>
  );
}

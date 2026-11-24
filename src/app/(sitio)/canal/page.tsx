import type { Metadata } from "next";
import { CANAL_APP_QR, CANAL_APP_URL, CANAL_NOMBRE, CANAL_SENAL_HLS } from "@/lib/canal";
import { ReproductorEnVivo } from "./reproductor-en-vivo";

export const metadata: Metadata = {
  title: `${CANAL_NOMBRE} en vivo`,
  description: "Mira URES TV en vivo: música popular, nuestro programa de salud y orientación social. Descarga la app para Android.",
  alternates: { canonical: "/canal" },
};

export default function PaginaCanal() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-5">
        <p className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-red-700">
          <span aria-hidden className="size-2.5 animate-pulse rounded-full bg-red-600" />
          En vivo
        </p>
        <h1 className="mt-1 text-3xl font-bold text-green-950 sm:text-4xl">{CANAL_NOMBRE}</h1>
        <p className="mt-2 max-w-2xl text-zinc-700">
          Nuestro canal: música popular, el programa de salud y orientación social, consejos y testimonios de quienes nos visitan.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <ReproductorEnVivo senal={CANAL_SENAL_HLS} appUrl={CANAL_APP_URL} />

        <aside className="rounded-xl border border-zinc-200 bg-zinc-50 p-5">
          <h2 className="text-xl font-bold text-green-950">Llévalo en tu celular</h2>
          <p className="mt-2 text-zinc-700">Descarga la app de {CANAL_NOMBRE} y disfruta el canal desde donde estés.</p>
          <a
            href={CANAL_APP_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-block rounded-full bg-green-800 px-5 py-2.5 font-semibold text-white hover:bg-green-900"
          >
            Descargar la app
          </a>
          <p className="mt-2 text-sm text-zinc-600">Disponible para Android.</p>
          {/* Desde el computador: escanear con el celular */}
          <figure className="mt-5 hidden lg:block">
            {/* eslint-disable-next-line @next/next/no-img-element -- imagen externa pequeña, sin optimizar */}
            <img src={CANAL_APP_QR} alt={`Código QR para descargar la app de ${CANAL_NOMBRE}`} width={160} height={160} loading="lazy" className="rounded-lg bg-white p-2" />
            <figcaption className="mt-2 text-sm text-zinc-600">Escanéalo con la cámara de tu celular.</figcaption>
          </figure>
        </aside>
      </div>
    </main>
  );
}

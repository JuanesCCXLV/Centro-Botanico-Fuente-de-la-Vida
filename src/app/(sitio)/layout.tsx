import Link from "next/link";
import type { ReactNode } from "react";
import { obtenerInfoLocal } from "@/lib/catalogo";
import { enlaceWhatsApp } from "@/lib/whatsapp";

export default function LayoutSitio({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-white text-zinc-900">
      <header className="sticky top-0 z-10 border-b border-green-900/20 bg-green-950 text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link href="/" className="flex items-center gap-2 font-bold leading-tight">
            <span aria-hidden className="text-2xl">🌿</span>
            <span>
              Centro Botánico
              <span className="block text-xs font-normal text-green-200">Fuente de la Vida</span>
            </span>
          </Link>
          <nav aria-label="Principal" className="flex gap-4 text-sm">
            <Link href="/" className="hover:text-green-200">
              Catálogo
            </Link>
            <Link href="/local" className="hover:text-green-200">
              Visítanos
            </Link>
          </nav>
        </div>
      </header>

      <div className="flex-1">{children}</div>

      <PieDePagina />
    </div>
  );
}

async function PieDePagina() {
  const info = await obtenerInfoLocal();
  const telefono = info?.telefonos[0];

  return (
    <footer className="border-t border-zinc-200 bg-zinc-50 text-sm text-zinc-700">
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 sm:grid-cols-3">
        <div>
          <p className="font-semibold text-green-900">Centro Botánico Fuente de la Vida</p>
          <p className="mt-1">Productos naturistas en Cali.</p>
        </div>
        {info && (
          <address className="not-italic">
            <p>{info.direccion}</p>
            <Link href="/local" className="text-green-800 underline">
              Ver mapa y horarios
            </Link>
          </address>
        )}
        <div className="flex flex-wrap items-start gap-2">
          {info && (
            <a
              href={enlaceWhatsApp(info.whatsapp, "Hola, quisiera hacer una consulta.")}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full bg-green-700 px-4 py-2 font-semibold text-white hover:bg-green-800"
            >
              WhatsApp
            </a>
          )}
          {telefono && (
            <a href={`tel:${telefono.replace(/[^\d+]/g, "")}`} className="rounded-full border border-green-700 px-4 py-2 font-semibold text-green-800 hover:bg-green-50">
              Llamar
            </a>
          )}
        </div>
      </div>
      <p className="border-t border-zinc-200 px-4 py-3 text-center text-xs text-zinc-500">
        La información de este sitio no reemplaza la consulta con un profesional de la salud.
      </p>
    </footer>
  );
}

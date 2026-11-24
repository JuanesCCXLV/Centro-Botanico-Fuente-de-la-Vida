import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { obtenerCategorias, obtenerInfoLocal } from "@/lib/catalogo";
import { enlaceWhatsApp } from "@/lib/whatsapp";
import { MenuCategorias } from "./menu-categorias";

export default function LayoutSitio({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-white text-zinc-900">
      <header className="sticky top-0 z-20 text-white shadow-sm">
        <div className="bg-green-950">
          <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2">
            <Link href="/" className="flex items-center gap-3 font-bold leading-tight">
              <Image src="/logo-96.webp" alt="" width={44} height={43} unoptimized />
              <span>
                Centro Botánico
                <span className="block text-xs font-normal text-green-200">Fuente de la Vida</span>
              </span>
            </Link>
          </div>
        </div>
        <BarraSecciones />
      </header>

      <div className="flex-1">{children}</div>

      <PieDePagina />
    </div>
  );
}

/** Categorías que se muestran directo en la barra; todas están en el desplegable. */
const CATEGORIAS_EN_BARRA = 3;
const claseSeccion = "shrink-0 whitespace-nowrap px-3 py-2.5 hover:bg-white/10";

/** Barra de secciones (HU-02, HU-04): categorías creadas en el panel, el canal, el local y atención al cliente. */
async function BarraSecciones() {
  const [categorias, info] = await Promise.all([obtenerCategorias(), obtenerInfoLocal()]);

  return (
    <nav aria-label="Secciones del sitio" className="bg-lime-800 text-sm">
      <div className="mx-auto flex max-w-6xl items-stretch px-1 sm:px-2">
        <MenuCategorias categorias={categorias} />
        <div className="flex min-w-0 flex-1 items-stretch overflow-x-auto [scrollbar-width:none]">
          {categorias.slice(0, CATEGORIAS_EN_BARRA).map((c) => (
            <Link key={c.slug} href={`/?categoria=${encodeURIComponent(c.slug)}`} className={claseSeccion}>
              {c.nombre}
            </Link>
          ))}
          <Link href="/canal" className={`${claseSeccion} flex items-center gap-1.5`}>
            <span aria-hidden className="size-2 rounded-full bg-red-500" />
            URES TV
          </Link>
          <Link href="/local" className={claseSeccion}>
            Visítanos
          </Link>
          {info && (
            <a
              href={enlaceWhatsApp(info.whatsapp, "Hola, quisiera hacer una consulta.")}
              target="_blank"
              rel="noopener noreferrer"
              className={claseSeccion}
            >
              Atención al cliente
            </a>
          )}
        </div>
      </div>
    </nav>
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

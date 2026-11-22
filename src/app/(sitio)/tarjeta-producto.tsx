import Image from "next/image";
import Link from "next/link";
import { formatearCop } from "@/lib/formato";
import { buildWhatsAppLink } from "@/lib/whatsapp";
import { textoAlternativo, type ProductoPublico } from "@/services/catalogo.service";

/** HU-01: nombre, imagen y precio. HU-05: botón de WhatsApp en cada producto. */
export function TarjetaProducto({ producto, whatsapp }: { producto: ProductoPublico; whatsapp?: string }) {
  const frontal = producto.imagenes.find((i) => i.tipo === "FRONTAL") ?? producto.imagenes[0];
  const enlace = `/productos/${producto.slug}`;

  return (
    <article className="flex flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm transition hover:shadow-md">
      <Link href={enlace} className="relative block aspect-square bg-zinc-100">
        {frontal ? (
          <Image
            src={frontal.url}
            alt={textoAlternativo(producto, frontal)}
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
            className="object-contain p-2"
          />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center text-4xl" aria-hidden>
            🌿
          </span>
        )}
        {producto.destacado && (
          <span className="absolute left-2 top-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">
            Destacado
          </span>
        )}
      </Link>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <h2 className="text-sm font-semibold leading-snug sm:text-base">
          <Link href={enlace} className="hover:text-green-800">
            {producto.nombre}
          </Link>
        </h2>
        {producto.presentacion && <p className="text-xs text-zinc-500">{producto.presentacion}</p>}
        <p className="mt-auto pt-2 text-lg font-bold text-green-900">{formatearCop(producto.precioCop)}</p>
        {whatsapp && (
          <a
            href={buildWhatsAppLink(whatsapp, producto.nombre)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 rounded-full bg-green-700 px-3 py-2 text-center text-sm font-semibold text-white hover:bg-green-800"
          >
            Pedir por WhatsApp
          </a>
        )}
      </div>
    </article>
  );
}

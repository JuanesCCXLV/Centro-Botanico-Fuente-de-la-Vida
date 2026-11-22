import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { obtenerInfoLocal, obtenerProducto } from "@/lib/catalogo";
import { env } from "@/lib/env";
import { formatearCop } from "@/lib/formato";
import { absoluta, jsonLdProducto, resumen, serializarJsonLd } from "@/lib/seo";
import { buildWhatsAppLink } from "@/lib/whatsapp";
import { textoAlternativo } from "@/services/catalogo.service";
import { Galeria } from "./galeria";

export async function generateMetadata({ params }: PageProps<"/productos/[slug]">): Promise<Metadata> {
  const producto = await obtenerProducto((await params).slug);
  if (!producto) return { title: "Producto no encontrado", robots: { index: false } };

  const frontal = producto.imagenes.find((i) => i.tipo === "FRONTAL");
  const descripcion = resumen(producto.descripcion);
  return {
    title: producto.nombre,
    description: descripcion,
    alternates: { canonical: `/productos/${producto.slug}` },
    openGraph: {
      type: "website",
      title: producto.nombre,
      description: descripcion,
      images: frontal ? [{ url: absoluta(env.SITE_URL, frontal.url), alt: textoAlternativo(producto, frontal) }] : undefined,
    },
  };
}

export default function PaginaProducto({ params }: PageProps<"/productos/[slug]">) {
  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-zinc-100" aria-hidden />}>
        <Detalle params={params} />
      </Suspense>
    </main>
  );
}

async function Detalle({ params }: Pick<PageProps<"/productos/[slug]">, "params">) {
  const { slug } = await params;
  const [producto, info] = await Promise.all([obtenerProducto(slug), obtenerInfoLocal()]);
  // CP-02: un producto oculto (o de una categoría oculta) responde 404
  if (!producto) notFound();

  const telefono = info?.telefonos[0];
  const imagenes = producto.imagenes.map((img) => ({
    url: img.url,
    alt: textoAlternativo(producto, img),
    etiqueta: img.tipo === "FRONTAL" ? "frontal" : "posterior",
  }));

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializarJsonLd(jsonLdProducto(producto, env.SITE_URL)) }} />

      <nav aria-label="Ruta" className="mb-4 text-sm text-zinc-500">
        <Link href="/" className="hover:text-green-800">
          Catálogo
        </Link>
        {" / "}
        <Link href={`/?categoria=${producto.categoria.slug}`} className="hover:text-green-800">
          {producto.categoria.nombre}
        </Link>
      </nav>

      <div className="grid gap-8 md:grid-cols-2">
        <Galeria imagenes={imagenes} />

        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">{producto.nombre}</h1>
            {producto.presentacion && <p className="mt-1 text-zinc-600">{producto.presentacion}</p>}
          </div>

          <p className="text-3xl font-bold text-green-900">{formatearCop(producto.precioCop)}</p>

          <div className="flex flex-col gap-2 sm:flex-row">
            {info && (
              <a
                href={buildWhatsAppLink(info.whatsapp, producto.nombre)}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full bg-green-700 px-6 py-3 text-center font-semibold text-white hover:bg-green-800"
              >
                Pedir por WhatsApp
              </a>
            )}
            {telefono && (
              <a
                href={`tel:${telefono.replace(/[^\d+]/g, "")}`}
                className="rounded-full border border-green-700 px-6 py-3 text-center font-semibold text-green-800 hover:bg-green-50"
              >
                Llamar
              </a>
            )}
          </div>

          <section>
            <h2 className="mb-1 font-semibold">Descripción</h2>
            <p className="whitespace-pre-line text-zinc-700">{producto.descripcion}</p>
          </section>

          {producto.usoSugerido && (
            <section>
              <h2 className="mb-1 font-semibold">Uso sugerido</h2>
              <p className="whitespace-pre-line text-zinc-700">{producto.usoSugerido}</p>
            </section>
          )}

          {producto.registroSanitario && (
            <p className="text-sm text-zinc-600">
              <span className="font-medium">Registro sanitario:</span> {producto.registroSanitario}
            </p>
          )}

          <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            Esta información no reemplaza la consulta con un profesional de la salud.
          </p>
        </div>
      </div>
    </>
  );
}

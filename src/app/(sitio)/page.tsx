import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { obtenerCategorias, obtenerInfoLocal, obtenerProductos } from "@/lib/catalogo";
import { filtrarCatalogo } from "@/services/catalogo.service";
import { TarjetaProducto } from "./tarjeta-producto";

export default function PaginaCatalogo({ searchParams }: PageProps<"/">) {
  return (
    <main>
      <section className="relative isolate overflow-hidden bg-green-950 bg-[url(/fondo-768.webp)] bg-cover bg-center px-4 py-10 text-white sm:bg-[url(/fondo-1376.webp)] sm:py-12">
        {/* Capa oscura: mantiene el contraste del texto sobre la imagen (RNF-12) */}
        <div aria-hidden className="absolute inset-0 -z-10 bg-linear-to-r from-green-950/90 via-green-950/70 to-green-950/30" />
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-bold drop-shadow sm:text-4xl">Productos naturistas en Cali</h1>
            <p className="mt-2 max-w-xl text-green-50 drop-shadow">
              Consulta nuestro catálogo con precios y haz tu pedido por WhatsApp. Te esperamos en el barrio Colseguros.
            </p>
          </div>
          <Image
            src="/logo-320.webp"
            alt=""
            width={160}
            height={157}
            unoptimized
            className="hidden shrink-0 drop-shadow-lg sm:block"
          />
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-6">
        <Suspense fallback={<EsqueletoCatalogo />}>
          <Catalogo searchParams={searchParams} />
        </Suspense>
      </div>
    </main>
  );
}

const texto = (v: string | string[] | undefined) => (typeof v === "string" ? v.slice(0, 100) : undefined);

async function Catalogo({ searchParams }: Pick<PageProps<"/">, "searchParams">) {
  const parametros = await searchParams;
  const q = texto(parametros.q)?.trim() || undefined;
  const categoria = texto(parametros.categoria) || undefined;

  const [productos, categorias, info] = await Promise.all([obtenerProductos(), obtenerCategorias(), obtenerInfoLocal()]);
  const resultado = filtrarCatalogo(productos, { categoria, q });
  const enlaceCategoria = (slug?: string) => {
    const p = new URLSearchParams();
    if (slug) p.set("categoria", slug);
    if (q) p.set("q", q);
    const cadena = p.toString();
    return cadena ? `/?${cadena}` : "/";
  };

  return (
    <>
      <form action="/" role="search" className="mb-4 flex gap-2">
        {categoria && <input type="hidden" name="categoria" value={categoria} />}
        <label htmlFor="busqueda" className="sr-only">
          Buscar productos
        </label>
        <input
          id="busqueda"
          name="q"
          type="search"
          defaultValue={q}
          maxLength={100}
          placeholder="Buscar por nombre…"
          className="w-full rounded-full border border-zinc-300 px-4 py-2 focus:border-green-700 focus:outline-none focus:ring-2 focus:ring-green-700/30"
        />
        <button type="submit" className="rounded-full bg-green-800 px-5 py-2 font-semibold text-white hover:bg-green-900">
          Buscar
        </button>
      </form>

      <nav aria-label="Categorías" className="mb-6 flex gap-2 overflow-x-auto pb-2">
        {[{ slug: undefined, nombre: "Todos" }, ...categorias].map((c) => {
          const activa = c.slug === categoria;
          return (
            <Link
              key={c.slug ?? "todos"}
              href={enlaceCategoria(c.slug)}
              aria-current={activa ? "page" : undefined}
              className={`whitespace-nowrap rounded-full border px-4 py-1.5 text-sm ${
                activa ? "border-green-800 bg-green-800 text-white" : "border-zinc-300 hover:border-green-700 hover:text-green-800"
              }`}
            >
              {c.nombre}
            </Link>
          );
        })}
      </nav>

      {resultado.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 p-10 text-center text-zinc-600">
          <p className="font-medium">No encontramos productos{q ? ` para “${q}”` : ""}.</p>
          <p className="mt-1 text-sm">
            Prueba con otra palabra o{" "}
            <Link href="/" className="text-green-800 underline">
              mira todo el catálogo
            </Link>
            . También puedes preguntarnos por WhatsApp.
          </p>
        </div>
      ) : (
        <>
          <p className="mb-3 text-sm text-zinc-500" aria-live="polite">
            {resultado.length} {resultado.length === 1 ? "producto" : "productos"}
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
            {resultado.map((p) => (
              <TarjetaProducto key={p.id} producto={p} whatsapp={info?.whatsapp} />
            ))}
          </div>
        </>
      )}
    </>
  );
}

function EsqueletoCatalogo() {
  return (
    <div aria-hidden className="animate-pulse">
      <div className="mb-4 h-10 rounded-full bg-zinc-100" />
      <div className="mb-6 flex gap-2">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="h-8 w-24 rounded-full bg-zinc-100" />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="aspect-[3/4] rounded-xl bg-zinc-100" />
        ))}
      </div>
    </div>
  );
}

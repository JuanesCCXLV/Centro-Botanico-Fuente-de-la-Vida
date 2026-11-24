"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

type Categoria = { slug: string; nombre: string };

/**
 * Lista desplegable con todas las categorías (barra de secciones).
 * Usa <details>, así funciona sin JavaScript; con JavaScript se cierra al elegir
 * una opción, al pulsar fuera o con Escape (el encabezado no se recarga al navegar).
 */
export function MenuCategorias({ categorias }: { categorias: Categoria[] }) {
  const ref = useRef<HTMLDetailsElement>(null);
  const cerrar = () => ref.current?.removeAttribute("open");

  useEffect(() => {
    const cerrar = () => ref.current?.removeAttribute("open");
    const alPulsar = (e: PointerEvent) => {
      if (ref.current?.open && !ref.current.contains(e.target as Node)) cerrar();
    };
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === "Escape" && ref.current?.open) {
        cerrar();
        ref.current.querySelector("summary")?.focus();
      }
    };
    document.addEventListener("pointerdown", alPulsar);
    document.addEventListener("keydown", alTeclear);
    return () => {
      document.removeEventListener("pointerdown", alPulsar);
      document.removeEventListener("keydown", alTeclear);
    };
  }, []);

  return (
    <details ref={ref} className="group relative shrink-0">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2.5 font-semibold hover:bg-white/10 [&::-webkit-details-marker]:hidden">
        <svg aria-hidden viewBox="0 0 20 20" className="size-5 fill-current">
          <path d="M3 5h14v2H3zm0 4h14v2H3zm0 4h14v2H3z" />
        </svg>
        Categorías
        <svg aria-hidden viewBox="0 0 20 20" className="size-4 fill-current transition-transform group-open:rotate-180">
          <path d="M5.5 7.5 10 12l4.5-4.5z" />
        </svg>
      </summary>
      <ul className="absolute left-0 top-full z-30 mt-1 max-h-[70vh] w-64 overflow-y-auto rounded-lg border border-zinc-200 bg-white py-1 text-zinc-800 shadow-lg">
        <li>
          <Link href="/" onClick={cerrar} className="block px-4 py-2 font-medium hover:bg-green-50 hover:text-green-900">
            Todos los productos
          </Link>
        </li>
        {categorias.map((c) => (
          <li key={c.slug}>
            <Link href={`/?categoria=${encodeURIComponent(c.slug)}`} onClick={cerrar} className="block px-4 py-2 hover:bg-green-50 hover:text-green-900">
              {c.nombre}
            </Link>
          </li>
        ))}
      </ul>
    </details>
  );
}

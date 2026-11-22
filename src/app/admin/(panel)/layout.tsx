import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { Suspense } from "react";
import { cerrarSesion } from "@/app/admin/acciones-auth";
import { requireAdmin } from "@/lib/sesion";

export const metadata: Metadata = {
  title: "Panel de administración",
  robots: { index: false, follow: false },
};

const MENU = [
  { href: "/admin", texto: "Inicio" },
  { href: "/admin/productos", texto: "Productos" },
  { href: "/admin/categorias", texto: "Categorías" },
  { href: "/admin/local", texto: "Información del local" },
  { href: "/admin/cuenta", texto: "Mi cuenta" },
];

// Con cacheComponents, leer cookies() fuera de <Suspense> es un error de compilación.
export default function LayoutPanel({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<p className="p-8 text-zinc-600">Cargando…</p>}>
      <MarcoPanel>{children}</MarcoPanel>
    </Suspense>
  );
}

async function MarcoPanel({ children }: { children: ReactNode }) {
  // El layout NO es la única protección: cada página y cada Server Action
  // del panel también llama a requireAdmin() (RNF-04).
  const admin = await requireAdmin();

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="flex items-center justify-between border-b border-zinc-200 bg-green-900 px-6 py-3 text-white">
        <Link href="/admin" className="font-semibold">
          Centro Botánico · Administración
        </Link>
        <div className="flex items-center gap-4 text-sm">
          <Link href="/admin/cuenta" className="hidden hover:underline sm:inline">
            {admin.nombre}
          </Link>
          <form action={cerrarSesion}>
            <button type="submit" className="rounded-md border border-white/40 px-3 py-1 hover:bg-white/10">
              Cerrar sesión
            </button>
          </form>
        </div>
      </header>
      <div className="flex flex-1 flex-col md:flex-row">
        <nav aria-label="Menú del panel" className="border-b border-zinc-200 bg-zinc-50 md:w-52 md:border-b-0 md:border-r">
          <ul className="flex gap-1 overflow-x-auto p-2 md:flex-col md:p-4">
            {MENU.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="block whitespace-nowrap rounded-md px-3 py-2 text-sm hover:bg-green-100 hover:text-green-900"
                >
                  {item.texto}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}

import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Suspense } from "react";
import { cerrarSesion } from "@/app/admin/acciones-auth";
import { requireAdmin } from "@/lib/sesion";

export const metadata: Metadata = {
  title: "Panel de administración",
  robots: { index: false, follow: false },
};

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
        <span className="font-semibold">Centro Botánico · Administración</span>
        <div className="flex items-center gap-4 text-sm">
          <span>{admin.nombre}</span>
          <form action={cerrarSesion}>
            <button type="submit" className="rounded-md border border-white/40 px-3 py-1 hover:bg-white/10">
              Cerrar sesión
            </button>
          </form>
        </div>
      </header>
      <div className="flex-1">{children}</div>
    </div>
  );
}

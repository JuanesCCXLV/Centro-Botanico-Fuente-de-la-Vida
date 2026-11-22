import Link from "next/link";
import { Suspense } from "react";
import { requireAdmin } from "@/lib/sesion";

export default function PaginaPanel() {
  return (
    <Suspense fallback={null}>
      <Bienvenida />
    </Suspense>
  );
}

async function Bienvenida() {
  // Verificación propia de la página: no depender solo del layout
  const admin = await requireAdmin();
  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold text-green-900">Hola, {admin.nombre}</h1>
      <p className="mt-2 text-zinc-600">
        Desde el menú puedes gestionar los productos del catálogo. Pronto: categorías e información del local.
      </p>
      <Link href="/admin/productos" className="mt-6 inline-block rounded-md bg-green-800 px-4 py-2 font-semibold text-white hover:bg-green-900">
        Ir a productos
      </Link>
    </main>
  );
}

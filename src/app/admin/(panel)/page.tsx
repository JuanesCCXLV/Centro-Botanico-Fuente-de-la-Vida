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
        Aquí irán la gestión de productos, categorías e información del local.
      </p>
    </main>
  );
}

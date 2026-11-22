import { Suspense } from "react";
import { requireAdmin } from "@/lib/sesion";
import { FormularioCambioClave } from "./formulario-cambio-clave";

export default function PaginaCuenta() {
  return (
    <main className="p-8">
      <h1 className="mb-6 text-2xl font-bold text-green-900">Mi cuenta</h1>
      <Suspense fallback={null}>
        <Contenido />
      </Suspense>
    </main>
  );
}

async function Contenido() {
  const admin = await requireAdmin();
  return (
    <>
      <p className="mb-6 text-sm text-zinc-600">
        {admin.nombre} · {admin.correo}
      </p>
      <h2 className="mb-4 text-lg font-semibold">Cambiar contraseña</h2>
      <FormularioCambioClave />
    </>
  );
}

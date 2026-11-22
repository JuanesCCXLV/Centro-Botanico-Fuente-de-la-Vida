import { Suspense } from "react";
import { requireAdmin } from "@/lib/sesion";
import { crearCategoria } from "../acciones";
import { FormularioCategoria } from "../formulario-categoria";

export default function PaginaNuevaCategoria() {
  return (
    <main className="p-6 sm:p-8">
      <h1 className="mb-6 text-2xl font-bold text-green-900">Nueva categoría</h1>
      <Suspense fallback={null}>
        <Formulario />
      </Suspense>
    </main>
  );
}

async function Formulario() {
  await requireAdmin();
  return <FormularioCategoria accion={crearCategoria} />;
}

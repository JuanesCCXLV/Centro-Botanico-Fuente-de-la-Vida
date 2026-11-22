import Link from "next/link";
import { Suspense } from "react";
import { productoService } from "@/lib/productos";
import { requireAdmin } from "@/lib/sesion";
import { crearProducto } from "../acciones";
import { FormularioProducto } from "../formulario-producto";

export default function PaginaNuevoProducto() {
  return (
    <main className="p-6 sm:p-8">
      <h1 className="mb-6 text-2xl font-bold text-green-900">Nuevo producto</h1>
      <Suspense fallback={<p className="text-zinc-600">Cargando…</p>}>
        <Formulario />
      </Suspense>
    </main>
  );
}

async function Formulario() {
  await requireAdmin();
  const categorias = await productoService.listarCategorias();
  if (categorias.length === 0) {
    return (
      <p className="text-zinc-600">
        Primero crea al menos una categoría en{" "}
        <Link href="/admin/categorias/nueva" className="text-green-800 underline">
          Categorías
        </Link>
        .
      </p>
    );
  }
  return <FormularioProducto accion={crearProducto} categorias={categorias} />;
}

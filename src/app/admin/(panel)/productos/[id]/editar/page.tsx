import { notFound } from "next/navigation";
import { Suspense } from "react";
import { productoService } from "@/lib/productos";
import { requireAdmin } from "@/lib/sesion";
import { actualizarProducto } from "../../acciones";
import { FormularioProducto } from "../../formulario-producto";

export default function PaginaEditarProducto({ params }: PageProps<"/admin/productos/[id]/editar">) {
  return (
    <main className="p-6 sm:p-8">
      <h1 className="mb-6 text-2xl font-bold text-green-900">Editar producto</h1>
      <Suspense fallback={<p className="text-zinc-600">Cargando…</p>}>
        <Formulario params={params} />
      </Suspense>
    </main>
  );
}

async function Formulario({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const id = Number((await params).id);
  const [producto, categorias] = await Promise.all([
    productoService.obtenerParaEditar(id),
    productoService.listarCategorias(),
  ]);
  if (!producto) notFound();

  return <FormularioProducto accion={actualizarProducto.bind(null, id)} categorias={categorias} producto={producto} />;
}

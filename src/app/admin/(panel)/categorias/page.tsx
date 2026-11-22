import Link from "next/link";
import { Suspense } from "react";
import { categoriaService } from "@/lib/servicios-panel";
import { requireAdmin } from "@/lib/sesion";
import { cambiarVisibilidadCategoria, eliminarCategoria } from "./acciones";
import { BotonEliminarCategoria } from "./boton-eliminar-categoria";

export default function PaginaCategorias() {
  return (
    <main className="p-6 sm:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-green-900">Categorías</h1>
        <Link href="/admin/categorias/nueva" className="rounded-md bg-green-800 px-4 py-2 font-semibold text-white hover:bg-green-900">
          + Nueva categoría
        </Link>
      </div>
      <Suspense fallback={<p className="text-zinc-600">Cargando categorías…</p>}>
        <TablaCategorias />
      </Suspense>
    </main>
  );
}

async function TablaCategorias() {
  await requireAdmin();
  const categorias = await categoriaService.listar();

  if (categorias.length === 0) {
    return <p className="text-zinc-600">Todavía no hay categorías. Crea la primera para poder agregar productos.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200">
      <table className="w-full min-w-[560px] text-left text-sm">
        <thead className="bg-zinc-50 text-zinc-600">
          <tr>
            <th className="px-4 py-3 font-medium">Orden</th>
            <th className="px-4 py-3 font-medium">Categoría</th>
            <th className="px-4 py-3 text-right font-medium">Productos</th>
            <th className="px-4 py-3 font-medium">Estado</th>
            <th className="px-4 py-3 text-right font-medium">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200">
          {categorias.map((c) => (
            <tr key={c.id} className={c.visible ? "" : "bg-zinc-50 text-zinc-500"}>
              <td className="px-4 py-3 tabular-nums">{c.orden}</td>
              <td className="px-4 py-3">
                <span className="font-medium">{c.nombre}</span>
                {c.descripcion && <p className="text-xs text-zinc-500">{c.descripcion}</p>}
              </td>
              <td className="px-4 py-3 text-right tabular-nums">{c.cantidadProductos}</td>
              <td className="px-4 py-3">
                <form action={cambiarVisibilidadCategoria.bind(null, c.id, !c.visible)}>
                  <button
                    type="submit"
                    title={c.visible ? "Ocultar del catálogo" : "Mostrar en el catálogo"}
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      c.visible ? "bg-green-100 text-green-900 hover:bg-green-200" : "bg-zinc-200 text-zinc-700 hover:bg-zinc-300"
                    }`}
                  >
                    {c.visible ? "Visible" : "Oculta"}
                  </button>
                </form>
              </td>
              <td className="px-4 py-3 text-right">
                <div className="flex items-start justify-end gap-1">
                  <Link href={`/admin/categorias/${c.id}/editar`} className="rounded-md px-2 py-1 text-green-800 hover:bg-green-50">
                    Editar
                  </Link>
                  <BotonEliminarCategoria nombre={c.nombre} accion={eliminarCategoria.bind(null, c.id)} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="border-t border-zinc-200 bg-zinc-50 px-4 py-2 text-xs text-zinc-500">
        Ocultar una categoría la quita del catálogo junto con sus productos. Para eliminarla, primero mueve o elimina sus productos.
      </p>
    </div>
  );
}

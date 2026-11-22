import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { formatearCop } from "@/lib/formato";
import { productoService } from "@/lib/productos";
import { requireAdmin } from "@/lib/sesion";
import { cambiarVisibilidadProducto, eliminarProducto } from "./acciones";
import { BotonEliminar } from "./boton-eliminar";

export default function PaginaProductos() {
  return (
    <main className="p-6 sm:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-green-900">Productos</h1>
        <Link href="/admin/productos/nuevo" className="rounded-md bg-green-800 px-4 py-2 font-semibold text-white hover:bg-green-900">
          + Nuevo producto
        </Link>
      </div>
      <Suspense fallback={<p className="text-zinc-600">Cargando productos…</p>}>
        <TablaProductos />
      </Suspense>
    </main>
  );
}

async function TablaProductos() {
  await requireAdmin();
  const productos = await productoService.listar();

  if (productos.length === 0) {
    return <p className="text-zinc-600">Todavía no hay productos. Crea el primero con el botón “Nuevo producto”.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="bg-zinc-50 text-zinc-600">
          <tr>
            <th className="px-4 py-3 font-medium">Producto</th>
            <th className="px-4 py-3 font-medium">Categoría</th>
            <th className="px-4 py-3 text-right font-medium">Precio</th>
            <th className="px-4 py-3 font-medium">Estado</th>
            <th className="px-4 py-3 text-right font-medium">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-200">
          {productos.map((p) => (
            <tr key={p.id} className={p.visible ? "" : "bg-zinc-50 text-zinc-500"}>
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded bg-zinc-100">
                    {p.miniatura && <Image src={p.miniatura} alt="" fill sizes="48px" className="object-cover" />}
                  </div>
                  <span className="font-medium">
                    {p.nombre}
                    {p.destacado && <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-800">Destacado</span>}
                  </span>
                </div>
              </td>
              <td className="px-4 py-3">{p.categoria}</td>
              <td className="px-4 py-3 text-right tabular-nums">{formatearCop(p.precioCop)}</td>
              <td className="px-4 py-3">
                <form action={cambiarVisibilidadProducto.bind(null, p.id, !p.visible)}>
                  <button
                    type="submit"
                    title={p.visible ? "Ocultar del catálogo" : "Mostrar en el catálogo"}
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      p.visible ? "bg-green-100 text-green-900 hover:bg-green-200" : "bg-zinc-200 text-zinc-700 hover:bg-zinc-300"
                    }`}
                  >
                    {p.visible ? "Visible" : "Oculto"}
                  </button>
                </form>
              </td>
              <td className="px-4 py-3 text-right">
                <div className="flex justify-end gap-1">
                  <Link href={`/admin/productos/${p.id}/editar`} className="rounded-md px-2 py-1 text-green-800 hover:bg-green-50">
                    Editar
                  </Link>
                  <BotonEliminar nombre={p.nombre} accion={eliminarProducto.bind(null, p.id)} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

import { notFound } from "next/navigation";
import { Suspense } from "react";
import { categoriaService } from "@/lib/servicios-panel";
import { requireAdmin } from "@/lib/sesion";
import { actualizarCategoria } from "../../acciones";
import { FormularioCategoria } from "../../formulario-categoria";

export default function PaginaEditarCategoria({ params }: PageProps<"/admin/categorias/[id]/editar">) {
  return (
    <main className="p-6 sm:p-8">
      <h1 className="mb-6 text-2xl font-bold text-green-900">Editar categoría</h1>
      <Suspense fallback={<p className="text-zinc-600">Cargando…</p>}>
        <Formulario params={params} />
      </Suspense>
    </main>
  );
}

async function Formulario({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const id = Number((await params).id);
  const categoria = await categoriaService.obtener(id);
  if (!categoria) notFound();
  return <FormularioCategoria accion={actualizarCategoria.bind(null, id)} categoria={categoria} />;
}

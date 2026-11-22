"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { EstadoFormularioCategoria } from "./acciones";

type CategoriaInicial = { nombre: string; descripcion: string | null; orden: number; visible: boolean };

const claseCampo =
  "w-full rounded-md border border-zinc-300 px-3 py-2 text-base focus:border-green-700 focus:outline-none focus:ring-2 focus:ring-green-700/30";

function MensajeError({ mensaje }: { mensaje?: string }) {
  return mensaje ? <p className="mt-1 text-sm text-red-700">{mensaje}</p> : null;
}

export function FormularioCategoria({
  accion,
  categoria,
}: {
  accion: (estado: EstadoFormularioCategoria, formData: FormData) => Promise<EstadoFormularioCategoria>;
  categoria?: CategoriaInicial;
}) {
  const [estado, enviar, pendiente] = useActionState(accion, {});
  const e = estado.errores ?? {};
  const v = estado.valores;
  const val = (campo: "nombre" | "descripcion" | "orden") =>
    v ? (v[campo] ?? "") : categoria ? String(categoria[campo] ?? "") : "";
  const visible = v ? v.visible === "on" : (categoria?.visible ?? true);

  return (
    <form action={enviar} className="flex max-w-xl flex-col gap-4">
      {e.general && (
        <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {e.general}
        </p>
      )}
      <label className="flex flex-col gap-1 text-sm font-medium">
        Nombre
        <input name="nombre" required maxLength={60} defaultValue={val("nombre")} className={claseCampo} />
        <MensajeError mensaje={e.nombre} />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Descripción (opcional)
        <textarea name="descripcion" rows={3} maxLength={500} defaultValue={val("descripcion")} className={claseCampo} />
        <MensajeError mensaje={e.descripcion} />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Orden en el catálogo
        <input name="orden" type="number" min={0} max={999} defaultValue={val("orden") || "0"} className={`${claseCampo} max-w-32`} />
        <span className="text-xs font-normal text-zinc-500">Las de número menor aparecen primero.</span>
        <MensajeError mensaje={e.orden} />
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="visible" defaultChecked={visible} className="h-4 w-4 accent-green-800" />
        Visible en el catálogo
      </label>
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={pendiente}
          className="rounded-md bg-green-800 px-5 py-2 font-semibold text-white hover:bg-green-900 disabled:opacity-60"
        >
          {pendiente ? "Guardando…" : categoria ? "Guardar cambios" : "Crear categoría"}
        </button>
        <Link href="/admin/categorias" className="rounded-md border border-zinc-300 px-5 py-2 hover:bg-zinc-50">
          Cancelar
        </Link>
      </div>
    </form>
  );
}

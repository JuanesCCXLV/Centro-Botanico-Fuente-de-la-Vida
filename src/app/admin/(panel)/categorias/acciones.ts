"use server";

import { revalidatePath, updateTag } from "next/cache";
import { TAG_CATALOGO } from "@/lib/catalogo-tags";
import { redirect } from "next/navigation";
import { obtenerIp } from "@/lib/ip";
import { categoriaService } from "@/lib/servicios-panel";
import { requireAdmin } from "@/lib/sesion";
import { leerDatosCategoria } from "@/lib/validaciones/categoria";
import type { ErroresCampos } from "@/lib/validaciones/comunes";

const RUTA_LISTA = "/admin/categorias";

export type EstadoFormularioCategoria = { errores?: ErroresCampos; valores?: Record<string, string> };

function valoresTexto(formData: FormData): Record<string, string> {
  const valores: Record<string, string> = {};
  for (const [clave, valor] of formData) if (typeof valor === "string" && !clave.startsWith("$")) valores[clave] = valor;
  return valores;
}

async function guardar(formData: FormData, id?: number): Promise<EstadoFormularioCategoria> {
  const admin = await requireAdmin();
  const valores = valoresTexto(formData);
  const lectura = leerDatosCategoria(formData);
  if (!lectura.ok) return { errores: lectura.errores, valores };

  const ctx = { usuarioId: admin.id, ip: await obtenerIp() };
  const r =
    id === undefined
      ? await categoriaService.crear(lectura.datos, ctx)
      : await categoriaService.actualizar(id, lectura.datos, ctx);
  if (!r.ok) return { errores: r.errores, valores };

  updateTag(TAG_CATALOGO);
  revalidatePath(RUTA_LISTA);
  redirect(RUTA_LISTA);
}

export async function crearCategoria(_p: EstadoFormularioCategoria, formData: FormData) {
  return guardar(formData);
}

export async function actualizarCategoria(id: number, _p: EstadoFormularioCategoria, formData: FormData) {
  return guardar(formData, id);
}

export async function cambiarVisibilidadCategoria(id: number, visible: boolean): Promise<void> {
  const admin = await requireAdmin();
  await categoriaService.cambiarVisibilidad(id, visible, { usuarioId: admin.id, ip: await obtenerIp() });
  updateTag(TAG_CATALOGO);
  revalidatePath(RUTA_LISTA);
}

/** Devuelve un mensaje para mostrar si no se pudo eliminar (CP-18). */
export async function eliminarCategoria(id: number): Promise<{ error?: string }> {
  const admin = await requireAdmin();
  const r = await categoriaService.eliminar(id, { usuarioId: admin.id, ip: await obtenerIp() });
  if (!r.ok) {
    if (r.error === "TIENE_PRODUCTOS") {
      const productos = r.cantidad === 1 ? "1 producto" : `${r.cantidad} productos`;
      return { error: `No se puede eliminar: tiene ${productos}. Muévelos a otra categoría o elimínalos primero.` };
    }
    return { error: "La categoría ya no existe." };
  }
  updateTag(TAG_CATALOGO);
  revalidatePath(RUTA_LISTA);
  return {};
}

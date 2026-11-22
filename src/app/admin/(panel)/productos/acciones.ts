"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { obtenerIp } from "@/lib/ip";
import { productoService } from "@/lib/productos";
import { requireAdmin } from "@/lib/sesion";
import { leerDatosProducto, type ErroresCampos } from "@/lib/validaciones/producto";
import { TIPOS_IMAGEN, type ImagenesEntrada, type ResultadoGuardar } from "@/services/producto.service";

const RUTA_LISTA = "/admin/productos";

export type EstadoFormularioProducto = {
  errores?: ErroresCampos;
  /** Lo enviado, para no perder lo escrito cuando hay errores (React reinicia el formulario). */
  valores?: Record<string, string>;
};

async function leerImagenes(formData: FormData): Promise<ImagenesEntrada> {
  const resultado: ImagenesEntrada = {};
  for (const tipo of TIPOS_IMAGEN) {
    const archivo = formData.get(`imagen${tipo}`);
    if (archivo instanceof File && archivo.size > 0) {
      resultado[tipo] = { bytes: new Uint8Array(await archivo.arrayBuffer()), tipoMime: archivo.type };
    }
  }
  return resultado;
}

function valoresTexto(formData: FormData): Record<string, string> {
  const valores: Record<string, string> = {};
  for (const [clave, valor] of formData) if (typeof valor === "string" && !clave.startsWith("$")) valores[clave] = valor;
  return valores;
}

async function guardar(formData: FormData, id?: number): Promise<EstadoFormularioProducto> {
  const admin = await requireAdmin();
  const valores = valoresTexto(formData);

  const lectura = leerDatosProducto(formData);
  if (!lectura.ok) return { errores: lectura.errores, valores };

  const ctx = { usuarioId: admin.id, ip: await obtenerIp() };
  const imagenes = await leerImagenes(formData);

  let resultado: ResultadoGuardar;
  try {
    resultado =
      id === undefined
        ? await productoService.crear(lectura.datos, imagenes, ctx)
        : await productoService.actualizar(id, lectura.datos, imagenes, ctx);
  } catch (e) {
    console.error("Error al guardar el producto", e);
    return { errores: { general: "No se pudo guardar el producto. Intenta de nuevo en unos minutos." }, valores };
  }
  if (!resultado.ok) return { errores: resultado.errores, valores };

  revalidatePath(RUTA_LISTA);
  redirect(RUTA_LISTA);
}

export async function crearProducto(
  _previo: EstadoFormularioProducto,
  formData: FormData,
): Promise<EstadoFormularioProducto> {
  return guardar(formData);
}

export async function actualizarProducto(
  id: number,
  _previo: EstadoFormularioProducto,
  formData: FormData,
): Promise<EstadoFormularioProducto> {
  return guardar(formData, id);
}

export async function cambiarVisibilidadProducto(id: number, visible: boolean): Promise<void> {
  const admin = await requireAdmin();
  await productoService.cambiarVisibilidad(id, visible, { usuarioId: admin.id, ip: await obtenerIp() });
  revalidatePath(RUTA_LISTA);
}

export async function eliminarProducto(id: number): Promise<void> {
  const admin = await requireAdmin();
  await productoService.eliminar(id, { usuarioId: admin.id, ip: await obtenerIp() });
  revalidatePath(RUTA_LISTA);
}

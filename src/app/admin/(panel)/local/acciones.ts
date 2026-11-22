"use server";

import { updateTag } from "next/cache";
import { TAG_CATALOGO } from "@/lib/catalogo-tags";
import { obtenerIp } from "@/lib/ip";
import { infoLocalService } from "@/lib/servicios-panel";
import { requireAdmin } from "@/lib/sesion";
import type { ErroresCampos } from "@/lib/validaciones/comunes";
import { leerDatosInfoLocal } from "@/lib/validaciones/info-local";

export type EstadoFormularioLocal = { errores?: ErroresCampos; exito?: string; valores?: Record<string, string> };

export async function guardarInfoLocal(_p: EstadoFormularioLocal, formData: FormData): Promise<EstadoFormularioLocal> {
  const admin = await requireAdmin();
  const valores: Record<string, string> = {};
  for (const [clave, valor] of formData) if (typeof valor === "string" && !clave.startsWith("$")) valores[clave] = valor;

  const lectura = leerDatosInfoLocal(formData);
  if (!lectura.ok) return { errores: lectura.errores, valores };

  await infoLocalService.guardar(lectura.datos, { usuarioId: admin.id, ip: await obtenerIp() });
  updateTag(TAG_CATALOGO);
  return { exito: "Información del local actualizada.", valores };
}

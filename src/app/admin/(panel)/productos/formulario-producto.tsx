"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState, useState, type ChangeEvent } from "react";
import type { EstadoFormularioProducto } from "./acciones";

type Categoria = { id: number; nombre: string };
type ProductoInicial = {
  nombre: string;
  descripcion: string;
  presentacion: string | null;
  usoSugerido: string | null;
  precioCop: number;
  categoriaId: number;
  registroSanitario: string | null;
  visible: boolean;
  destacado: boolean;
  imagenes: { tipo: "FRONTAL" | "POSTERIOR"; url: string }[];
};

type EstadoConIntento = EstadoFormularioProducto & { intento?: number };

type Props = {
  accion: (estado: EstadoFormularioProducto, formData: FormData) => Promise<EstadoFormularioProducto>;
  categorias: Categoria[];
  producto?: ProductoInicial;
};

const LADO_MAX = 1600;
const claseCampo =
  "w-full rounded-md border border-zinc-300 px-3 py-2 text-base focus:border-green-700 focus:outline-none focus:ring-2 focus:ring-green-700/30";

/**
 * Reduce la foto en el navegador antes de enviarla (máx. 1600 px, WebP o JPEG).
 * Una foto de celular de 6 MB queda en unos cientos de KB; además Vercel rechaza peticiones de más de 4.5 MB (Netlify, de más de 6 MB).
 * Si el navegador no puede procesarla, se envía el original y el servidor decide.
 */
async function reducirImagen(archivo: File): Promise<File> {
  try {
    const bitmap = await createImageBitmap(archivo);
    const escala = Math.min(1, LADO_MAX / Math.max(bitmap.width, bitmap.height));
    const lienzo = document.createElement("canvas");
    lienzo.width = Math.round(bitmap.width * escala);
    lienzo.height = Math.round(bitmap.height * escala);
    lienzo.getContext("2d")?.drawImage(bitmap, 0, 0, lienzo.width, lienzo.height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((r) => lienzo.toBlob(r, "image/webp", 0.85));
    if (!blob || blob.size >= archivo.size) return archivo;
    const extension = blob.type === "image/webp" ? "webp" : blob.type === "image/png" ? "png" : "jpg";
    return new File([blob], `${archivo.name.replace(/\.[^.]+$/, "")}.${extension}`, { type: blob.type });
  } catch {
    return archivo;
  }
}

function MensajeError({ mensaje }: { mensaje?: string }) {
  return mensaje ? <p className="mt-1 text-sm text-red-700">{mensaje}</p> : null;
}

function CampoImagen({
  tipo,
  etiqueta,
  actual,
  error,
  obligatoria,
}: {
  tipo: "FRONTAL" | "POSTERIOR";
  etiqueta: string;
  actual?: string;
  error?: string;
  obligatoria: boolean;
}) {
  const [vistaPrevia, setVistaPrevia] = useState<string | null>(null);
  const [procesando, setProcesando] = useState(false);

  async function alCambiar(e: ChangeEvent<HTMLInputElement>) {
    const input = e.currentTarget;
    const original = input.files?.[0];
    if (!original) return setVistaPrevia(null);
    setProcesando(true);
    const reducida = await reducirImagen(original);
    const transferencia = new DataTransfer();
    transferencia.items.add(reducida);
    input.files = transferencia.files;
    setVistaPrevia(URL.createObjectURL(reducida));
    setProcesando(false);
  }

  const mostrar = vistaPrevia ?? actual;
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium">
        {etiqueta} {obligatoria && <span className="text-red-700">*</span>}
      </span>
      <div className="relative flex h-40 w-40 items-center justify-center overflow-hidden rounded-md border border-dashed border-zinc-300 bg-zinc-50">
        {mostrar ? (
          <Image src={mostrar} alt={`Vista previa ${etiqueta.toLowerCase()}`} fill sizes="160px" className="object-contain" unoptimized />
        ) : (
          <span className="px-2 text-center text-xs text-zinc-500">Sin imagen</span>
        )}
      </div>
      <input
        type="file"
        name={`imagen${tipo}`}
        accept="image/jpeg,image/png,image/webp"
        onChange={alCambiar}
        className="text-sm file:mr-3 file:rounded-md file:border-0 file:bg-green-100 file:px-3 file:py-1.5 file:text-green-900"
      />
      <span className="text-xs text-zinc-500">
        {procesando ? "Preparando imagen…" : actual ? "Elige un archivo solo si quieres reemplazarla." : "JPG, PNG o WebP."}
      </span>
      <MensajeError mensaje={error} />
    </div>
  );
}

export function FormularioProducto({ accion, categorias, producto }: Props) {
  // Envoltura en el cliente para contar los envíos: tras cada intento se reinician
  // las vistas previas, porque React vacía los campos de archivo al terminar la acción.
  const [estado, enviar, pendiente] = useActionState<EstadoConIntento, FormData>(
    async (previo, formData) => ({ ...(await accion(previo, formData)), intento: (previo.intento ?? 0) + 1 }),
    {},
  );
  const e = estado.errores ?? {};
  const v = estado.valores;
  // Tras un error se muestran los valores enviados; si no, los del producto (o vacío al crear)
  const val = (campo: keyof ProductoInicial, porDefecto = "") =>
    v ? (v[campo] ?? "") : producto ? String(producto[campo] ?? "") : porDefecto;
  const marcado = (campo: "visible" | "destacado", porDefecto: boolean) =>
    v ? v[campo] === "on" : producto ? producto[campo] : porDefecto;
  const imagenActual = (tipo: "FRONTAL" | "POSTERIOR") => producto?.imagenes.find((i) => i.tipo === tipo)?.url;
  const hayErrores = Object.keys(e).length > 0;

  return (
    <form action={enviar} className="flex max-w-3xl flex-col gap-6">
      {hayErrores && (
        <div role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {e.general ?? "Revisa los campos marcados."} Si habías elegido imágenes, vuelve a seleccionarlas.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm font-medium sm:col-span-2">
          Nombre <span className="sr-only">(obligatorio)</span>
          <input name="nombre" required maxLength={120} defaultValue={val("nombre")} className={claseCampo} />
          <MensajeError mensaje={e.nombre} />
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium">
          Precio (COP)
          <input name="precioCop" required inputMode="numeric" placeholder="15000" defaultValue={val("precioCop")} className={claseCampo} />
          <MensajeError mensaje={e.precioCop} />
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium">
          Categoría
          <select name="categoriaId" required defaultValue={val("categoriaId")} className={claseCampo}>
            <option value="">Elige una categoría</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
          <MensajeError mensaje={e.categoriaId} />
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium">
          Presentación
          <input name="presentacion" maxLength={120} placeholder="Frasco x 60 cápsulas" defaultValue={val("presentacion")} className={claseCampo} />
          <MensajeError mensaje={e.presentacion} />
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium">
          Registro sanitario (opcional)
          <input name="registroSanitario" maxLength={60} defaultValue={val("registroSanitario")} className={claseCampo} />
          <MensajeError mensaje={e.registroSanitario} />
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium sm:col-span-2">
          Descripción
          <textarea name="descripcion" required rows={5} maxLength={5000} defaultValue={val("descripcion")} className={claseCampo} />
          <span className="text-xs font-normal text-zinc-500">
            No incluyas promesas de curación ni efectos terapéuticos.
          </span>
          <MensajeError mensaje={e.descripcion} />
        </label>

        <label className="flex flex-col gap-1 text-sm font-medium sm:col-span-2">
          Uso sugerido (opcional)
          <textarea name="usoSugerido" rows={3} maxLength={2000} defaultValue={val("usoSugerido")} className={claseCampo} />
          <MensajeError mensaje={e.usoSugerido} />
        </label>
      </div>

      <div className="flex flex-wrap gap-8">
        <CampoImagen key={`FRONTAL-${estado.intento ?? 0}`} tipo="FRONTAL" etiqueta="Imagen frontal" actual={imagenActual("FRONTAL")} error={e.imagenFRONTAL} obligatoria={!producto} />
        <CampoImagen key={`POSTERIOR-${estado.intento ?? 0}`} tipo="POSTERIOR" etiqueta="Imagen posterior" actual={imagenActual("POSTERIOR")} error={e.imagenPOSTERIOR} obligatoria={false} />
      </div>

      <div className="flex flex-col gap-2">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="visible" defaultChecked={marcado("visible", true)} className="h-4 w-4 accent-green-800" />
          Visible en el catálogo
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="destacado" defaultChecked={marcado("destacado", false)} className="h-4 w-4 accent-green-800" />
          Destacado
        </label>
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={pendiente}
          className="rounded-md bg-green-800 px-5 py-2 font-semibold text-white hover:bg-green-900 disabled:opacity-60"
        >
          {pendiente ? "Guardando…" : producto ? "Guardar cambios" : "Crear producto"}
        </button>
        <Link href="/admin/productos" className="rounded-md border border-zinc-300 px-5 py-2 hover:bg-zinc-50">
          Cancelar
        </Link>
      </div>
    </form>
  );
}

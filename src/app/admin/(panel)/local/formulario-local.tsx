"use client";

import { useActionState } from "react";
import { guardarInfoLocal, type EstadoFormularioLocal } from "./acciones";

/** Valores iniciales ya convertidos a texto para los campos del formulario. */
export type ValoresLocal = Record<
  | "direccion"
  | "telefonos"
  | "whatsapp"
  | "correo"
  | "horarios"
  | "latitud"
  | "longitud"
  | "instagram"
  | "facebook"
  | "tiktok",
  string
>;

const claseCampo =
  "w-full rounded-md border border-zinc-300 px-3 py-2 text-base focus:border-green-700 focus:outline-none focus:ring-2 focus:ring-green-700/30";

function MensajeError({ mensaje }: { mensaje?: string }) {
  return mensaje ? <p className="mt-1 text-sm text-red-700">{mensaje}</p> : null;
}

export function FormularioLocal({ iniciales }: { iniciales: ValoresLocal }) {
  const [estado, enviar, pendiente] = useActionState<EstadoFormularioLocal, FormData>(guardarInfoLocal, {});
  const e = estado.errores ?? {};
  const val = (campo: keyof ValoresLocal) => estado.valores?.[campo] ?? iniciales[campo];

  return (
    <form action={enviar} className="flex max-w-3xl flex-col gap-6">
      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 text-lg font-semibold">Ubicación y horarios</legend>
        <label className="flex flex-col gap-1 text-sm font-medium sm:col-span-2">
          Dirección
          <input name="direccion" required maxLength={200} defaultValue={val("direccion")} className={claseCampo} />
          <MensajeError mensaje={e.direccion} />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium sm:col-span-2">
          Horarios
          <textarea
            name="horarios"
            required
            rows={4}
            maxLength={500}
            placeholder={"Lunes a viernes: 8:00 a. m. – 6:00 p. m.\nSábados: 8:00 a. m. – 1:00 p. m."}
            defaultValue={val("horarios")}
            className={claseCampo}
          />
          <MensajeError mensaje={e.horarios} />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Latitud (opcional)
          <input name="latitud" inputMode="decimal" placeholder="3.4372" defaultValue={val("latitud")} className={claseCampo} />
          <MensajeError mensaje={e.latitud} />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Longitud (opcional)
          <input name="longitud" inputMode="decimal" placeholder="-76.5225" defaultValue={val("longitud")} className={claseCampo} />
          <MensajeError mensaje={e.longitud} />
        </label>
        <p className="text-xs text-zinc-500 sm:col-span-2">
          Para el mapa: en Google Maps, clic derecho sobre el local y copia los dos números que aparecen arriba.
        </p>
      </fieldset>

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 text-lg font-semibold">Contacto</legend>
        <label className="flex flex-col gap-1 text-sm font-medium">
          WhatsApp
          <input name="whatsapp" required inputMode="tel" placeholder="573001234567" defaultValue={val("whatsapp")} className={claseCampo} />
          <span className="text-xs font-normal text-zinc-500">Con indicativo del país (57), sin espacios ni +.</span>
          <MensajeError mensaje={e.whatsapp} />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Correo (opcional)
          <input name="correo" type="email" maxLength={254} defaultValue={val("correo")} className={claseCampo} />
          <MensajeError mensaje={e.correo} />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium sm:col-span-2">
          Teléfonos
          <textarea name="telefonos" rows={3} defaultValue={val("telefonos")} className={claseCampo} />
          <span className="text-xs font-normal text-zinc-500">Uno por línea, máximo 5.</span>
          <MensajeError mensaje={e.telefonos} />
        </label>
      </fieldset>

      <fieldset className="grid gap-4">
        <legend className="mb-2 text-lg font-semibold">Redes sociales (opcional)</legend>
        {(
          [
            ["instagram", "Instagram", "https://www.instagram.com/..."],
            ["facebook", "Facebook", "https://www.facebook.com/..."],
            ["tiktok", "TikTok", "https://www.tiktok.com/@..."],
          ] as const
        ).map(([campo, etiqueta, ejemplo]) => (
          <label key={campo} className="flex flex-col gap-1 text-sm font-medium">
            {etiqueta}
            <input name={campo} type="url" placeholder={ejemplo} defaultValue={val(campo)} className={claseCampo} />
            <MensajeError mensaje={e[campo]} />
          </label>
        ))}
      </fieldset>

      <p aria-live="polite" className={`min-h-6 text-sm ${Object.keys(e).length ? "text-red-700" : "text-green-800"}`}>
        {Object.keys(e).length ? "Revisa los campos marcados." : estado.exito}
      </p>

      <button
        type="submit"
        disabled={pendiente}
        className="self-start rounded-md bg-green-800 px-5 py-2 font-semibold text-white hover:bg-green-900 disabled:opacity-60"
      >
        {pendiente ? "Guardando…" : "Guardar"}
      </button>
    </form>
  );
}

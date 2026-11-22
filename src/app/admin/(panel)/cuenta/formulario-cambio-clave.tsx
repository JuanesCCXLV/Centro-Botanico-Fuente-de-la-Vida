"use client";

import { useActionState } from "react";
import { cambiarContrasena, type EstadoCambioClave } from "@/app/admin/acciones-auth";

const estadoInicial: EstadoCambioClave = {};

const claseCampo =
  "rounded-md border border-zinc-300 px-3 py-2 text-base focus:border-green-700 focus:outline-none focus:ring-2 focus:ring-green-700/30";

export function FormularioCambioClave() {
  const [estado, accion, pendiente] = useActionState(cambiarContrasena, estadoInicial);

  return (
    <form action={accion} className="flex max-w-sm flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm font-medium">
        Contraseña actual
        <input name="actual" type="password" autoComplete="current-password" required maxLength={256} className={claseCampo} />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Nueva contraseña
        <input name="nueva" type="password" autoComplete="new-password" required minLength={12} maxLength={256} className={claseCampo} />
        <span className="text-xs font-normal text-zinc-500">Mínimo 12 caracteres. Se recomienda una frase o un gestor de contraseñas.</span>
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Confirmar nueva contraseña
        <input name="confirmacion" type="password" autoComplete="new-password" required maxLength={256} className={claseCampo} />
      </label>

      <p aria-live="polite" className={`min-h-10 text-sm ${estado.error ? "text-red-700" : "text-green-800"}`}>
        {estado.error ?? estado.exito}
      </p>

      <button
        type="submit"
        disabled={pendiente}
        className="rounded-md bg-green-800 px-4 py-2 font-semibold text-white hover:bg-green-900 disabled:opacity-60"
      >
        {pendiente ? "Guardando…" : "Cambiar contraseña"}
      </button>
    </form>
  );
}

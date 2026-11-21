"use client";

import { useActionState } from "react";
import { iniciarSesion, type EstadoLogin } from "@/app/admin/acciones-auth";

const estadoInicial: EstadoLogin = {};

export function FormularioLogin() {
  const [estado, accion, pendiente] = useActionState(iniciarSesion, estadoInicial);

  return (
    <form action={accion} className="flex flex-col gap-4" noValidate>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Correo
        <input
          name="correo"
          type="email"
          autoComplete="username"
          required
          maxLength={254}
          className="rounded-md border border-zinc-300 px-3 py-2 text-base focus:border-green-700 focus:outline-none focus:ring-2 focus:ring-green-700/30"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Contraseña
        <input
          name="clave"
          type="password"
          autoComplete="current-password"
          required
          maxLength={256}
          className="rounded-md border border-zinc-300 px-3 py-2 text-base focus:border-green-700 focus:outline-none focus:ring-2 focus:ring-green-700/30"
        />
      </label>

      <p aria-live="polite" className="min-h-10 text-sm text-red-700">
        {estado.error}
      </p>

      <button
        type="submit"
        disabled={pendiente}
        className="rounded-md bg-green-800 px-4 py-2 font-semibold text-white hover:bg-green-900 disabled:opacity-60"
      >
        {pendiente ? "Ingresando…" : "Ingresar"}
      </button>
    </form>
  );
}

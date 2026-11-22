"use client";

import { useTransition } from "react";

/** CP-17: pide confirmación antes de eliminar. */
export function BotonEliminar({ nombre, accion }: { nombre: string; accion: () => Promise<void> }) {
  const [pendiente, iniciar] = useTransition();

  return (
    <button
      type="button"
      disabled={pendiente}
      onClick={() => {
        if (window.confirm(`¿Eliminar "${nombre}"? Se borrarán también sus imágenes. Esta acción no se puede deshacer.`)) {
          iniciar(() => accion());
        }
      }}
      className="rounded-md px-2 py-1 text-red-700 hover:bg-red-50 disabled:opacity-60"
    >
      {pendiente ? "Eliminando…" : "Eliminar"}
    </button>
  );
}

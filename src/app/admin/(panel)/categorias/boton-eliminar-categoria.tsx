"use client";

import { useState, useTransition } from "react";

export function BotonEliminarCategoria({
  nombre,
  accion,
}: {
  nombre: string;
  accion: () => Promise<{ error?: string }>;
}) {
  const [pendiente, iniciar] = useTransition();
  const [error, setError] = useState<string>();

  return (
    <span className="inline-flex flex-col items-end">
      <button
        type="button"
        disabled={pendiente}
        onClick={() => {
          setError(undefined);
          if (window.confirm(`¿Eliminar la categoría "${nombre}"?`)) {
            iniciar(async () => {
              const r = await accion();
              if (r.error) setError(r.error);
            });
          }
        }}
        className="rounded-md px-2 py-1 text-red-700 hover:bg-red-50 disabled:opacity-60"
      >
        {pendiente ? "Eliminando…" : "Eliminar"}
      </button>
      {error && (
        <span role="alert" className="max-w-64 text-right text-xs text-red-700">
          {error}
        </span>
      )}
    </span>
  );
}

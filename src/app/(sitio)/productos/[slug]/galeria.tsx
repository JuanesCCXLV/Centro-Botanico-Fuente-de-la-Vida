"use client";

import Image from "next/image";
import { useState } from "react";

type ImagenGaleria = { url: string; alt: string; etiqueta: string };

/** Imagen frontal y posterior con selector (prototipo de detalle móvil). */
export function Galeria({ imagenes }: { imagenes: ImagenGaleria[] }) {
  const [actual, setActual] = useState(0);
  const imagen = imagenes[actual];

  if (!imagen) {
    return (
      <div className="flex aspect-square items-center justify-center rounded-xl bg-zinc-100 text-6xl" aria-hidden>
        🌿
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="relative aspect-square overflow-hidden rounded-xl border border-zinc-200 bg-white">
        <Image src={imagen.url} alt={imagen.alt} fill priority sizes="(min-width: 768px) 50vw, 100vw" className="object-contain p-4" />
      </div>
      {imagenes.length > 1 && (
        <div className="flex gap-2" role="group" aria-label="Elegir imagen">
          {imagenes.map((img, i) => (
            <button
              key={img.url}
              type="button"
              onClick={() => setActual(i)}
              aria-pressed={i === actual}
              className={`relative h-20 w-20 overflow-hidden rounded-lg border-2 bg-white ${
                i === actual ? "border-green-700" : "border-zinc-200 hover:border-zinc-400"
              }`}
            >
              <Image src={img.url} alt="" fill sizes="80px" className="object-contain p-1" />
              <span className="sr-only">Ver imagen {img.etiqueta}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

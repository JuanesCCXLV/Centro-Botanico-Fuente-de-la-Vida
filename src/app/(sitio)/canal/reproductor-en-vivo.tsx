"use client";

import { useState, useSyncExternalStore } from "react";

const sinSuscripcion = () => () => {};
const navegadorSoportaHls = () => document.createElement("video").canPlayType("application/vnd.apple.mpegurl") !== "";

/**
 * Reproductor de la señal en vivo (HLS) con el reproductor nativo del navegador:
 * Safari, Chrome y Edge (escritorio desde la versión 142, Android e iOS). Firefox de
 * escritorio no lo trae; en ese caso se ofrece la app o abrir el sitio en otro navegador.
 * preload="none": no descarga video hasta que la persona pulsa reproducir, para no
 * consumir la capacidad del servidor del canal con visitas que no lo ven.
 */
export function ReproductorEnVivo({ senal, appUrl }: { senal: string; appUrl: string }) {
  // En el servidor se asume que sí (se muestra el reproductor); en el navegador se comprueba.
  const soportaHls = useSyncExternalStore(sinSuscripcion, navegadorSoportaHls, () => true);
  const [sinSenal, setSinSenal] = useState(false);
  const estado = !soportaHls ? "sin-soporte" : sinSenal ? "sin-senal" : "listo";

  return (
    <div className="overflow-hidden rounded-xl bg-black shadow-lg">
      {estado === "listo" ? (
        <video
          src={senal}
          controls
          playsInline
          preload="none"
          poster="/canal-portada.webp"
          onError={() => setSinSenal(true)}
          className="aspect-video w-full bg-black"
          aria-label="Señal en vivo de URES TV"
        />
      ) : (
        <div role="status" className="flex aspect-video flex-col items-center justify-center gap-3 p-6 text-center text-white">
          <p className="text-lg font-semibold">
            {estado === "sin-soporte"
              ? "Tu navegador no puede reproducir la señal en vivo."
              : "La señal no está disponible en este momento."}
          </p>
          <p className="max-w-md text-sm text-zinc-300">
            {estado === "sin-soporte"
              ? "Ábrela en Chrome, Edge o Safari, o mira el canal en la app."
              : "Intenta de nuevo en unos minutos o mira el canal en la app."}
          </p>
          <a
            href={appUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full bg-green-700 px-5 py-2 font-semibold text-white hover:bg-green-600"
          >
            Descargar la app
          </a>
        </div>
      )}
    </div>
  );
}

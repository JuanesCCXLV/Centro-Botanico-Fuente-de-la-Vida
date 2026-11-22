import { Suspense } from "react";
import { infoLocalService } from "@/lib/servicios-panel";
import { requireAdmin } from "@/lib/sesion";
import { FormularioLocal, type ValoresLocal } from "./formulario-local";

export default function PaginaInfoLocal() {
  return (
    <main className="p-6 sm:p-8">
      <h1 className="mb-2 text-2xl font-bold text-green-900">Información del local</h1>
      <p className="mb-6 text-sm text-zinc-600">Estos datos se muestran en el sitio público y en los botones de contacto.</p>
      <Suspense fallback={<p className="text-zinc-600">Cargando…</p>}>
        <Contenido />
      </Suspense>
    </main>
  );
}

async function Contenido() {
  await requireAdmin();
  const info = await infoLocalService.obtener();

  const iniciales: ValoresLocal = {
    direccion: info?.direccion ?? "",
    telefonos: info?.telefonos.join("\n") ?? "",
    whatsapp: info?.whatsapp ?? "",
    correo: info?.correo ?? "",
    horarios: info?.horarios ?? "",
    latitud: info?.latitud?.toString() ?? "",
    longitud: info?.longitud?.toString() ?? "",
    instagram: info?.redesSociales.instagram ?? "",
    facebook: info?.redesSociales.facebook ?? "",
    tiktok: info?.redesSociales.tiktok ?? "",
  };

  return <FormularioLocal iniciales={iniciales} />;
}

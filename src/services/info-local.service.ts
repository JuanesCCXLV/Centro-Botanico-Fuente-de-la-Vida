import type { DatosInfoLocal } from "@/lib/validaciones/info-local";
import type { Contexto, EventoRepo } from "./eventos";

export interface InfoLocalRepo {
  /** Registro único (id = 1); null si todavía no se ha configurado. */
  obtener(): Promise<DatosInfoLocal | null>;
  guardar(datos: DatosInfoLocal): Promise<void>;
}

export function crearInfoLocalService(deps: { infoLocal: InfoLocalRepo; eventos: EventoRepo }) {
  return {
    obtener: () => deps.infoLocal.obtener(),

    /** HU-10 / CP-20 */
    async guardar(datos: DatosInfoLocal, ctx: Contexto = {}): Promise<void> {
      await deps.infoLocal.guardar(datos);
      await deps.eventos.registrar({
        tipo: "INFO_LOCAL_EDITADA",
        usuarioId: ctx.usuarioId,
        ip: ctx.ip,
        recurso: "info_local",
      });
    },
  };
}

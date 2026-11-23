// Tipos de auditoría compartidos por los servicios (CS-11).

export type TipoEvento =
  | "LOGIN_EXITOSO"
  | "LOGIN_FALLIDO"
  | "LOGIN_LIMITADO"
  | "LOGOUT"
  | "CAMBIO_CONTRASENA"
  | "PRODUCTO_CREADO"
  | "PRODUCTO_EDITADO"
  | "PRODUCTO_VISIBILIDAD"
  | "PRODUCTO_ELIMINADO"
  | "CATEGORIA_CREADA"
  | "CATEGORIA_EDITADA"
  | "CATEGORIA_VISIBILIDAD"
  | "CATEGORIA_ELIMINADA"
  | "INFO_LOCAL_EDITADA"
  | "ADMIN_CREADO"
  | "ADMIN_CLAVE_RESTABLECIDA"
  | "ADMIN_DESACTIVADO"
  | "ADMIN_ACTIVADO";

export interface EventoRepo {
  registrar(evento: {
    tipo: TipoEvento;
    usuarioId?: string | null;
    ip?: string | null;
    recurso?: string | null;
  }): Promise<void>;
  contarPorIpDesde(tipo: TipoEvento, ip: string, desde: Date): Promise<number>;
}

/** Datos de la petición que los servicios usan para auditoría y límites. */
export type Contexto = { ip?: string | null; usuarioId?: string | null };

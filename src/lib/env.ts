import { validarEntorno } from "./env-esquema";

export type { Entorno } from "./env-esquema";

export const env = validarEntorno(process.env);

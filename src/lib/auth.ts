import { crearAuthService } from "@/services/auth.service";
import { usuarioRepository } from "@/repositories/usuario.repository";
import { sesionRepository } from "@/repositories/sesion.repository";
import { eventoRepository } from "@/repositories/evento.repository";

export const authService = crearAuthService({
  usuarios: usuarioRepository,
  sesiones: sesionRepository,
  eventos: eventoRepository,
});

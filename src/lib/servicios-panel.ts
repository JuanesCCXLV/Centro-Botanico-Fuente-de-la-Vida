import { categoriaAdminRepository } from "@/repositories/categoria.repository";
import { eventoRepository } from "@/repositories/evento.repository";
import { infoLocalRepository } from "@/repositories/info-local.repository";
import { crearCategoriaService } from "@/services/categoria.service";
import { crearInfoLocalService } from "@/services/info-local.service";

export const categoriaService = crearCategoriaService({ categorias: categoriaAdminRepository, eventos: eventoRepository });
export const infoLocalService = crearInfoLocalService({ infoLocal: infoLocalRepository, eventos: eventoRepository });

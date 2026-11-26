import { api } from '../../../shared/lib/api-client';
import type {
  BeneficiosPlanAdmin,
  CoberturaCatalogoAdmin,
  CompletitudContenido,
  ContenidoPlanAdmin,
  GuardarBeneficiosRequest,
  GuardarBeneficiosResponse,
  GuardarContenidoRequest,
  GuardarContenidoResponse,
  GuardarCoberturaCatalogoRequest,
} from '../../../shared/types/api';

/** Contenido comercial de los planes (solo ADMINISTRADOR). Cada guardado deja rastro en la bitácora (RN-46). */

export const obtenerContenidoPlanAdmin = (planId: string) => api.get(`admin/planes/${planId}/contenido`).json<ContenidoPlanAdmin>();

/** Reemplaza TODO el contenido del plan en una transacción. */
export const guardarContenidoPlan = (planId: string, body: GuardarContenidoRequest) =>
  api.put(`admin/planes/${planId}/contenido`, { json: body }).json<GuardarContenidoResponse>();

export const listarCoberturasCatalogo = () => api.get('admin/coberturas').json<CoberturaCatalogoAdmin[]>();

/** Crea la cobertura si el código no existe; si existe, la reemplaza. */
export const guardarCoberturaCatalogo = (codigo: string, body: GuardarCoberturaCatalogoRequest) =>
  api.put(`admin/coberturas/${codigo}`, { json: body }).json<CoberturaCatalogoAdmin>();

export const obtenerCompletitudContenido = () => api.get('admin/contenido-planes/completitud').json<CompletitudContenido>();

/** Beneficios de un plan (solo lo que ofrece) y el catálogo de beneficios que se pueden asignar. */
export const obtenerBeneficiosPlanAdmin = (planId: string) => api.get(`admin/planes/${planId}/beneficios`).json<BeneficiosPlanAdmin>();

/** Reemplaza los beneficios del plan en una transacción; avisa si el plan superior no cumple la escalera. */
export const guardarBeneficiosPlan = (planId: string, body: GuardarBeneficiosRequest) =>
  api.put(`admin/planes/${planId}/beneficios`, { json: body }).json<GuardarBeneficiosResponse>();

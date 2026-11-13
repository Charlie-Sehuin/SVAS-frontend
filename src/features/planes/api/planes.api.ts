import { api } from '../../../shared/lib/api-client';
import type { ComparacionPlanes, ContenidoPlan } from '../../../shared/types/api';

/** Públicas: no piden sesión ni token de cotización (RN-46). */
export const obtenerContenidoPlan = (planId: string) => api.get(`planes/${planId}/contenido`).json<ContenidoPlan>();

export const compararPlanes = (ids: string[]) =>
  api.get('planes/comparar', { searchParams: { ids: ids.join(',') } }).json<ComparacionPlanes>();

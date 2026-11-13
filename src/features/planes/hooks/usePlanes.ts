import { useQuery } from '@tanstack/react-query';
import { qk } from '../../../shared/lib/query-keys';
import { STALE } from '../../../shared/lib/query-client';
import * as api from '../api/planes.api';

/** Contenido de UN plan. Solo se pide cuando la persona abre el detalle (`planId` distinto de `null`). */
export const usePlanContenido = (planId: string | null) =>
  useQuery({
    queryKey: qk.planes.contenido(planId ?? ''),
    queryFn: () => api.obtenerContenidoPlan(planId!),
    enabled: !!planId,
    staleTime: STALE.contenidoPlanes,
  });

/** Matriz de 2 a 3 planes. Con menos de 2 no se pide nada (el backend respondería 400). */
export const useCompararPlanes = (ids: string[]) =>
  useQuery({
    queryKey: qk.planes.comparar(ids),
    queryFn: () => api.compararPlanes(ids),
    enabled: ids.length >= 2,
    staleTime: STALE.contenidoPlanes,
  });

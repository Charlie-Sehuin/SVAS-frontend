import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { qk } from '../../../shared/lib/query-keys';
import * as admin from '../api/contenido.admin.api';

export const useContenidoPlanAdmin = (planId: string | undefined) =>
  useQuery({
    queryKey: qk.admin.contenido.plan(planId ?? ''),
    queryFn: () => admin.obtenerContenidoPlanAdmin(planId!),
    enabled: !!planId,
    staleTime: 0,
  });

/**
 * `PUT /admin/planes/:planId/contenido`. Lo guardado ya viene en la respuesta (con sus advertencias), así que reemplaza la
 * caché del plan. Además se refrescan la completitud, la lista de planes (puede cambiar si se puede activar) y el contenido
 * público, que el cliente ve en el detalle y el comparador.
 */
export function useGuardarContenidoPlan(planId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Parameters<typeof admin.guardarContenidoPlan>[1]) => admin.guardarContenidoPlan(planId, body),
    onSuccess: (r) => {
      qc.setQueryData(qk.admin.contenido.plan(planId), r);
      void qc.invalidateQueries({ queryKey: qk.admin.contenido.completitud });
      void qc.invalidateQueries({ queryKey: qk.admin.planes });
      void qc.invalidateQueries({ queryKey: qk.planes.contenido(planId) });
      void qc.invalidateQueries({ queryKey: ['planes', 'comparar'] });
    },
  });
}

export const useCoberturasCatalogo = () =>
  useQuery({ queryKey: qk.admin.contenido.coberturas, queryFn: admin.listarCoberturasCatalogo });

/** Cambiar el catálogo cambia qué exige cada plan: se refrescan los contenidos y la completitud. */
export function useGuardarCoberturaCatalogo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { codigo: string; body: Parameters<typeof admin.guardarCoberturaCatalogo>[1] }) =>
      admin.guardarCoberturaCatalogo(v.codigo, v.body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.admin.contenido.coberturas });
      void qc.invalidateQueries({ queryKey: ['admin', 'contenido'] });
      void qc.invalidateQueries({ queryKey: ['planes'] });
    },
  });
}

export const useCompletitudContenido = () =>
  useQuery({ queryKey: qk.admin.contenido.completitud, queryFn: admin.obtenerCompletitudContenido });

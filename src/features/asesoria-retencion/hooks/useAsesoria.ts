import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { qk } from '../../../shared/lib/query-keys';
import { STALE } from '../../../shared/lib/query-client';
import * as api from '../api/asesoria.api';

/** `POST /asesorias` (CLIENTE dueño de la cotización). Sin reintento automático. */
export function useSolicitarAsesoria() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.solicitarAsesoria,
    onSuccess: () => {
      // Si el mismo usuario ve la cola (p. ej. en pruebas), se actualiza.
      void qc.invalidateQueries({ queryKey: ['asesorias', 'cola'] });
    },
  });
}

/** Cola del asesor. Se refresca cada 30 s solo mientras la pestaña está visible (arquitectura §9.1). */
export const useColaAsesoria = (filtros: { estado?: Parameters<typeof api.listarCola>[0]['estado']; origen?: Parameters<typeof api.listarCola>[0]['origen'] }) =>
  useQuery({
    queryKey: qk.asesorias.cola({ estado: filtros.estado, origen: filtros.origen }),
    queryFn: () => api.listarCola(filtros),
    staleTime: STALE.colas,
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
  });

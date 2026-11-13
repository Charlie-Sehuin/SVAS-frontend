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

/** Detalle de una solicitud (cliente, primas, descuentos y el tope vigente). */
export const useSolicitudDetalle = (id: string | undefined) =>
  useQuery({
    queryKey: qk.asesorias.detalle(id ?? ''),
    queryFn: () => api.obtenerSolicitud(id!),
    enabled: !!id,
    staleTime: STALE.colas,
  });

/** El caso se actualiza en la lista y en el detalle después de cualquier acción del asesor. */
function useRefrescarCaso(id: string) {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: qk.asesorias.detalle(id) });
    void qc.invalidateQueries({ queryKey: ['asesorias', 'cola'] });
  };
}

/** `POST /asesorias/:id/tomar`. Si otro asesor la tomó antes, el backend responde 409 y la cola se refresca. */
export function useTomarSolicitud() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.tomarSolicitud(id),
    onSettled: (_r, _e, id) => {
      void qc.invalidateQueries({ queryKey: ['asesorias', 'cola'] });
      void qc.invalidateQueries({ queryKey: qk.asesorias.detalle(id) });
    },
  });
}

/** `POST /asesorias/:id/descuentos`. El tope (RN-07) y la no acumulación (RN-09) los valida el backend. */
export function useAplicarDescuento(id: string) {
  const refrescar = useRefrescarCaso(id);
  return useMutation({
    mutationFn: (body: Parameters<typeof api.aplicarDescuento>[1]) => api.aplicarDescuento(id, body),
    onSuccess: refrescar,
  });
}

/** `POST /asesorias/:id/resultado`: cierra el caso con su resultado y si el cliente aceptó. */
export function useCerrarSolicitud(id: string) {
  const refrescar = useRefrescarCaso(id);
  return useMutation({
    mutationFn: (body: Parameters<typeof api.cerrarSolicitud>[1]) => api.cerrarSolicitud(id, body),
    onSuccess: refrescar,
  });
}

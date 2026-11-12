import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { qk } from '../../../shared/lib/query-keys';
import { STALE } from '../../../shared/lib/query-client';
import { useCotizacionTokenStore } from '../../../shared/stores/useCotizacionTokenStore';
import type { ActualizarSumaResponse, ResumenCotizacionResponse } from '../../../shared/types/api';
import { useAuth } from '../../../auth/useAuth';
import * as cotizacionApi from '../api/cotizacion.api';

/**
 * `POST /cotizaciones`. Guarda el `tokenAcceso` (sessionStorage) y siembra la caché del resumen con la
 * propia respuesta, así el comparativo se pinta sin una segunda petición.
 */
export function useCotizar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: cotizacionApi.crearCotizacion,
    onSuccess: (r) => {
      useCotizacionTokenStore.getState().guardar(r.cotizacion.id, r.tokenAcceso);
      const resumen: ResumenCotizacionResponse = { cotizacion: r.cotizacion, ...(r.warning ? { warning: r.warning } : {}) };
      qc.setQueryData(qk.cotizacion.resumen(r.cotizacion.id), resumen);
    },
  });
}

/** `GET /cotizaciones/:id/resumen`. staleTime 30 s. */
export const useResumenCotizacion = (id: string | undefined) =>
  useQuery({
    queryKey: qk.cotizacion.resumen(id ?? ''),
    queryFn: () => cotizacionApi.obtenerResumen(id!),
    enabled: !!id,
    staleTime: STALE.resumenCotizacion,
  });

/**
 * Ajustar la suma de UNA aseguradora (RN-37). El backend responde con las primas nuevas de esa aseguradora:
 * se reemplazan en la caché por `id` y las demás no se tocan. Nunca se calcula nada en el navegador.
 * Si llega `SIMULACION_DESACTUALIZADA`, la Prueba de Choque guardada deja de estar vigente y se refresca.
 */
export function useActualizarSuma(cotizacionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { aseguradoraId: string; sumaAsegurada: string }) =>
      cotizacionApi.actualizarSuma(cotizacionId, v.aseguradoraId, v.sumaAsegurada),
    onSuccess: (r: ActualizarSumaResponse) => {
      qc.setQueryData<ResumenCotizacionResponse>(qk.cotizacion.resumen(cotizacionId), (previo) => {
        if (!previo) return previo;
        const nuevas = new Map(r.primas.map((p) => [p.id, p]));
        return {
          ...previo,
          cotizacion: { ...previo.cotizacion, primas: previo.cotizacion.primas.map((p) => nuevas.get(p.id) ?? p) },
        };
      });
      if (r.warning?.code === 'SIMULACION_DESACTUALIZADA') {
        void qc.invalidateQueries({ queryKey: qk.pruebaChoque.ultima(cotizacionId) });
      }
    },
  });
}

/** Cotizaciones del CLIENTE (`GET /cotizaciones/mias`). */
export function useMisCotizaciones() {
  const { estado, roles } = useAuth();
  return useQuery({
    queryKey: qk.cotizacion.mias,
    queryFn: cotizacionApi.listarMisCotizaciones,
    enabled: estado === 'autenticado' && roles.includes('CLIENTE'),
  });
}

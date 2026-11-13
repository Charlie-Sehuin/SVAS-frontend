import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { qk } from '../../../shared/lib/query-keys';
import { STALE } from '../../../shared/lib/query-client';
import { guardarArchivo } from '../../../shared/lib/descarga';
import type { SimulacionResponse } from '../../../shared/types/api';
import type { UsoVehiculo } from '../../../shared/types/enums';
import { WarningToast } from '../../../shared/ui/domain/toasts';
import * as api from '../api/pruebaChoque.api';

/** Catálogo público de escenarios (nombres en lenguaje llano para los chips de preocupación y la matriz). */
export const useEscenarios = (uso: UsoVehiculo | undefined) =>
  useQuery({
    queryKey: qk.pruebaChoque.escenarios(uso ?? ''),
    queryFn: () => api.listarEscenarios(uso),
    enabled: !!uso,
    staleTime: STALE.catalogo,
  });

/** Última simulación. `data === null` significa "aún no hay" (la pantalla abre las preguntas). */
export const useUltimaSimulacion = (cotizacionId: string | undefined) =>
  useQuery({
    queryKey: qk.pruebaChoque.ultima(cotizacionId ?? ''),
    queryFn: () => api.obtenerUltimaSimulacion(cotizacionId!),
    enabled: !!cotizacionId,
    staleTime: 0,
  });

/**
 * `POST /cotizaciones/:id/prueba-choque`. Guarda el resultado en la caché y, si faltan datos de cobertura (RN-30),
 * muestra el aviso ámbar: la simulación sí se hizo.
 */
export function useEjecutarPruebaChoque(cotizacionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (perfil: Parameters<typeof api.ejecutarPruebaChoque>[1]) => api.ejecutarPruebaChoque(cotizacionId, perfil),
    onSuccess: (r) => {
      // El POST puede traer `warning`; el GET no. Se guarda solo la simulación, como lo devuelve el GET.
      const guardada: SimulacionResponse = { simulacion: r.simulacion };
      qc.setQueryData(qk.pruebaChoque.ultima(cotizacionId), guardada);
      if (r.warning) WarningToast(r.warning, `warning-${cotizacionId}-${r.warning.code}`);
    },
  });
}

/** Descarga el resumen de 1 página (PDF). */
export function useDescargarResumen(cotizacionId: string) {
  return useMutation({
    mutationFn: () => api.descargarResumenPdf(cotizacionId),
    onSuccess: ({ blob, nombreArchivo }) => guardarArchivo(blob, nombreArchivo),
  });
}

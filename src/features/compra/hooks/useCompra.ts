import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../../auth/useAuth';
import { qk } from '../../../shared/lib/query-keys';
import { WarningToast } from '../../../shared/ui/domain/toasts';
import * as compraApi from '../api/compra.api';
import { guardarArchivo } from '../lib/descarga';

/** `GET /compras/resumen`. Sin `staleTime` largo: el descuento y los montos vienen del backend y son lo que se paga. */
export const useResumenCompra = (cotizacionId: string | undefined, primaCotizadaId: string | null, habilitado = true) =>
  useQuery({
    queryKey: qk.compra.resumen(cotizacionId ?? '', primaCotizadaId ?? ''),
    queryFn: () => compraApi.obtenerResumenCompra(cotizacionId!, primaCotizadaId!),
    enabled: habilitado && !!cotizacionId && !!primaCotizadaId,
    staleTime: 0,
  });

export const useCamposFaltantes = (cotizacionId: string | undefined, habilitado = true) =>
  useQuery({
    queryKey: qk.compra.camposFaltantes(cotizacionId ?? ''),
    queryFn: () => compraApi.obtenerCamposFaltantes(cotizacionId!),
    enabled: habilitado && !!cotizacionId,
    staleTime: 0,
  });

/** `PUT /compras/:cotizacionId/datos`: el backend responde con lo que aún falta, que reemplaza la caché. */
export function useGuardarDatosCompra(cotizacionId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (datos: Parameters<typeof compraApi.guardarDatosCompra>[1]) => compraApi.guardarDatosCompra(cotizacionId, datos),
    onSuccess: (r) => qc.setQueryData(qk.compra.camposFaltantes(cotizacionId), { campos: r.camposFaltantes }),
  });
}

/** `POST /compras`: crea la orden (congela montos y contenido del plan, RN-45). */
export function useCrearCompra() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: compraApi.crearCompra,
    onSuccess: (orden) => {
      qc.setQueryData(qk.compra.estado(orden.ordenId), orden);
      // La cotización ya tiene orden: su resumen (y el bloqueo de la suma, RN-37) cambia.
      void qc.invalidateQueries({ queryKey: qk.cotizacion.resumen(orden.cotizacionId) });
    },
  });
}

/** `POST /compras/:id/pago`. Sin reintento automático: lo repite la persona con la misma `Idempotency-Key`. */
export function usePagar(ordenId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { body: Parameters<typeof compraApi.pagarCompra>[1]; idempotencyKey: string }) =>
      compraApi.pagarCompra(ordenId, v.body, v.idempotencyKey),
    onSuccess: (r) => {
      void qc.invalidateQueries({ queryKey: qk.compra.estado(ordenId) });
      void qc.invalidateQueries({ queryKey: qk.polizas.mias });
      void qc.invalidateQueries({ queryKey: qk.cotizacion.mias });
      if (r.warning) WarningToast(r.warning, 'pdf-en-generacion');
    },
  });
}

export const useEstadoCompra = (ordenId: string | undefined) =>
  useQuery({
    queryKey: qk.compra.estado(ordenId ?? ''),
    queryFn: () => compraApi.obtenerEstadoCompra(ordenId!),
    enabled: !!ordenId,
    staleTime: 0,
  });

/** Pólizas del CLIENTE (`GET /polizas/mias`). */
export function useMisPolizas() {
  const { estado, roles } = useAuth();
  return useQuery({
    queryKey: qk.polizas.mias,
    queryFn: compraApi.listarMisPolizas,
    enabled: estado === 'autenticado' && roles.includes('CLIENTE'),
  });
}

/**
 * Descarga el PDF de una póliza. Si el backend responde 202 (`PDF_EN_GENERACION`) se avisa con un toast ámbar:
 * la compra y la póliza ya existen, solo falta el archivo; la persona puede volver a pulsar en unos segundos.
 */
export function useDescargarPoliza() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (v: { polizaId: string; numero: string }) => compraApi.descargarPdfPoliza(v.polizaId, `poliza-${v.numero}.pdf`),
    onSuccess: (r) => {
      if (r.listo) {
        guardarArchivo(r.blob, r.nombreArchivo);
        // El PDF ya quedó generado: las pantallas que dicen "se está generando" se actualizan.
        void qc.invalidateQueries({ queryKey: qk.polizas.mias });
      } else {
        WarningToast(r.warning, 'pdf-en-generacion');
      }
    },
  });
}

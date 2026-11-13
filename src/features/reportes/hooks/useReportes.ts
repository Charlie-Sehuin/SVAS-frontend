import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query';
import { guardarArchivo } from '../../../shared/lib/descarga';
import { qk } from '../../../shared/lib/query-keys';
import type { AgruparVentas, PeriodoReporte } from '../../../shared/types/api';
import * as api from '../api/reportes.api';

/**
 * Los reportes cambian con cada venta o seguimiento, pero no al segundo: 30 s de frescura y se conserva lo anterior
 * mientras llega el periodo nuevo (la pantalla no parpadea al cambiar de fechas). `habilitado = false` evita pedir un
 * periodo que ya se sabe inválido (la pantalla lo explica sin llamar al backend).
 */
const opciones = { staleTime: 30_000, placeholderData: keepPreviousData } as const;
const filtros = (p: PeriodoReporte, extra: Record<string, string> = {}) => ({ desde: p.desde, hasta: p.hasta, ...extra });

export const useVentas = (p: PeriodoReporte, agrupar: AgruparVentas, habilitado = true) =>
  useQuery({ queryKey: qk.reportes('ventas', filtros(p, { agrupar })), queryFn: () => api.obtenerVentas(p, agrupar), enabled: habilitado, ...opciones });

export const useRetencion = (p: PeriodoReporte, habilitado = true) =>
  useQuery({ queryKey: qk.reportes('retencion', filtros(p)), queryFn: () => api.obtenerRetencion(p), enabled: habilitado, ...opciones });

export const useDescuentos = (p: PeriodoReporte, habilitado = true) =>
  useQuery({ queryKey: qk.reportes('descuentos', filtros(p)), queryFn: () => api.obtenerDescuentos(p), enabled: habilitado, ...opciones });

export const useImpactoPruebaChoque = (p: PeriodoReporte, habilitado = true) =>
  useQuery({ queryKey: qk.reportes('prueba-choque', filtros(p)), queryFn: () => api.obtenerImpactoPruebaChoque(p), enabled: habilitado, ...opciones });

export const useMiDesempeno = (p: PeriodoReporte, habilitado = true) =>
  useQuery({ queryKey: qk.reportes('mi-desempeno', filtros(p)), queryFn: () => api.obtenerMiDesempeno(p), enabled: habilitado, ...opciones });

/** Descarga el PDF del reporte de ventas del periodo y la agrupación en pantalla. */
export function useDescargarVentasPdf() {
  return useMutation({
    mutationFn: (v: { periodo: PeriodoReporte; agrupar: AgruparVentas }) => api.descargarVentasPdf(v.periodo, v.agrupar),
    onSuccess: ({ blob, nombreArchivo }) => guardarArchivo(blob, nombreArchivo),
  });
}

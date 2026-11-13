import { api } from '../../../shared/lib/api-client';
import { qs } from '../../../shared/lib/forms';
import type {
  AgruparVentas,
  PeriodoReporte,
  ReporteDescuentos,
  ReporteImpactoPruebaChoque,
  ReporteMiDesempeno,
  ReporteRetencion,
  ReporteVentas,
} from '../../../shared/types/api';

/** Funciones puras sobre `api-client` (arquitectura §6.7). Sin fechas, el backend usa el mes en curso. */

const periodo = (p: PeriodoReporte) => qs({ desde: p.desde, hasta: p.hasta });

export const obtenerVentas = (p: PeriodoReporte, agrupar: AgruparVentas) =>
  api.get('admin/reportes/ventas', { searchParams: qs({ desde: p.desde, hasta: p.hasta, agrupar }) }).json<ReporteVentas>();

/** El mismo reporte de ventas dibujado como PDF (RF-30). */
export async function descargarVentasPdf(p: PeriodoReporte, agrupar: AgruparVentas): Promise<{ blob: Blob; nombreArchivo: string }> {
  const res = await api.get('admin/reportes/ventas', { searchParams: qs({ desde: p.desde, hasta: p.hasta, agrupar, formato: 'pdf' }) });
  const m = /filename="?([^";]+)"?/i.exec(res.headers.get('Content-Disposition') ?? '');
  return { blob: await res.blob(), nombreArchivo: m?.[1] ?? 'reporte-de-ventas.pdf' };
}

export const obtenerRetencion = (p: PeriodoReporte) =>
  api.get('admin/reportes/retencion', { searchParams: periodo(p) }).json<ReporteRetencion>();

export const obtenerDescuentos = (p: PeriodoReporte) =>
  api.get('admin/reportes/descuentos', { searchParams: periodo(p) }).json<ReporteDescuentos>();

export const obtenerImpactoPruebaChoque = (p: PeriodoReporte) =>
  api.get('admin/reportes/prueba-choque', { searchParams: periodo(p) }).json<ReporteImpactoPruebaChoque>();

export const obtenerMiDesempeno = (p: PeriodoReporte) =>
  api.get('asesor/reportes/mi-desempeno', { searchParams: periodo(p) }).json<ReporteMiDesempeno>();

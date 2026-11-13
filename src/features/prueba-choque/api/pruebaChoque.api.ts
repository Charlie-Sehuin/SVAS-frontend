import { api, isApiError } from '../../../shared/lib/api-client';
import type { EscenarioCatalogo, SimulacionResponse, SimularRequest } from '../../../shared/types/api';
import type { UsoVehiculo } from '../../../shared/types/enums';

/** Funciones puras sobre `api-client` (arquitectura §6.7). La simulación la calcula el backend; aquí solo se pide y se pinta. */

/** Público. Con `uso`, cada escenario trae su probabilidad de referencia. */
export const listarEscenarios = (uso?: UsoVehiculo) =>
  api.get('prueba-choque/escenarios', { searchParams: uso ? { uso } : {} }).json<EscenarioCatalogo[]>();

/** Última simulación guardada, o `null` si la cotización todavía no tiene (el backend responde 404). */
export async function obtenerUltimaSimulacion(cotizacionId: string): Promise<SimulacionResponse | null> {
  try {
    return await api.get(`cotizaciones/${cotizacionId}/prueba-choque`).json<SimulacionResponse>();
  } catch (e) {
    if (isApiError(e) && e.statusCode === 404) return null;
    throw e;
  }
}

/** Con el token de la cotización (anónimo) o con la sesión del CLIENTE dueño. */
export const ejecutarPruebaChoque = (cotizacionId: string, body: SimularRequest) =>
  api.post(`cotizaciones/${cotizacionId}/prueba-choque`, { json: body }).json<SimulacionResponse>();

/** Resumen de 1 página para compartir (`application/pdf`). */
export async function descargarResumenPdf(cotizacionId: string): Promise<{ blob: Blob; nombreArchivo: string }> {
  const res = await api.get(`cotizaciones/${cotizacionId}/prueba-choque/pdf`);
  const m = /filename="?([^";]+)"?/i.exec(res.headers.get('Content-Disposition') ?? '');
  return { blob: await res.blob(), nombreArchivo: m?.[1] ?? 'prueba-de-choque.pdf' };
}

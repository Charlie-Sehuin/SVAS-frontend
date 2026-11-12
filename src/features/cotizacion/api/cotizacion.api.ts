import { api } from '../../../shared/lib/api-client';
import type {
  ActualizarSumaResponse,
  CrearCotizacionRequest,
  CrearCotizacionResponse,
  MiCotizacion,
  ResumenCotizacionResponse,
} from '../../../shared/types/api';

/** Funciones puras sobre `api-client` (arquitectura §6.7). El frontend nunca calcula una prima: pide y pinta. */

/** Público: se cotiza sin cuenta. Devuelve el `tokenAcceso` UNA sola vez. */
export const crearCotizacion = (body: CrearCotizacionRequest) =>
  api.post('cotizaciones', { json: body }).json<CrearCotizacionResponse>();

/** Con el token de la cotización (anónimo) o con la sesión del CLIENTE dueño. */
export const obtenerResumen = (id: string) => api.get(`cotizaciones/${id}/resumen`).json<ResumenCotizacionResponse>();

/** Recalcula solo las dos primas de esa aseguradora (RN-37). `sumaAsegurada` va como string decimal. */
export const actualizarSuma = (id: string, aseguradoraId: string, sumaAsegurada: string) =>
  api
    .patch(`cotizaciones/${id}/aseguradoras/${aseguradoraId}/suma-asegurada`, { json: { sumaAsegurada } })
    .json<ActualizarSumaResponse>();

/** Cotizaciones del CLIENTE con sesión. */
export const listarMisCotizaciones = () => api.get('cotizaciones/mias').json<MiCotizacion[]>();

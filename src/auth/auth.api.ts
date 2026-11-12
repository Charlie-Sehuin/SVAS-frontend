import { api } from '../shared/lib/api-client';
import type { RegistroMinimoRequest, Usuario } from '../shared/types/api/seguridad.types';

/**
 * `POST /auth/registro` (público, siempre crea un CLIENTE). Con `cotizacionId` el backend exige el
 * `X-Cotizacion-Token` en claro para vincular la cotización anónima a la cuenta nueva: la URL no es de una
 * cotización, así que el api-client no lo agrega solo y se pasa a mano.
 */
export const registrarCliente = (body: RegistroMinimoRequest, tokenCotizacion?: string | null) =>
  api
    .post('auth/registro', {
      json: body,
      ...(tokenCotizacion ? { headers: { 'X-Cotizacion-Token': tokenCotizacion } } : {}),
    })
    .json<Usuario>();

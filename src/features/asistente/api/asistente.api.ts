import { api } from '../../../shared/lib/api-client';
import type { MensajeAsistenteEnviado, RespuestaAsistente, VehiculoMencionado } from '../../../shared/types/api';

export interface EntradaAsistente {
  mensajes: MensajeAsistenteEnviado[];
  /** Con cotización a la vista el backend usa sus precios (y el api-client pone el X-Cotizacion-Token). */
  cotizacionId: string | null;
  vehiculo: VehiculoMencionado | null;
}

/** Un turno del chat. El backend no guarda nada: en cada turno se reenvía la conversación. */
export const enviarMensajeAsistente = ({ mensajes, cotizacionId, vehiculo }: EntradaAsistente) =>
  api
    .post(cotizacionId ? `cotizaciones/${cotizacionId}/asistente/mensajes` : 'asistente/mensajes', {
      // El auto de la foto solo cuenta sin cotización (con cotización el auto ya es el de ella).
      json: { mensajes, ...(vehiculo && !cotizacionId ? { vehiculo } : {}) },
    })
    .json<RespuestaAsistente>();

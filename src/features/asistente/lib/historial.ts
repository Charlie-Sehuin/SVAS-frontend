import type { MensajeAsistenteEnviado } from '../../../shared/types/api';

/** Mismos topes que el backend (`asistente/domain/asistente.ts`). */
export const MAX_MENSAJES = 12;
export const MAX_TEXTO_USUARIO = 600;

/**
 * Lo que se manda al backend en cada turno: los últimos 12 mensajes, empezando por uno de la persona
 * (el proveedor de IA no admite que la conversación abra con el asistente). Solo `rol` y `texto`:
 * los planes y botones de una respuesta son para pintarla, no para reenviarla.
 */
export function armarHistorial(mensajes: readonly MensajeAsistenteEnviado[]): MensajeAsistenteEnviado[] {
  const ultimos = mensajes.slice(-MAX_MENSAJES);
  const primero = ultimos.findIndex((m) => m.rol === 'usuario');
  if (primero < 0) return [];
  return ultimos.slice(primero).map(({ rol, texto }) => ({ rol, texto }));
}

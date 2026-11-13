import type { CanalContacto, MotivoAsesoria, OrigenCaso } from '../../../shared/types/enums';

/** Textos en lenguaje llano para el backoffice del asesor. */
export const TEXTO_MOTIVO: Record<MotivoAsesoria, string> = {
  DUDA: 'Duda',
  NEGOCIACION: 'Negociación',
  DESCUENTO: 'Descuento',
  INSPECCION: 'Inspección',
  NO_ASEGURABLE: 'No asegurable en línea',
};

export const TEXTO_CANAL: Record<CanalContacto, string> = { LLAMADA: 'Llamada', WHATSAPP: 'WhatsApp' };

/** `SISTEMA` = el sistema lo derivó (inspección o no asegurable): va primero en la cola (RN-13). */
export const TEXTO_ORIGEN: Record<OrigenCaso, string> = { SISTEMA: 'Sistema', CLIENTE: 'Cliente' };

/** Pasadas estas horas sin atender, la espera se marca en ámbar (diseño §10.3). */
export const HORAS_ESPERA_LARGA = 4;

export function esperaLarga(fechaIso: string, ahora: Date = new Date()): boolean {
  return ahora.getTime() - new Date(fechaIso).getTime() > HORAS_ESPERA_LARGA * 3_600_000;
}

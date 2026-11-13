import type { CondicionTaller, VariablePerfil, ZonaRiesgo } from '../../../shared/types/enums';

export const TEXTO_ZONA: Record<ZonaRiesgo, string> = { ALTA: 'Alta', MEDIA: 'Media', BAJA: 'Baja' };
export const ZONAS: readonly ZonaRiesgo[] = ['ALTA', 'MEDIA', 'BAJA'];

export const TEXTO_VARIABLE: Record<VariablePerfil, string> = {
  ESTACIONA_COCHERA: 'Guarda el auto en cochera',
  KM_MES_ALTO: 'Recorre muchos km al mes',
  USO_NOCTURNO: 'Usa el auto de noche',
};
export const VARIABLES: readonly VariablePerfil[] = ['ESTACIONA_COCHERA', 'KM_MES_ALTO', 'USO_NOCTURNO'];

export const TEXTO_TALLER: Record<CondicionTaller, string> = { AFILIADO: 'Taller afiliado', CUALQUIERA: 'Cualquier taller' };

/** El código del escenario: mayúsculas y guiones bajos (backend: `^[A-Z][A-Z_]{1,29}$`). */
export const FORMATO_CODIGO = /^[A-Z][A-Z_]{1,29}$/;

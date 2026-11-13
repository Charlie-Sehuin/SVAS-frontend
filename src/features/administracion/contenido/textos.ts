import type { CategoriaCobertura, TipoRequisito } from '../../../shared/types/api';

export const TEXTO_CATEGORIA: Record<CategoriaCobertura, string> = {
  DANOS_PROPIOS: 'Daños propios',
  ROBO: 'Robo',
  RESPONSABILIDAD: 'Responsabilidad civil',
  ASISTENCIA: 'Asistencia',
  ADICIONAL: 'Adicional',
};

export const TEXTO_TIPO_REQUISITO: Record<TipoRequisito, string> = {
  VEHICULO: 'Vehículo',
  CONDUCTOR: 'Conductor',
  DOCUMENTO: 'Documento',
  INSPECCION: 'Inspección',
};

/** Código de cobertura: mayúsculas y guiones bajos (backend: `^[A-Z][A-Z_]{1,29}$`). */
export const FORMATO_CODIGO_COBERTURA = /^[A-Z][A-Z_]{1,29}$/;

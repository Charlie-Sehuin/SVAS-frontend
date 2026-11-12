/**
 * Formas comunes del contrato (doc conexión §8 y §9).
 * Los montos llegan SIEMPRE como string decimal ("480.00"): el frontend no
 * calcula dinero, solo lo formatea.
 */
export type Monto = string;
export type FechaIso = string;
export type Uuid = string;

/** Advertencia no bloqueante: la operación sí se ejecutó (§9). */
export interface Warning {
  code: WarningCode | (string & {});
  message: string;
}

export type WarningCode =
  | 'ASEGURADORA_SIN_COTIZACION'
  | 'DATOS_COBERTURA_INCOMPLETOS'
  | 'PDF_EN_GENERACION'
  | 'CONTENIDO_INCOHERENTE'
  | 'SIMULACION_DESACTUALIZADA'
  | 'MENSAJE_NO_ENVIADO';

/** Error por campo en validación de formularios (RF-03). */
export interface ErrorCampo {
  campo: string;
  mensaje: string;
}

/** Cuerpo de error único del backend (§8). */
export interface ErrorBackend {
  statusCode: number;
  message: string;
  errors?: ErrorCampo[];
  correlationId?: string;
  timestamp?: string;
  path?: string;
}

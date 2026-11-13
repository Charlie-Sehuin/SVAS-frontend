import type { CanalContacto, MotivoAsesoria, MotivoCierre, ResultadoIntento, UsoVehiculo, ZonaRiesgo } from '../enums';
import type { Monto, Uuid } from './comunes.types';

/**
 * Reportes (doc conexión §6 "Reportes"; RF-30, RF-38, OE3, dominio §16.7). Los agrega la base; el frontend solo los muestra.
 * Los montos llegan como string decimal en USD; los porcentajes, como string con 2 decimales ("12.50") o `null` si no hay
 * base para calcularlos (nunca se muestra 0 % por falta de datos). Los periodos son días de Lima, extremos incluidos.
 */

/** Periodo pedido; sin fechas, el backend usa el mes en curso hasta hoy. */
export interface PeriodoReporte {
  desde?: string;
  hasta?: string;
}

/** Porcentaje en texto, o `null` cuando no hay base (p. ej. cero cotizaciones). */
export type Porcentaje = string | null;

/* ───────────── Ventas ───────────── */

export type AgruparVentas = 'canal' | 'aseguradora' | 'plan';

export interface TotalesVentas {
  polizas: number;
  enCuotas: number;
  primaAnual: Monto;
  /** Lo que se descontó en total (prima anual menos prima final). */
  descuentos: Monto;
  primaFinal: Monto;
  /** Lo efectivamente cobrado hasta hoy (en cuotas, solo lo pagado). */
  cobrado: Monto;
  ticketPromedio: Monto | null;
}

export interface GrupoVentas {
  /** Código del canal, nombre de la aseguradora o id del plan. */
  clave: string;
  /** Texto para mostrar ("AUTONOMO", "Rímac", "Rímac · Oro"). */
  etiqueta: string;
  polizas: number;
  enCuotas: number;
  primaAnual: Monto;
  primaFinal: Monto;
  cobrado: Monto;
  ticketPromedio: Monto;
  /** Parte de la prima final total. */
  participacion: Porcentaje;
}

/** `GET /admin/reportes/ventas`. */
export interface ReporteVentas {
  desde: string;
  hasta: string;
  agrupar: AgruparVentas;
  totales: TotalesVentas;
  grupos: GrupoVentas[];
}

/* ───────────── Retención ───────────── */

export interface IntentosRetencion {
  total: number;
  porResultado: Record<ResultadoIntento, number>;
  porCanal: Record<CanalContacto, number>;
}

/** Embudo de retención de una cohorte (seguimientos abiertos en el periodo). */
export interface EmbudoRetencion {
  abiertos: number;
  conIntentos: number;
  contactados: number;
  aceptaron: number;
  enlaceUsado: number;
  convertidos: number;
  descartados: number;
  enSeguimiento: number;
  tasaConversion: Porcentaje;
  /** Días promedio hasta convertir (1 decimal), o `null` si nadie convirtió. */
  diasPromedioConversion: string | null;
  descartadosPorMotivo: Record<MotivoCierre, number>;
  intentos: IntentosRetencion;
}

/** `GET /admin/reportes/retencion`. */
export interface ReporteRetencion extends EmbudoRetencion {
  desde: string;
  hasta: string;
}

/* ───────────── Descuentos ───────────── */

export interface DescuentosNegociados {
  otorgados: number;
  aceptados: number;
  convertidos: number;
  tasaConversion: Porcentaje;
  porcentajePromedio: string | null;
  porcentajeMaximo: string | null;
  montoDescontado: Monto;
}

export interface DescuentosDeUnAsesor extends DescuentosNegociados {
  asesorId: Uuid;
  asesor: string;
}

/** `GET /admin/reportes/descuentos`. */
export interface ReporteDescuentos {
  desde: string;
  hasta: string;
  negociados: DescuentosNegociados;
  porAsesor: DescuentosDeUnAsesor[];
  primeraCompra: { aplicados: number; montoDescontado: Monto };
}

/* ───────────── ★ Impacto de la Prueba de Choque ───────────── */

export interface ConversionGrupo {
  cotizaciones: number;
  compras: number;
  tasa: Porcentaje;
}

export interface EscenarioPreferido {
  codigo: string;
  nombre: string;
  veces: number;
}

/** Qué escenarios eligieron como preocupación quienes simularon, por tipo de uso y zona de riesgo. */
export interface PreocupacionesSegmento {
  segmento: UsoVehiculo;
  zona: ZonaRiesgo;
  simulaciones: number;
  masElegido: EscenarioPreferido | null;
  escenarios: EscenarioPreferido[];
}

export interface ConversionMensajeGrupo {
  mensajes: number;
  compras: number;
  tasa: Porcentaje;
}

/** `GET /admin/reportes/prueba-choque` (dominio §16.7). */
export interface ReporteImpactoPruebaChoque {
  desde: string;
  hasta: string;
  cotizaciones: number;
  conSimulacion: number;
  porcentajeConSimulacion: Porcentaje;
  conversion: { conSimulacion: ConversionGrupo; sinSimulacion: ConversionGrupo };
  comprasTrasSimular: {
    compras: number;
    planDistintoAlMasBarato: number;
    porcentajeDistinto: Porcentaje;
    eligieronElPrimero: number;
    porcentajePrimero: Porcentaje;
  };
  preocupaciones: PreocupacionesSegmento[];
  /** Conversión del mensaje final con la frase de contraste (RN-35) frente al mensaje sin ella. */
  conversionMensajeRn35: { conRn35: ConversionMensajeGrupo; sinRn35: ConversionMensajeGrupo } | null;
}

/* ───────────── Mi desempeño (ASESOR) ───────────── */

/** `GET /asesor/reportes/mi-desempeno`. */
export interface ReporteMiDesempeno {
  desde: string;
  hasta: string;
  asesorias: {
    atendidas: number;
    cerradas: number;
    enAtencion: number;
    porMotivo: Record<MotivoAsesoria, number>;
  };
  retencion: EmbudoRetencion;
  descuentos: {
    otorgados: number;
    aceptados: number;
    convertidos: number;
    tasaConversion: Porcentaje;
    porcentajePromedio: string | null;
  };
  ventasAtribuidas: {
    polizas: number;
    porAsesoria: number;
    porTelemarketing: number;
    primaFinal: Monto;
  };
}

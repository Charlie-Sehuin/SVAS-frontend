import type { CanalVenta, EstadoOrden, EstadoPago, ModoPago, TipoDescuento } from '../enums';
import type { FechaIso, Monto, Uuid, Warning } from './comunes.types';

/**
 * Compra y pólizas (doc conexión §6 "Compra" y "Pólizas"). Todos los montos llegan como string decimal:
 * el frontend los muestra, nunca los suma ni los divide (RN-38).
 */

/* ───────────── Resumen previo al pago ───────────── */

export interface DescuentoResumen {
  tipo: TipoDescuento;
  porcentaje: Monto;
  /** `true` mientras es una vista previa: la orden aún no existe y las reglas pueden cambiar al crearla. */
  provisional: boolean;
}

export interface PagoCuotasResumen {
  numeroCuotas: number;
  total: Monto;
  cuotaMensual: Monto;
  /** Recargo de fraccionamiento sobre la prima final (0.00 si la aseguradora no recarga). */
  recargoPorcentaje: Monto;
}

export interface ResumenCompra {
  cotizacionId: Uuid;
  primaCotizadaId: Uuid;
  /** Distinto de `null` si la compra ya fue iniciada (la orden está creada y sus montos congelados). */
  ordenId: Uuid | null;
  aseguradora: string;
  plan: string;
  sumaAsegurada: Monto;
  primaAnual: Monto;
  descuento: DescuentoResumen | null;
  primaFinal: Monto;
  pago: {
    UNICO: { total: Monto };
    /** `null` si el parámetro de cuotas máximas del administrador es menor que 2. */
    CUOTAS: PagoCuotasResumen | null;
    maxCuotas: number;
  };
}

/* ───────────── Datos que faltan (RNF-08) ───────────── */

export type CampoCompraNombre = 'numeroDocumento' | 'placa';

export interface CampoFaltante {
  campo: CampoCompraNombre;
  etiqueta: string;
  ayuda: string;
}

export interface CamposFaltantesResponse {
  campos: CampoFaltante[];
}

export interface DatosCompraRequest {
  numeroDocumento?: string;
  placa?: string;
}

export interface DatosCompraResponse {
  /** Ya enmascarado por el backend ("****5678"). */
  numeroDocumento: string | null;
  placa: string | null;
  camposFaltantes: CampoFaltante[];
}

/* ───────────── Contenido del plan congelado (RN-45) ───────────── */

export type CategoriaCobertura = 'DANOS_PROPIOS' | 'ROBO' | 'RESPONSABILIDAD' | 'ASISTENCIA' | 'ADICIONAL';

export interface CoberturaContratada {
  codigo: string;
  nombre: string;
  categoria: CategoriaCobertura;
  incluida: boolean;
  detalle: string | null;
  limiteMonto: Monto | null;
}

export interface RequisitoContratado {
  tipo: 'VEHICULO' | 'CONDUCTOR' | 'DOCUMENTO' | 'INSPECCION';
  texto: string;
  obligatorio: boolean;
}

/** Copia del plan tal como estaba el día de la compra. */
export interface ContenidoPlanContratado {
  planId: Uuid;
  aseguradora: string;
  plan: string;
  resumen: string | null;
  descripcion: string | null;
  idealPara: string | null;
  coberturas: CoberturaContratada[];
  exclusiones: string[];
  requisitos: RequisitoContratado[];
  congeladoEn: FechaIso;
}

/* ───────────── Crear la compra, pagar y consultar ───────────── */

export interface CrearCompraRequest {
  cotizacionId: Uuid;
  primaCotizadaId: Uuid;
  aceptaCondiciones: boolean;
  firmaSimulada: string;
  origen?: 'RETOMA';
}

export interface CuotaCompra {
  numero: number;
  monto: Monto;
  /** YYYY-MM-DD */
  fechaVencimiento: string;
  estado: EstadoPago;
}

export interface PagarRequest {
  modo: ModoPago;
  /** Solo en `CUOTAS`. El backend valida el rango. */
  numeroCuotas?: number;
}

/** `GET /compras/:id/estado` y respuesta de `POST /compras`. */
export interface EstadoCompra {
  ordenId: Uuid;
  cotizacionId: Uuid;
  primaCotizadaId: Uuid;
  estado: EstadoOrden;
  aseguradora: string;
  plan: string;
  sumaAsegurada: Monto;
  primaAnual: Monto;
  descuento: { tipo: TipoDescuento; porcentaje: Monto } | null;
  primaFinal: Monto;
  canalVenta: CanalVenta;
  fecha: FechaIso;
  pago: { modo: ModoPago; montoTotal: Monto; numeroCuotas: number | null; cuotas: CuotaCompra[] } | null;
  pagosRechazados: number;
  poliza: { id: Uuid; numero: string; pdfDisponible: boolean } | null;
  contenidoPlan: ContenidoPlanContratado;
}

/** `POST /compras/:id/pago` (201). `warning` = `PDF_EN_GENERACION`: la compra sí se confirmó. */
export interface PagoResponse {
  compra: {
    estado: 'CONFIRMADO';
    ordenId: Uuid;
    polizaId: Uuid | null;
    numeroPoliza: string | null;
    montoTotal: Monto;
    modo: ModoPago;
    numeroCuotas: number | null;
    cuotas: CuotaCompra[];
  };
  warning?: Warning;
}

/* ───────────── Pólizas ───────────── */

/** Fila de `GET /polizas/mias`. */
export interface PolizaResumen {
  id: Uuid;
  numero: string;
  fechaEmision: FechaIso;
  aseguradora: string;
  plan: string;
  vehiculo: { marca: string; modelo: string; anio: number; placa: string | null };
  sumaAsegurada: Monto;
  primaFinal: Monto;
  pago: { modo: ModoPago; montoTotal: Monto; numeroCuotas: number | null } | null;
  pdfDisponible: boolean;
  contenidoPlan: ContenidoPlanContratado;
}

/** Resultado de pedir el PDF: el archivo, o "aún se está generando" (202 + `PDF_EN_GENERACION`). */
export type DescargaPdf = { listo: true; blob: Blob; nombreArchivo: string } | { listo: false; warning: Warning };

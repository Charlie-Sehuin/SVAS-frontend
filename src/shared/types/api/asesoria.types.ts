import type {
  CanalContacto,
  EstadoCotizacion,
  EstadoSeguimiento,
  EstadoSolicitudAsesoria,
  MotivoAsesoria,
  MotivoCierre,
  OrigenCaso,
  ResultadoIntento,
  TipoDescuento,
} from '../enums';
import type { FechaIso, Monto, Uuid, Warning } from './comunes.types';

/**
 * Asesoría y retención (doc conexión §6; CU-03, CU-04; RN-07 a RN-13). Montos y porcentajes llegan como string decimal.
 * Los datos personales llegan ya enmascarados en las listas; el detalle trae teléfono y correo completos y el documento
 * completo solo en el caso asignado o para el ADMINISTRADOR (doc conexión §5).
 */

/** Motivos por los que el CLIENTE puede pedir asesoría; `INSPECCION` y `NO_ASEGURABLE` los crea el sistema. */
export type MotivoCliente = Extract<MotivoAsesoria, 'DUDA' | 'NEGOCIACION' | 'DESCUENTO'>;

export interface SolicitarAsesoriaRequest {
  cotizacionId: Uuid;
  motivo: MotivoCliente;
  canal: CanalContacto;
}

/** Respuesta de `POST /asesorias`. */
export interface SolicitudCreada {
  id: Uuid;
  motivo: MotivoAsesoria;
  estado: EstadoSolicitudAsesoria;
  canal: CanalContacto;
  origen: OrigenCaso;
  fechaCreacion: FechaIso;
}

export interface CotizacionDelCaso {
  id: Uuid;
  fecha: FechaIso;
  estado: EstadoCotizacion;
  /** "Toyota Corolla 2022" */
  vehiculo: string;
}

/** Cliente en las listas: teléfono, correo y documento enmascarados. */
export interface ClienteEnLista {
  nombre: string;
  telefono: string;
  email: string;
  canalPreferido: CanalContacto;
  numeroDocumento: string | null;
}

/** Cliente en el detalle: contacto completo; el documento completo solo en el caso asignado o para el ADMINISTRADOR. */
export interface ClienteEnDetalle {
  nombres: string;
  apellidos: string;
  telefono: string;
  email: string;
  canalPreferido: CanalContacto;
  numeroDocumento: string | null;
}

export interface PrimaDelCaso {
  planId: Uuid;
  plan: string;
  aseguradora: string;
  disponible: boolean;
  sumaAsegurada: Monto | null;
  prima: Monto | null;
  primaMensual: Monto | null;
}

export interface DescuentoDelCaso {
  id: Uuid;
  planId: Uuid;
  tipo: TipoDescuento;
  porcentaje: Monto;
  aceptado: boolean;
  fecha: FechaIso;
}

/** Fila de `GET /asesorias/cola` (orden RN-13: primero las del sistema, luego por antigüedad). */
export interface SolicitudEnCola {
  id: Uuid;
  motivo: MotivoAsesoria;
  estado: EstadoSolicitudAsesoria;
  canal: CanalContacto;
  origen: OrigenCaso;
  fechaCreacion: FechaIso;
  asignadoAMi: boolean;
  cotizacion: CotizacionDelCaso;
  cliente: ClienteEnLista;
}

/** `GET /asesorias/:id`. */
export interface SolicitudDetalle extends Omit<SolicitudEnCola, 'cliente'> {
  resultado: string | null;
  cliente: ClienteEnDetalle;
  primas: PrimaDelCaso[];
  descuentos: DescuentoDelCaso[];
  /** Tope vigente (RN-07), p. ej. "10.00". */
  descuentoMaximo: Monto;
}

export interface TomarSolicitudResponse {
  id: Uuid;
  estado: EstadoSolicitudAsesoria;
}

export interface DescuentoRequest {
  planId: Uuid;
  /** String decimal: "8.50". */
  porcentaje: string;
}

export interface ResultadoSolicitudRequest {
  resultado: string;
  acepta: boolean;
}

export interface ResultadoSolicitudResponse {
  id: Uuid;
  estado: EstadoSolicitudAsesoria;
  resultado: string;
  acepta: boolean;
}

/* ───────────── Seguimientos (CU-04) ───────────── */

export interface SeguimientoEnLista {
  id: Uuid;
  estado: EstadoSeguimiento;
  intentos: number;
  fechaApertura: FechaIso;
  fechaCierre: FechaIso | null;
  motivoCierre: MotivoCierre | null;
  cotizacion: CotizacionDelCaso;
  cliente: ClienteEnLista;
}

export interface IntentoDeContacto {
  id: Uuid;
  canal: CanalContacto;
  resultado: ResultadoIntento;
  fecha: FechaIso;
  asesorId: Uuid;
}

/** `GET /seguimientos/:id`. */
export interface SeguimientoDetalle extends Omit<SeguimientoEnLista, 'cliente'> {
  /** Límites de RN-10. */
  maxIntentos: number;
  diasSeguimiento: number;
  cliente: ClienteEnDetalle;
  historial: IntentoDeContacto[];
  primas: PrimaDelCaso[];
  descuentos: DescuentoDelCaso[];
}

export interface RegistrarIntentoRequest {
  canal: CanalContacto;
  resultado: ResultadoIntento;
}

/** `POST /seguimientos/:id/intentos`. Al llegar al máximo sin aceptación se cierra solo (DESCARTADO / NO_RESPONDE). */
export interface RegistrarIntentoResponse {
  intentos: number;
  maxIntentos: number;
  estado: EstadoSeguimiento;
  motivoCierre: MotivoCierre | null;
  /** `MENSAJE_NO_ENVIADO`: el cierre sí se hizo, el mensaje al cliente no salió. */
  warning?: Warning;
}

export interface AceptacionResponse {
  enlaceEnviado: boolean;
  warning?: Warning;
}

export interface CerrarSeguimientoRequest {
  estado: Exclude<EstadoSeguimiento, 'EN_SEGUIMIENTO'>;
  /** Obligatorio al descartar (RN-11). */
  motivo?: MotivoCierre | null;
}

export interface CerrarSeguimientoResponse {
  estado: EstadoSeguimiento;
  motivoCierre: MotivoCierre | null;
  warning?: Warning;
}

/* ───────────── Retoma (RN-12) ───────────── */

/** `GET /retoma/:token`. El `tokenAcceso` sale UNA sola vez: hay que guardarlo al recibirlo. */
export interface RetomaResponse {
  cotizacionId: Uuid;
  tokenAcceso: string;
  descuento: { tipo: TipoDescuento; porcentaje: Monto };
}

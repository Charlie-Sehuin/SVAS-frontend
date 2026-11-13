import type { FechaIso, Monto, Uuid, Warning } from './comunes.types';
import type { CategoriaCobertura, RequisitoContratado } from './compra.types';

/**
 * Contenido de los planes visto por el ADMINISTRADOR (dominio §18; RN-42 a RN-46; doc conexión). Es contenido comercial
 * ilustrativo: no interviene en la prima. "No cubre" es SIEMPRE una fila con `incluida: false`, nunca una ausencia (RN-42).
 */

export type TipoRequisito = RequisitoContratado['tipo'];
export const TIPOS_REQUISITO: readonly TipoRequisito[] = ['VEHICULO', 'CONDUCTOR', 'DOCUMENTO', 'INSPECCION'];
export const CATEGORIAS_COBERTURA: readonly CategoriaCobertura[] = ['DANOS_PROPIOS', 'ROBO', 'RESPONSABILIDAD', 'ASISTENCIA', 'ADICIONAL'];

/* ───────────── Contenido de un plan ───────────── */

export interface CoberturaDePlanAdmin {
  codigo: string;
  nombre: string;
  categoria: CategoriaCobertura;
  /** `false` = el plan aún no tiene fila para esta cobertura activa (RN-42). */
  definida: boolean;
  incluida: boolean | null;
  detalle: string | null;
  limiteMonto: Monto | null;
}

export interface RequisitoAdmin {
  tipo: TipoRequisito;
  texto: string;
  obligatorio: boolean;
}

/** Lo que le falta a un plan para estar completo (RN-42) y cuántas contradicciones tiene con la Prueba de Choque (RN-43). */
export interface CompletitudPlan {
  planId: Uuid;
  aseguradora: string;
  plan: string;
  activo: boolean;
  coberturasFaltantes: number;
  tieneResumen: boolean;
  tieneDescripcion: boolean;
  tieneIdealPara: boolean;
  nRequisitos: number;
  nExclusiones: number;
  incoherenciasPruebaChoque: number;
  completo: boolean;
  contenidoActualizadoEn: FechaIso | null;
}

/** RN-43: una cobertura que dice sí/no y la Prueba de Choque dice lo contrario. Se guarda igual; es un aviso. */
export interface AdvertenciaContenido {
  codigo: string;
  nombre: string;
  incluida: boolean;
  escenariosQueCubren: string[];
  /** Texto listo para mostrar: «Lunas» dice que sí, pero la Prueba de Choque dice que no… */
  mensaje: string;
}

/** `GET /admin/planes/:planId/contenido`. */
export interface ContenidoPlanAdmin {
  planId: Uuid;
  aseguradora: string;
  plan: string;
  activo: boolean;
  resumen: string | null;
  descripcion: string | null;
  idealPara: string | null;
  /** Todas las coberturas activas del catálogo, por orden. */
  coberturas: CoberturaDePlanAdmin[];
  exclusiones: string[];
  requisitos: RequisitoAdmin[];
  contenidoActualizadoEn: FechaIso | null;
  completitud: CompletitudPlan | null;
  advertencias: AdvertenciaContenido[];
}

export interface GuardarContenidoRequest {
  resumen: string;
  descripcion: string;
  idealPara: string;
  coberturas: { codigo: string; incluida: boolean; detalle?: string | null; limiteMonto?: number | null }[];
  exclusiones: string[];
  requisitos: { tipo: TipoRequisito; texto: string; obligatorio?: boolean }[];
}

/** Respuesta de `PUT …/contenido`: el contenido ya guardado, y `warning` si hay contradicciones con la Prueba de Choque. */
export interface GuardarContenidoResponse extends ContenidoPlanAdmin {
  cambio: unknown;
  warning?: Warning;
}

/* ───────────── Catálogo de coberturas ───────────── */

export interface CoberturaCatalogoAdmin {
  id: Uuid;
  codigo: string;
  nombre: string;
  categoria: CategoriaCobertura;
  descripcion: string;
  orden: number;
  activa: boolean;
  /** Escenarios de la Prueba de Choque que esta cobertura representa (RN-43). */
  escenarios: string[];
}

export interface GuardarCoberturaCatalogoRequest {
  nombre: string;
  categoria: CategoriaCobertura;
  descripcion: string;
  orden: number;
  activa: boolean;
  escenarios: string[];
}

/* ───────────── Completitud de todos los planes ───────────── */

export interface CompletitudContenido {
  /** `true` si todos los planes ACTIVOS están completos. */
  completo: boolean;
  planesActivosIncompletos: number;
  items: CompletitudPlan[];
}

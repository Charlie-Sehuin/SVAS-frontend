import type { CondicionTaller, UsoVehiculo, VariablePerfil, ZonaRiesgo } from '../enums';
import type { FechaIso, Monto, Uuid } from './comunes.types';

/**
 * Catálogo de la Prueba de Choque visto por el ADMINISTRADOR (doc conexión; dominio §16, RN-31, RF-36). Montos,
 * porcentajes y probabilidades llegan como string decimal; al guardar se envían como número (el backend los valida).
 * Los valores iniciales del seed son SUPUESTOS REFERENCIALES: los valida el negocio y los edita esta pantalla.
 */

/* ───────────── Escenarios ───────────── */

export interface FrecuenciaFaltante {
  uso: UsoVehiculo;
  zona: ZonaRiesgo;
}
export interface PlanSinCobertura {
  planId: Uuid;
  plan: string;
  aseguradora: string;
}

/** Lo que le falta a un escenario ACTIVO para que la simulación no quede coja (`null` si está inactivo). */
export interface PendientesEscenario {
  /** Combinaciones uso × zona sin probabilidad: el motor las toma como 0. */
  frecuenciasFaltantes: FrecuenciaFaltante[];
  /** Planes activos sin fila de cobertura: salen "Sin información" (RN-30). */
  planesSinCobertura: PlanSinCobertura[];
}

export interface EscenarioAdmin {
  id: Uuid;
  codigo: string;
  nombre: string;
  descripcion: string;
  /** `null` = el daño es la suma asegurada de cada plan (robo total, pérdida total). */
  montoDanoReferencial: Monto | null;
  diasTaller: number;
  orden: number;
  activo: boolean;
  pendientes: PendientesEscenario | null;
}

/** Cuerpo de `PUT /admin/prueba-choque/escenarios/:codigo` (crea o reemplaza). */
export interface GuardarEscenarioRequest {
  nombre: string;
  descripcion: string;
  montoDanoReferencial: number | null;
  diasTaller: number;
  orden: number;
  activo: boolean;
}

/* ───────────── Coberturas (deducibles y topes por plan) ───────────── */

export interface CoberturaAdmin {
  planId: Uuid;
  plan: string;
  aseguradora: string;
  escenario: string;
  cubre: boolean;
  deduciblePct: Monto | null;
  deducibleMinimo: Monto | null;
  /** `null` = hasta la suma asegurada. */
  topeCobertura: Monto | null;
  condicionTaller: CondicionTaller;
  diasAutoReemplazo: number;
  fuente: string;
  actualizadoEn: FechaIso;
}

export interface FilaCoberturaRequest {
  planId: Uuid;
  escenario: string;
  cubre: boolean;
  deduciblePct?: number | null;
  deducibleMinimo?: number | null;
  topeCobertura?: number | null;
  condicionTaller?: CondicionTaller;
  diasAutoReemplazo?: number;
  fuente: string;
}

/* ───────────── Frecuencias, zonas y factores ───────────── */

export interface FrecuenciaAdmin {
  escenario: string;
  uso: UsoVehiculo;
  zona: ZonaRiesgo;
  /** Probabilidad al año ("0.1200" = 12 %). */
  probabilidadAnual: string;
}
export interface FilaFrecuenciaRequest {
  escenario: string;
  uso: UsoVehiculo;
  zona: ZonaRiesgo;
  probabilidadAnual: number;
}

export interface ZonaAdmin {
  ubigeo: string;
  departamento: string;
  provincia: string;
  distrito: string;
  zona: ZonaRiesgo;
}
export interface FilaZonaRequest {
  ubigeo: string;
  zona: ZonaRiesgo;
}

export interface FactorAdmin {
  escenario: string;
  variable: VariablePerfil;
  /** Multiplica la probabilidad ("1.50" sube un 50 %; "1.00" no cambia nada). */
  multiplicador: string;
}
export interface FilaFactorRequest {
  escenario: string;
  variable: VariablePerfil;
  multiplicador: number;
}

/** Respuesta de todos los `PUT` por lotes. */
export interface ResumenCargaChoque {
  recibidas: number;
  cambiadas: number;
  total: number;
}

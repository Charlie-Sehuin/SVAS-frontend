import type { FechaIso, Monto, Uuid, Warning } from './comunes.types';

/**
 * Prueba de Choque (doc conexión §6 "★ Prueba de Choque"; RN-28 a RN-36). Todo monto llega como string decimal y el
 * frontend solo lo muestra: la simulación completa la calcula y guarda el backend (RN-32).
 */

/** Fila de `GET /prueba-choque/escenarios?uso=`. */
export interface EscenarioCatalogo {
  codigo: string;
  nombre: string;
  descripcion: string | null;
  /** `null` en robo total y pérdida total: su daño es la suma asegurada de cada plan. */
  montoDanoReferencial: Monto | null;
  diasTaller: number;
  /** Solo si se pidió con `uso`. */
  probabilidadReferencial?: string;
}

/** Perfil de riesgo declarado por la persona (3 preguntas + ingreso solo en uso comercial, RN-33). */
export interface PerfilRiesgo {
  estacionaCochera: boolean;
  kmMesAlto: boolean;
  usoNocturno: boolean;
  /** Soles por día, string decimal. Solo cuenta en uso comercial. */
  ingresoDiarioSoles?: string | null;
  preocupaciones?: string[];
}

export interface SimularRequest {
  perfil: PerfilRiesgo;
}

export interface PosicionRanking {
  primaCotizadaId: Uuid;
  aseguradora: string;
  plan: string;
  /** Prima anual. */
  prima: Monto;
  desembolsoEsperado: Monto;
  costoRealAnual: Monto;
  peorCaso: Monto;
  /** `false` = al plan le falta información en algún escenario (RN-30): va al final del ranking. */
  datosCompletos: boolean;
  posicion: number;
}

export interface ResultadoEscenario {
  primaCotizadaId: Uuid;
  cubre: boolean;
  deducible: Monto;
  noCubierto: Monto;
  ingresoPerdido: Monto;
  /** Lo que paga la persona en ese escenario (ya incluye el ingreso perdido, RN-33). */
  desembolso: Monto;
  /** `true` = no hay regla para ese plan y escenario: no se asume nada a favor (RN-30). */
  sinDato: boolean;
}

export interface FilaMatriz {
  escenario: { codigo: string; nombre: string; probabilidad: string };
  /** En el mismo orden que `ranking`. */
  resultados: ResultadoEscenario[];
}

export interface Simulacion {
  id: Uuid;
  zona: 'ALTA' | 'MEDIA' | 'BAJA';
  moneda: 'USD';
  /** `false` = la persona cambió su suma asegurada después de simular (RN-37). */
  vigente: boolean;
  fecha: FechaIso;
  ranking: PosicionRanking[];
  matriz: FilaMatriz[];
  /** RN-29: leyenda obligatoria bajo el resultado. */
  leyenda: string;
}

/** `POST` (con `warning` si faltan datos de cobertura) y `GET` (404 si todavía no hay simulación) de la Prueba de Choque. */
export interface SimulacionResponse {
  simulacion: Simulacion;
  warning?: Warning;
}

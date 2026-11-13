import type { Monto, FechaIso, Uuid } from './comunes.types';
import type { CategoriaCobertura, RequisitoContratado } from './compra.types';

/**
 * Contenido de los planes (doc conexión §6 "★ Contenido del plan"; RN-42 a RN-46). Es información pública y no
 * afecta la prima. El frontend no ordena ni deduce nada: pinta lo que llega.
 */

export interface CoberturaPlan {
  codigo: string;
  nombre: string;
  categoria: CategoriaCobertura;
  incluida: boolean;
  /** "Hasta USD 100,000", "Hasta 10 días"… */
  detalle: string | null;
  limiteMonto: Monto | null;
}

/** `GET /planes/:planId/contenido`. `coberturas` trae SIEMPRE las 13 del catálogo, en el mismo orden para todos los planes. */
export interface ContenidoPlan {
  planId: Uuid;
  aseguradora: string;
  plan: string;
  resumen: string | null;
  descripcion: string | null;
  idealPara: string | null;
  coberturas: CoberturaPlan[];
  exclusiones: string[];
  requisitos: RequisitoContratado[];
  actualizadoEn: FechaIso | null;
  /** RN-46: leyenda obligatoria. */
  leyenda: string;
}

export interface PlanComparado {
  planId: Uuid;
  aseguradora: string;
  plan: string;
  resumen: string | null;
}

export interface ValorComparado {
  incluida: boolean;
  detalle: string | null;
}

/** Una fila de la matriz: `valores[i]` corresponde a `planes[i]`. */
export interface FilaComparacion {
  codigo: string;
  nombre: string;
  categoria: CategoriaCobertura;
  valores: ValorComparado[];
}

/** `GET /planes/comparar?ids=a,b,c` (de 2 a 3 planes). */
export interface ComparacionPlanes {
  planes: PlanComparado[];
  filas: FilaComparacion[];
  leyenda: string;
}

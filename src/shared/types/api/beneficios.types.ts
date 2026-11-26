import type { Monto, Uuid, Warning } from './comunes.types';

/**
 * Beneficios de los planes (extras al seguro: visitas técnicas, grúa, combustible…). Cada aseguradora y cada plan ofrece
 * los suyos; la lista de un plan trae SOLO lo que ofrece, así que la ausencia significa "No incluye". Son datos ilustrativos
 * y no intervienen en la prima.
 */

/** Cómo se mide: una cantidad, un precio por unidad o un porcentaje. */
export type TipoBeneficio = 'CANTIDAD' | 'PRECIO' | 'PORCENTAJE';

export interface BeneficioPlan {
  codigo: string;
  nombre: string;
  tipo: TipoBeneficio;
  /** "al año", "USD por litro", "% de descuento"… */
  unidad: string;
  valor: Monto;
  detalle: string | null;
}

export interface ValorBeneficioComparado {
  valor: Monto;
  detalle: string | null;
}

/** Una fila de la tabla de beneficios: `valores[i]` corresponde a `planes[i]`; `null` = el plan no lo ofrece. */
export interface FilaBeneficio {
  codigo: string;
  nombre: string;
  tipo: TipoBeneficio;
  unidad: string;
  valores: (ValorBeneficioComparado | null)[];
}

/* ───────────── Administrador ───────────── */

export interface BeneficioCatalogoAdmin {
  codigo: string;
  nombre: string;
  tipo: TipoBeneficio;
  unidad: string;
  orden: number;
}

export interface BeneficioDePlanAdmin extends BeneficioCatalogoAdmin {
  valor: Monto;
  detalle: string | null;
}

/** El plan superior de una aseguradora debe incluir todo lo del inferior, con igual o mejor valor. Solo avisa. */
export interface AdvertenciaEscalera {
  codigo: string;
  nombre: string;
  planBajo: string;
  planAlto: string;
  motivo: string;
  mensaje: string;
}

/** `GET /admin/planes/:planId/beneficios`. */
export interface BeneficiosPlanAdmin {
  planId: Uuid;
  aseguradora: string;
  plan: string;
  beneficios: BeneficioDePlanAdmin[];
  /** Todos los beneficios activos que se pueden asignar. */
  catalogo: BeneficioCatalogoAdmin[];
  advertencias: AdvertenciaEscalera[];
}

export interface GuardarBeneficiosRequest {
  beneficios: { codigo: string; valor: number; detalle?: string | null }[];
}

/** `PUT /admin/planes/:planId/beneficios`: lo guardado más el aviso de escalera, si lo hay. */
export interface GuardarBeneficiosResponse extends BeneficiosPlanAdmin {
  cambio: boolean;
  warning?: Warning;
}

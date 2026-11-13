import Decimal from 'decimal.js';
import type { ResultadoEscenario } from '../../../shared/types/api';

/**
 * Nivel de lo que paga la persona en un escenario, para pintar la celda con la escala `out-0…3` (arquitectura §2.5).
 * Solo CLASIFICA con los montos que ya trae el backend: no suma ni calcula dinero que luego se muestre.
 *
 *  · `sin-dato`  → sin información (RN-30): celda rayada, nunca un supuesto favorable.
 *  · `0`         → desembolso 0.
 *  · `1`         → hasta el 10 % del daño.
 *  · `2`         → del 10 % al 50 % del daño.
 *  · `3`         → más del 50 % del daño, o hay parte no cubierta, o el plan no cubre el escenario.
 *
 * `referencia` es el daño del escenario (monto de referencia, o la suma asegurada del plan en robo total y pérdida
 * total). Si no se conoce, lo que pague la persona se considera nivel medio en lugar de inventar un porcentaje.
 */
export type NivelDesembolso = 'sin-dato' | 0 | 1 | 2 | 3;

export function nivelDesembolso(r: ResultadoEscenario, referencia: string | null): NivelDesembolso {
  if (r.sinDato) return 'sin-dato';
  const desembolso = new Decimal(r.desembolso);
  if (desembolso.lte(0)) return 0;
  if (!r.cubre || new Decimal(r.noCubierto).gt(0)) return 3;
  if (!referencia || new Decimal(referencia).lte(0)) return 2;
  const proporcion = desembolso.div(referencia);
  if (proporcion.lte(0.1)) return 1;
  if (proporcion.lte(0.5)) return 2;
  return 3;
}

/** Texto del nivel (el color nunca va solo, diseño §8.7). */
export const TEXTO_NIVEL: Record<NivelDesembolso, string> = {
  'sin-dato': 'Sin información',
  0: 'Sin costo para ti',
  1: 'Costo bajo',
  2: 'Costo medio',
  3: 'Costo alto',
};

/** Clases de fondo de la escala `out` (tokens de `colors.css`; el patrón rayado va en `.fondo-sin-dato`). */
export const FONDO_NIVEL: Record<NivelDesembolso, string> = {
  'sin-dato': 'fondo-sin-dato',
  0: 'bg-out-0',
  1: 'bg-out-1',
  2: 'bg-out-2',
  3: 'bg-out-3',
};

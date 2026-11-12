import { aDecimal } from '../../../shared/lib/format';
import type { PrimaCotizada } from '../../../shared/types/api';

export type OrdenComparativo = 'precio' | 'aseguradora';

export interface GrupoAseguradora {
  aseguradoraId: string;
  aseguradora: string;
  /** Planes que sí cotizaron, ya ordenados. */
  disponibles: PrimaCotizada[];
  /** Planes sin prima (RN-39): se muestran como una sola tarjeta gris por aseguradora. */
  noDisponibles: PrimaCotizada[];
}

/** Comparar dos montos que llegan como string decimal. Solo ordena: no calcula nada. */
const compararMonto = (a: string, b: string) => aDecimal(a).cmp(aDecimal(b));

/**
 * Agrupa las primas por aseguradora para el comparativo (diseño §9.3): un bloque por aseguradora con sus planes.
 * - `precio`: las aseguradoras con prima primero, de la cuota mensual más baja a la más alta; dentro de cada una, igual.
 * - `aseguradora`: A–Z.
 * - Las aseguradoras sin ninguna prima van siempre al final.
 */
export function agruparPorAseguradora(
  primas: readonly PrimaCotizada[],
  orden: OrdenComparativo,
  aseguradoraId = '',
): GrupoAseguradora[] {
  const porId = new Map<string, GrupoAseguradora>();
  for (const p of primas) {
    if (aseguradoraId && p.aseguradoraId !== aseguradoraId) continue;
    const grupo = porId.get(p.aseguradoraId) ?? {
      aseguradoraId: p.aseguradoraId,
      aseguradora: p.aseguradora,
      disponibles: [],
      noDisponibles: [],
    };
    (p.disponible && p.primaMensual !== null ? grupo.disponibles : grupo.noDisponibles).push(p);
    porId.set(p.aseguradoraId, grupo);
  }

  const grupos = [...porId.values()];
  for (const g of grupos) {
    g.disponibles.sort((a, b) => compararMonto(a.primaMensual ?? '0', b.primaMensual ?? '0'));
  }

  const masBarata = (g: GrupoAseguradora) => g.disponibles[0]?.primaMensual ?? '0';
  const porNombre = (a: GrupoAseguradora, b: GrupoAseguradora) => a.aseguradora.localeCompare(b.aseguradora, 'es');

  return grupos.sort((a, b) => {
    const aCotiza = a.disponibles.length > 0;
    const bCotiza = b.disponibles.length > 0;
    if (aCotiza !== bCotiza) return aCotiza ? -1 : 1; // sin prima, al final
    if (!aCotiza) return porNombre(a, b);
    return orden === 'precio' ? compararMonto(masBarata(a), masBarata(b)) || porNombre(a, b) : porNombre(a, b);
  });
}

/** Las aseguradoras que aparecen en la cotización (para el filtro), A–Z. */
export function aseguradorasDe(primas: readonly PrimaCotizada[]): { id: string; nombre: string }[] {
  const m = new Map(primas.map((p) => [p.aseguradoraId, p.aseguradora]));
  return [...m.entries()].map(([id, nombre]) => ({ id, nombre })).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
}

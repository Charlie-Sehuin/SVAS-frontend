import { aDecimal } from '../../../shared/lib/format';
import type { PrimaCotizada, RangoSuma } from '../../../shared/types/api';

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

/**
 * El rango en que puede moverse la barra única de suma asegurada: del mínimo MÁS BAJO al máximo MÁS ALTO entre las
 * aseguradoras que cotizaron. Cada aseguradora tiene su propio rango (RN-37), así que un valor dentro de este rango
 * puede quedar fuera del de alguna: para esa se usa `limitarARango`. Solo elige entre valores que ya llegaron del backend.
 */
export function rangoUnion(primas: readonly PrimaCotizada[]): RangoSuma | null {
  let minima: string | null = null;
  let maxima: string | null = null;
  for (const p of primas) {
    if (!p.disponible || !p.rangoSuma) continue;
    if (minima === null || compararMonto(p.rangoSuma.minima, minima) < 0) minima = p.rangoSuma.minima;
    if (maxima === null || compararMonto(p.rangoSuma.maxima, maxima) > 0) maxima = p.rangoSuma.maxima;
  }
  return minima !== null && maxima !== null ? { minima, maxima } : null;
}

export interface SumaLimitada {
  /** La suma que se le pide a la aseguradora (con 2 decimales si viene del rango). */
  valor: string;
  /** Si el valor elegido se salía de su rango: cuál límite se usó en su lugar. */
  ajustada: 'minima' | 'maxima' | null;
}

/** Deja `valor` dentro del rango de una aseguradora: si se pasa, usa su mínimo o su máximo. No calcula: elige uno de los tres. */
export function limitarARango(valor: string, rango: RangoSuma): SumaLimitada {
  if (compararMonto(valor, rango.minima) < 0) return { valor: rango.minima, ajustada: 'minima' };
  if (compararMonto(valor, rango.maxima) > 0) return { valor: rango.maxima, ajustada: 'maxima' };
  return { valor: valor.includes('.') ? valor : `${valor}.00`, ajustada: null };
}

/** ¿Dos montos en texto son el mismo número? ("15000" y "15000.00" sí). */
export const mismoMonto = (a: string, b: string) => compararMonto(a, b) === 0;

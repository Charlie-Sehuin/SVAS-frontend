import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { PeriodoReporte } from '../../../shared/types/api';

/**
 * Periodo de un reporte: días de Lima, extremos incluidos. Vive en la dirección (`?desde=&hasta=`) para poder compartirlo y
 * recargar sin perderlo. Sin fechas, el backend usa el mes en curso hasta hoy. Las reglas repiten las del backend (que
 * vuelve a validar): formato AAAA-MM-DD, fechas reales, "desde" no posterior a "hasta" y como máximo un año.
 */
export const MAXIMO_DIAS = 366;
const FORMATO = /^\d{4}-\d{2}-\d{2}$/;

const esFechaReal = (f: string) => {
  const d = new Date(`${f}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === f;
};
const dias = (desde: string, hasta: string) => (Date.parse(`${hasta}T00:00:00Z`) - Date.parse(`${desde}T00:00:00Z`)) / 86_400_000;

/** Mensaje de error del periodo, o `null` si es válido (también si falta alguno de los extremos). */
export function errorDePeriodo(p: PeriodoReporte): string | null {
  for (const f of [p.desde, p.hasta]) {
    if (f !== undefined && (!FORMATO.test(f) || !esFechaReal(f))) return 'Las fechas deben tener el formato AAAA-MM-DD';
  }
  if (p.desde && p.hasta) {
    if (p.desde > p.hasta) return 'La fecha "desde" no puede ser posterior a "hasta"';
    if (dias(p.desde, p.hasta) > MAXIMO_DIAS) return 'El periodo no puede superar un año';
  }
  return null;
}

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export interface Atajo {
  id: string;
  texto: string;
  /** `undefined` = sin fechas: el mes en curso, como lo decide el backend. */
  periodo: PeriodoReporte | undefined;
}

/** Atajos habituales, calculados con el día de hoy de quien mira (los extremos los vuelve a validar el backend). */
export function atajos(hoy: Date = new Date()): Atajo[] {
  const primeroDelMesPasado = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
  const ultimoDelMesPasado = new Date(hoy.getFullYear(), hoy.getMonth(), 0);
  const hace30 = new Date(hoy);
  hace30.setDate(hoy.getDate() - 29);
  return [
    { id: 'mes', texto: 'Este mes', periodo: undefined },
    { id: 'mes-pasado', texto: 'Mes pasado', periodo: { desde: iso(primeroDelMesPasado), hasta: iso(ultimoDelMesPasado) } },
    { id: '30', texto: 'Últimos 30 días', periodo: { desde: iso(hace30), hasta: iso(hoy) } },
    { id: 'anio', texto: 'Este año', periodo: { desde: `${hoy.getFullYear()}-01-01`, hasta: iso(hoy) } },
  ];
}

/** Lee y escribe el periodo en la dirección. Si lo escrito a mano en la dirección no es válido, no se pide nada. */
export function usePeriodoEnLaUrl() {
  const [params, setParams] = useSearchParams();
  const desde = params.get('desde') ?? undefined;
  const hasta = params.get('hasta') ?? undefined;

  const periodo = useMemo<PeriodoReporte>(() => ({ ...(desde ? { desde } : {}), ...(hasta ? { hasta } : {}) }), [desde, hasta]);
  const error = useMemo(() => errorDePeriodo(periodo), [periodo]);

  const aplicar = useCallback(
    (nuevo: PeriodoReporte | undefined) => {
      setParams(
        (previo) => {
          const siguiente = new URLSearchParams(previo);
          siguiente.delete('desde');
          siguiente.delete('hasta');
          if (nuevo?.desde) siguiente.set('desde', nuevo.desde);
          if (nuevo?.hasta) siguiente.set('hasta', nuevo.hasta);
          return siguiente;
        },
        { replace: true },
      );
    },
    [setParams],
  );

  return { periodo, error, habilitado: error === null, aplicar };
}

import { formatearPorcentaje } from '../../../shared/lib/format';
import type { Porcentaje } from '../../../shared/types/api';

/** Un porcentaje del backend, o "Sin datos" cuando no hay base para calcularlo (nunca se muestra 0 % por falta de datos). */
export const textoPorcentaje = (p: Porcentaje | undefined): string => (p === null || p === undefined ? 'Sin datos' : formatearPorcentaje(p));

/** "1" → "1 póliza", "2" → "2 pólizas". */
export const cantidad = (n: number, singular: string, plural: string): string => `${n} ${n === 1 ? singular : plural}`;

/** Canal de venta en lenguaje llano. */
export const TEXTO_CANAL_VENTA: Record<string, string> = {
  AUTONOMO: 'Compra autónoma',
  ASESORIA: 'Con asesoría',
  TELEMARKETING: 'Telemarketing',
};

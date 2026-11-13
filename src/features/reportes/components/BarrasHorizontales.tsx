import type { ReactNode } from 'react';
import Decimal from 'decimal.js';
import { cn } from '../../../shared/lib/utils';

export interface ItemBarra {
  id: string;
  etiqueta: string;
  /** Con esto se dibuja el largo de la barra (proporción respecto del mayor). Es solo visual. */
  valor: string | number;
  /** Lo que se LEE: el número real, ya formateado. Nunca se depende solo de la barra. */
  texto: ReactNode;
  detalle?: ReactNode;
}

/**
 * Barras horizontales sin librería de gráficos: cada fila lleva su valor en texto, así que la barra solo ayuda a comparar.
 * Serie principal en `navy`; `accent` se reserva a la Prueba de Choque (diseño §10.2: nunca colores de estado como serie).
 */
export function BarrasHorizontales({ items, tono = 'navy', etiqueta }: { items: ItemBarra[]; tono?: 'navy' | 'brand' | 'accent'; etiqueta: string }) {
  const mayor = items.reduce((m, i) => Decimal.max(m, i.valor), new Decimal(0));
  return (
    <ul aria-label={etiqueta} className="space-y-3">
      {items.map((i) => {
        const ancho = mayor.gt(0) ? new Decimal(i.valor).div(mayor).times(100).toDecimalPlaces(1).toNumber() : 0;
        return (
          <li key={i.id}>
            <div className="mb-1 flex flex-wrap items-baseline justify-between gap-x-3">
              <span className="font-bold text-navy-700">{i.etiqueta}</span>
              <span className="text-small text-ink">{i.texto}</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-navy-50" aria-hidden>
              <div
                className={cn('h-full rounded-full', tono === 'navy' && 'bg-navy-700', tono === 'brand' && 'bg-brand-500', tono === 'accent' && 'bg-accent-600')}
                style={{ width: `${ancho}%` }}
              />
            </div>
            {i.detalle ? <p className="mt-1 text-caption text-ink-soft">{i.detalle}</p> : null}
          </li>
        );
      })}
    </ul>
  );
}

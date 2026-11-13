import type { ReactNode } from 'react';
import { Card } from '../../../shared/ui/card';

/** Tarjeta de indicador (diseño §10.2): valor grande, etiqueta y, si hace falta, una ayuda en texto. */
export function KpiCard({ etiqueta, valor, ayuda }: { etiqueta: string; valor: ReactNode; ayuda?: ReactNode }) {
  return (
    <Card className="p-4 lg:p-5">
      <p className="text-small text-ink-soft">{etiqueta}</p>
      <p className="mt-1 text-money-xl text-navy-700">{valor}</p>
      {ayuda ? <p className="mt-1 text-caption text-ink-soft">{ayuda}</p> : null}
    </Card>
  );
}

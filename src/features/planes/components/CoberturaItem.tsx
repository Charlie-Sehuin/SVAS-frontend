import { Check, X } from 'lucide-react';
import { cn } from '../../../shared/lib/utils';
import type { CoberturaPlan } from '../../../shared/types/api';

/**
 * Fila de cobertura (diseño §8.5): icono en círculo + el texto "Incluida" / "No incluida" a la derecha (el estado
 * nunca va solo en el icono ni en el color), nombre a la izquierda y el detalle debajo ("Hasta USD 100,000").
 */
export function CoberturaItem({ cobertura }: { cobertura: CoberturaPlan }) {
  const { incluida } = cobertura;
  return (
    <li className="flex min-h-12 items-start gap-3 py-2">
      <span
        className={cn('mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full', incluida ? 'bg-out-0 text-status-success' : 'bg-surface-muted text-ink-soft')}
        aria-hidden
      >
        {incluida ? <Check className="size-4" /> : <X className="size-4" />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-bold text-navy-700">{cobertura.nombre}</p>
        {cobertura.detalle ? <p className="text-small text-ink-soft">{cobertura.detalle}</p> : null}
      </div>
      <span className={cn('shrink-0 text-small font-bold', incluida ? 'text-status-success' : 'text-ink-soft')}>{incluida ? 'Incluida' : 'No incluida'}</span>
    </li>
  );
}

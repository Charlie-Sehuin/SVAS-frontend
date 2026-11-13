import { formatearFecha } from '../../../shared/lib/format';
import type { CuotaCompra } from '../../../shared/types/api';
import { MoneyValue } from '../../../shared/ui/domain/MoneyValue';
import { StatusBadge } from '../../../shared/ui/domain/StatusBadge';

/** Cuotas tal como las devolvió el backend: el frontend no reparte ni suma nada. */
export function CronogramaCuotas({ cuotas }: { cuotas: CuotaCompra[] }) {
  return (
    <ol className="divide-y divide-line rounded-lg border border-line" aria-label="Cronograma de cuotas">
      {cuotas.map((c) => (
        <li key={c.numero} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2.5">
          <span className="w-16 font-bold text-navy-700">Cuota {c.numero}</span>
          <span className="flex-1 text-small text-ink-soft">
            Vence el {formatearFecha(`${c.fechaVencimiento}T12:00:00-05:00`, 'larga')}
          </span>
          <MoneyValue value={c.monto} />
          <StatusBadge entity="cuota" value={c.estado} />
        </li>
      ))}
    </ol>
  );
}

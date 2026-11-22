import { useState } from 'react';
import { CalendarRange } from 'lucide-react';
import { formatearFecha } from '../../../shared/lib/format';
import { cn } from '../../../shared/lib/utils';
import type { PolizaResumen } from '../../../shared/types/api';
import { Button } from '../../../shared/ui/button';
import { MoneyValue } from '../../../shared/ui/domain/MoneyValue';
import { StatusBadge } from '../../../shared/ui/domain/StatusBadge';
import { Badge } from '../../../shared/ui/badge';
import { cuandoVence } from '../lib/avisos';
import { PagarCuotasDialog } from './PagarCuotasDialog';

type Pago = NonNullable<PolizaResumen['pago']>;

/**
 * Cuotas de una póliza pagada en cuotas (Mis pólizas): el cronograma con su estado EN TEXTO, la próxima cuota
 * resaltada y "Pagar cuotas". Una cuota vencida solo se avisa: no hay recargo ni bloqueo.
 */
export function CuotasPoliza({ poliza }: { poliza: Pick<PolizaResumen, 'ordenId' | 'numero'> & { pago: Pago } }) {
  const [verCronograma, setVerCronograma] = useState(false);
  const [pagando, setPagando] = useState(false);
  const cuotas = poliza.pago.cuotas;
  const pendientes = cuotas.filter((c) => c.estado === 'PENDIENTE');
  const siguiente = [...pendientes].sort((a, b) => a.numero - b.numero)[0];
  const alDia = pendientes.length === 0;

  if (cuotas.length === 0) return null;

  return (
    <section className="mt-4 rounded-lg border border-line p-3" aria-label="Cuotas de la póliza">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h3 className="font-bold text-navy-700">Tus cuotas</h3>
        {alDia ? <Badge tone="success">Todo pagado</Badge> : <span className="text-small text-ink-soft">Te quedan {pendientes.length} por pagar</span>}
      </div>

      {siguiente ? (
        <p
          className={cn(
            'mt-2 rounded-lg p-3 text-small',
            (siguiente.diasParaVencer ?? 0) < 0 ? 'bg-status-danger/10 text-ink' : 'bg-status-warning/15 text-ink',
          )}
        >
          <span className="font-bold">Siguiente: cuota {siguiente.numero}</span> · <MoneyValue value={siguiente.monto} /> ·{' '}
          {siguiente.diasParaVencer !== null ? cuandoVence(siguiente.diasParaVencer) : ''} (
          {formatearFecha(`${siguiente.fechaVencimiento}T12:00:00-05:00`, 'larga')})
        </p>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2">
        {siguiente ? (
          <Button size="sm" onClick={() => setPagando(true)}>
            Pagar cuotas
          </Button>
        ) : null}
        <Button variant="outlineNavy" size="sm" aria-expanded={verCronograma} onClick={() => setVerCronograma((v) => !v)}>
          <CalendarRange aria-hidden /> {verCronograma ? 'Ocultar cronograma' : 'Ver cronograma'}
        </Button>
      </div>

      {verCronograma ? (
        <ol className="mt-3 divide-y divide-line rounded-lg border border-line" aria-label="Cronograma de cuotas">
          {cuotas.map((c) => (
            <li key={c.numero} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2.5">
              <span className="w-16 font-bold text-navy-700">Cuota {c.numero}</span>
              <span className="flex-1 text-small text-ink-soft">
                {c.estado === 'PENDIENTE' && c.diasParaVencer !== null && c.diasParaVencer < 0 ? (
                  <span className="font-bold text-status-danger">Vencida · </span>
                ) : null}
                Vence el {formatearFecha(`${c.fechaVencimiento}T12:00:00-05:00`, 'larga')}
              </span>
              <MoneyValue value={c.monto} />
              <StatusBadge entity="cuota" value={c.estado} />
            </li>
          ))}
        </ol>
      ) : null}

      {pagando ? <PagarCuotasDialog open onOpenChange={setPagando} poliza={{ ordenId: poliza.ordenId, numero: poliza.numero, cuotas }} /> : null}
    </section>
  );
}

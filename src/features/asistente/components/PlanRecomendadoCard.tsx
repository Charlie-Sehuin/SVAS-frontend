import type { PlanRecomendado } from '../../../shared/types/api';
import { Card } from '../../../shared/ui/card';
import { MoneyValue } from '../../../shared/ui/domain/MoneyValue';

/**
 * Plan que el asistente recomienda. Los montos (si hay cotización) los calculó el backend y se pintan tal cual:
 * el frontend no calcula ni redondea dinero, y el texto del asistente nunca los aporta.
 */
export function PlanRecomendadoCard({ plan, onVer }: { plan: PlanRecomendado; onVer?: (plan: PlanRecomendado) => void }) {
  return (
    <Card className="p-3">
      <p className="text-caption text-ink-soft">{plan.aseguradora}</p>
      <p className="text-base font-bold text-navy-700">{plan.plan}</p>
      {plan.resumen ? <p className="mt-1 text-small text-ink-soft">{plan.resumen}</p> : null}
      {plan.motivo ? <p className="mt-2 text-small text-ink">{plan.motivo}</p> : null}
      {plan.primaAnual ? (
        <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          {plan.primaMensual ? <MoneyValue value={plan.primaMensual} size="md" sufijo="/ mes" sufijoAria="al mes" /> : null}
          <span className="text-small text-ink-soft">
            <MoneyValue value={plan.primaAnual} size="inline" /> al año
          </span>
        </div>
      ) : null}
      {plan.primaCotizadaId && onVer ? (
        <button
          type="button"
          onClick={() => onVer(plan)}
          className="mt-2 text-small font-bold text-brand-600 underline-offset-4 hover:underline focus-visible:outline-3 focus-visible:outline-brand-300"
        >
          Ver en mi cotización
        </button>
      ) : null}
    </Card>
  );
}

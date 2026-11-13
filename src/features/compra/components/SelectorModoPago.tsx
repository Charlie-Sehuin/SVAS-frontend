import { Banknote, CalendarRange } from 'lucide-react';
import { aDecimal, formatearPorcentaje } from '../../../shared/lib/format';
import { cn } from '../../../shared/lib/utils';
import type { ResumenCompra } from '../../../shared/types/api';
import type { ModoPago } from '../../../shared/types/enums';
import { MoneyValue } from '../../../shared/ui/domain/MoneyValue';

interface Props {
  pago: ResumenCompra['pago'];
  aseguradora: string;
  valor: ModoPago;
  onChange: (modo: ModoPago) => void;
  deshabilitado?: boolean;
}

/** Dos tarjetas-radio (diseño §9.6) con el total y la cuota que devuelve el backend. Nada se calcula en el navegador. */
export function SelectorModoPago({ pago, aseguradora, valor, onChange, deshabilitado = false }: Props) {
  const cuotas = pago.CUOTAS;
  // Solo se compara con cero para decidir si se muestra el aviso; el porcentaje lo calcula el backend.
  const hayRecargo = cuotas ? aDecimal(cuotas.recargoPorcentaje).gt(0) : false;

  const tarjeta = (activa: boolean) =>
    cn(
      'flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border-2 bg-surface p-4 transition-colors',
      'has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand-300',
      activa ? 'border-brand-500 bg-brand-50' : 'border-line hover:border-navy-300',
      deshabilitado && 'cursor-not-allowed opacity-60',
    );

  return (
    <fieldset className="space-y-3" disabled={deshabilitado}>
      <legend className="mb-2 text-h3 text-navy-700">¿Cómo quieres pagar?</legend>

      <label className={tarjeta(valor === 'UNICO')}>
        <input
          type="radio"
          name="modo-pago"
          value="UNICO"
          checked={valor === 'UNICO'}
          onChange={() => onChange('UNICO')}
          className="mt-1 size-5 accent-brand-500"
        />
        <Banknote className="mt-0.5 size-6 shrink-0 text-navy-700" aria-hidden />
        <span className="flex-1">
          <span className="block font-bold text-navy-700">Pago único</span>
          <span className="block text-small text-ink-soft">Pagas todo hoy, una sola vez.</span>
        </span>
        <MoneyValue value={pago.UNICO.total} size="md" />
      </label>

      {cuotas ? (
        <label className={tarjeta(valor === 'CUOTAS')}>
          <input
            type="radio"
            name="modo-pago"
            value="CUOTAS"
            checked={valor === 'CUOTAS'}
            onChange={() => onChange('CUOTAS')}
            className="mt-1 size-5 accent-brand-500"
          />
          <CalendarRange className="mt-0.5 size-6 shrink-0 text-navy-700" aria-hidden />
          <span className="flex-1">
            <span className="block font-bold text-navy-700">{cuotas.numeroCuotas} cuotas</span>
            <span className="block text-small text-ink-soft">
              Total <MoneyValue value={cuotas.total} />
            </span>
            {hayRecargo ? (
              <span className="mt-1 block text-small text-ink-soft">
                Pagar en cuotas tiene un recargo de {formatearPorcentaje(cuotas.recargoPorcentaje)} en {aseguradora}.
              </span>
            ) : null}
          </span>
          <MoneyValue value={cuotas.cuotaMensual} size="md" sufijo="/ mes" sufijoAria="al mes" />
        </label>
      ) : null}
    </fieldset>
  );
}

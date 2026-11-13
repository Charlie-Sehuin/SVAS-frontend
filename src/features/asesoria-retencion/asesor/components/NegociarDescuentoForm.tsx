import { useState, type FormEvent } from 'react';
import { BadgePercent } from 'lucide-react';
import { isApiError } from '../../../../shared/lib/api-client';
import { aDecimal, formatearFecha, formatearPorcentaje } from '../../../../shared/lib/format';
import { cn } from '../../../../shared/lib/utils';
import type { SolicitudDetalle } from '../../../../shared/types/api';
import { Button } from '../../../../shared/ui/button';
import { Field } from '../../../../shared/ui/field';
import { Input } from '../../../../shared/ui/input';
import { MoneyValue } from '../../../../shared/ui/domain/MoneyValue';
import { Badge } from '../../../../shared/ui/badge';
import { ErrorToast, SuccessToast } from '../../../../shared/ui/domain/toasts';
import { useAplicarDescuento } from '../../hooks/useAsesoria';

const FORMATO_PORCENTAJE = /^\d{1,3}(\.\d{1,2})?$/;

interface Props {
  caso: SolicitudDetalle;
  /** Solo el asesor que tomó el caso, mientras está en atención, puede negociar. */
  habilitado: boolean;
}

/**
 * Descuento negociado (RF-14, RN-07, RN-09). El tope vigente se ve SIEMPRE ("Máximo permitido: 10 %") y el campo no deja
 * pasarse de él; el backend vuelve a validar el tope y que no se acumulen descuentos. Se aplica a un plan de la cotización.
 */
export function NegociarDescuentoForm({ caso, habilitado }: Props) {
  const aplicar = useAplicarDescuento(caso.id);
  const [planId, setPlanId] = useState('');
  const [porcentaje, setPorcentaje] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [errorPlan, setErrorPlan] = useState<string | undefined>();

  function validar(): string | undefined {
    const v = porcentaje.trim();
    if (!FORMATO_PORCENTAJE.test(v)) return 'Ingresa el porcentaje como número, p. ej. 8.50';
    if (aDecimal(v).lte(0)) return 'El descuento debe ser mayor que 0';
    if (aDecimal(v).gt(caso.descuentoMaximo)) return `El máximo permitido es ${formatearPorcentaje(caso.descuentoMaximo)}`;
    return undefined;
  }

  function enviar(e: FormEvent) {
    e.preventDefault();
    const sinPlan = planId ? undefined : 'Elige el plan al que le aplicas el descuento';
    const problema = validar();
    setErrorPlan(sinPlan);
    setError(problema);
    if (sinPlan || problema) return;
    aplicar.mutate(
      { planId, porcentaje: porcentaje.trim() },
      {
        onSuccess: () => {
          SuccessToast('Descuento aplicado', 'Queda registrado en el caso.');
          setPorcentaje('');
        },
        onError: (err) => {
          // El mensaje del backend (tope, descuento ya existente…) se muestra tal cual, junto al campo.
          if (isApiError(err) && err.statusCode < 500) setError(err.message);
          else ErrorToast(err);
        },
      },
    );
  }

  const nombrePlan = (id: string) => {
    const p = caso.primas.find((x) => x.planId === id);
    return p ? `${p.aseguradora} · Plan ${p.plan}` : 'Plan';
  };

  return (
    <section aria-labelledby="titulo-descuento" className="rounded-xl border border-line bg-surface p-4">
      <h2 id="titulo-descuento" className="flex items-center gap-2 text-h3 text-navy-700">
        <BadgePercent className="size-5" aria-hidden /> Negociar descuento
      </h2>
      <p className="mt-1 text-small text-ink-soft">Máximo permitido: {formatearPorcentaje(caso.descuentoMaximo)}</p>

      {habilitado ? (
        <form onSubmit={enviar} noValidate className="mt-4">
          <fieldset className="mb-4">
            <legend className="mb-1.5 text-small font-bold text-navy-700">
              Plan <span aria-hidden className="text-brand-600">*</span>
            </legend>
            <ul className="space-y-2">
              {caso.primas.map((x) => {
                const disponible = x.disponible;
                const elegido = planId === x.planId;
                const vigente = caso.descuentos.find((d) => d.planId === x.planId && d.aceptado);
                return (
                  <li key={x.planId}>
                    <label
                      className={cn(
                        'flex min-h-11 items-start gap-3 rounded-xl border-2 bg-surface p-3 transition-colors has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand-300',
                        disponible ? 'cursor-pointer' : 'cursor-not-allowed opacity-60',
                        elegido ? 'border-brand-500 bg-brand-50' : 'border-line',
                        disponible && !elegido && 'hover:border-navy-300',
                      )}
                    >
                      <input
                        type="radio"
                        name="plan-descuento"
                        value={x.planId}
                        checked={elegido}
                        disabled={!disponible}
                        onChange={() => setPlanId(x.planId)}
                        aria-describedby={errorPlan ? 'error-plan' : undefined}
                        className="mt-1 size-5 accent-brand-500"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block font-bold text-navy-700">
                          {x.aseguradora} · Plan {x.plan}
                        </span>
                        {disponible && x.primaMensual && x.prima ? (
                          <span className="block text-small text-ink-soft">
                            <MoneyValue value={x.primaMensual} sufijo="/ mes" sufijoAria="al mes" /> · <MoneyValue value={x.prima} sufijo="al año" />
                          </span>
                        ) : (
                          <span className="block text-small text-ink-soft">No disponible para este vehículo</span>
                        )}
                        {vigente ? (
                          <Badge tone="success" className="mt-1">
                            Descuento vigente: {formatearPorcentaje(vigente.porcentaje)}
                          </Badge>
                        ) : null}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
            {errorPlan ? (
              <p id="error-plan" role="alert" className="mt-1.5 text-small text-status-danger">
                {errorPlan}
              </p>
            ) : null}
          </fieldset>
          <Field label="Porcentaje de descuento" help={`Hasta ${formatearPorcentaje(caso.descuentoMaximo)}`} error={error} required>
            {(p) => (
              <Input
                {...p}
                value={porcentaje}
                onChange={(e) => setPorcentaje(e.target.value)}
                inputMode="decimal"
                placeholder="8.50"
                invalid={!!error}
              />
            )}
          </Field>
          <Button type="submit" loading={aplicar.isPending} loadingText="Aplicando…">
            Aplicar descuento
          </Button>
        </form>
      ) : (
        <p className="mt-3 text-small text-ink-soft">Solo el asesor que atiende el caso puede negociar descuentos.</p>
      )}

      <h3 className="mb-1 mt-5 font-bold text-navy-700">Descuentos de este caso</h3>
      <p className="mb-2 text-caption text-ink-soft">Solo queda vigente un descuento por cotización: el mayor. Si propones uno igual o menor, se guarda pero no cambia el vigente.</p>
      {caso.descuentos.length === 0 ? (
        <p className="text-small text-ink-soft">Todavía no hay descuentos negociados.</p>
      ) : (
        <ul className="divide-y divide-line rounded-lg border border-line">
          {caso.descuentos.map((d) => (
            <li key={d.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-small">
              <span className="flex-1 font-bold text-navy-700">{nombrePlan(d.planId)}</span>
              <span>{formatearPorcentaje(d.porcentaje)}</span>
              <span className="text-ink-soft">{d.tipo === 'NEGOCIADO' ? 'Negociado' : 'Primera compra'}</span>
              <span className={d.aceptado ? 'font-bold text-status-success' : 'text-ink-soft'}>{d.aceptado ? 'Vigente' : 'No vigente'}</span>
              <span className="text-ink-soft">{formatearFecha(d.fecha)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

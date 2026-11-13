import { useEffect, useState, type FormEvent } from 'react';
import { CalendarRange } from 'lucide-react';
import { cn } from '../../../shared/lib/utils';
import { formatearFecha } from '../../../shared/lib/format';
import type { PeriodoReporte } from '../../../shared/types/api';
import { Button } from '../../../shared/ui/button';
import { Input } from '../../../shared/ui/input';
import { atajos, errorDePeriodo } from '../lib/periodo';

interface Props {
  /** El periodo pedido (puede estar vacío = mes en curso). */
  periodo: PeriodoReporte;
  /** Error del periodo que vino de la dirección (escrito a mano), si lo hay. */
  errorExterno: string | null;
  /** El periodo que el backend realmente usó, para decirlo en texto. */
  usado?: { desde: string; hasta: string } | undefined;
  onAplicar: (p: PeriodoReporte | undefined) => void;
}

/**
 * Periodo del reporte (diseño §10.1): atajos y dos fechas. Sin fechas, el backend usa el mes en curso y la pantalla dice cuál
 * fue en texto ("Mostrando del 1 al 12 de noviembre"). Se valida igual que el backend: fechas reales, "desde" no posterior a
 * "hasta" y como máximo un año; un periodo inválido no se envía.
 */
export function FiltroPeriodo({ periodo, errorExterno, usado, onAplicar }: Props) {
  const [desde, setDesde] = useState(periodo.desde ?? '');
  const [hasta, setHasta] = useState(periodo.hasta ?? '');
  const [error, setError] = useState<string | null>(null);

  // Si el periodo cambia desde fuera (un atajo, el botón Atrás), los campos lo reflejan.
  useEffect(() => {
    setDesde(periodo.desde ?? '');
    setHasta(periodo.hasta ?? '');
    setError(null);
  }, [periodo.desde, periodo.hasta]);

  function enviar(e: FormEvent) {
    e.preventDefault();
    const nuevo: PeriodoReporte = { ...(desde ? { desde } : {}), ...(hasta ? { hasta } : {}) };
    const problema = errorDePeriodo(nuevo);
    setError(problema);
    if (problema) return;
    onAplicar(desde || hasta ? nuevo : undefined);
  }

  const mostrado = error ?? errorExterno;
  const sinFiltro = !periodo.desde && !periodo.hasta;

  return (
    <div role="search" aria-label="Periodo del reporte" className="mb-5 rounded-xl border border-line bg-surface p-3">
      <div className="mb-3 flex flex-wrap gap-2">
        {atajos().map((a) => {
          const activo = a.periodo === undefined ? sinFiltro : a.periodo.desde === periodo.desde && a.periodo.hasta === periodo.hasta;
          return (
            <button
              key={a.id}
              type="button"
              aria-pressed={activo}
              onClick={() => onAplicar(a.periodo)}
              className={cn(
                'min-h-9 rounded-full border-2 px-3 text-small font-bold transition-colors focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand-300',
                activo ? 'border-navy-700 bg-navy-50 text-navy-700' : 'border-line bg-surface text-ink-soft hover:border-navy-300',
              )}
            >
              {a.texto}
            </button>
          );
        })}
      </div>

      <form onSubmit={enviar} noValidate className="flex flex-wrap items-end gap-3">
        <label className="flex min-w-40 flex-col gap-1">
          <span className="text-small font-bold text-navy-700">Desde</span>
          <Input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className="h-10" invalid={!!mostrado} />
        </label>
        <label className="flex min-w-40 flex-col gap-1">
          <span className="text-small font-bold text-navy-700">Hasta</span>
          <Input type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className="h-10" invalid={!!mostrado} />
        </label>
        <Button type="submit" variant="outlineNavy">
          Aplicar fechas
        </Button>
      </form>

      {mostrado ? (
        <p role="alert" className="mt-2 text-small text-status-danger">
          {mostrado}
        </p>
      ) : usado ? (
        <p className="mt-2 flex items-center gap-1.5 text-small text-ink-soft">
          <CalendarRange className="size-4 shrink-0" aria-hidden /> Mostrando del {formatearFecha(`${usado.desde}T12:00:00-05:00`, 'larga')} al{' '}
          {formatearFecha(`${usado.hasta}T12:00:00-05:00`, 'larga')}.
        </p>
      ) : null}
    </div>
  );
}

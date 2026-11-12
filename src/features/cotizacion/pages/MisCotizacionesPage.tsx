import { Link, NavLink } from 'react-router-dom';
import { Car } from 'lucide-react';
import { formatearFecha } from '../../../shared/lib/format';
import { cn } from '../../../shared/lib/utils';
import { Button } from '../../../shared/ui/button';
import { Card } from '../../../shared/ui/card';
import { Skeleton } from '../../../shared/ui/skeleton';
import { EstadoError, EstadoVacio } from '../../../shared/ui/domain/EstadoVacio';
import { MoneyValue } from '../../../shared/ui/domain/MoneyValue';
import { StatusBadge } from '../../../shared/ui/domain/StatusBadge';
import { useMisCotizaciones } from '../hooks/useCotizacion';

/** Pestañas de "Mi cuenta" (diseño §9.9). Las pólizas se construyen en la Ola 3. */
export function MiCuentaTabs() {
  const tab = ({ isActive }: { isActive: boolean }) =>
    cn(
      'flex min-h-11 items-center border-b-[3px] px-4 font-bold transition-colors',
      isActive ? 'border-brand-500 text-navy-700' : 'border-transparent text-ink-soft hover:text-navy-700',
    );
  return (
    <nav aria-label="Mi cuenta" className="mb-6 flex border-b border-line">
      <NavLink to="/mi-cuenta/cotizaciones" className={tab}>
        Mis cotizaciones
      </NavLink>
      <NavLink to="/mi-cuenta/polizas" className={tab}>
        Mis pólizas
      </NavLink>
    </nav>
  );
}

/** `/mi-cuenta/cotizaciones` (CLIENTE): cada cotización es una tarjeta con su estado y una acción única. */
export function MisCotizacionesPage() {
  const { data, isLoading, isError, error, refetch } = useMisCotizaciones();

  return (
    <section className="mx-auto max-w-3xl px-4 py-6 lg:py-10">
      <h1 className="mb-4 text-h1 text-navy-700">Mi cuenta</h1>
      <MiCuentaTabs />

      {isError ? (
        <EstadoError error={error} onRetry={() => void refetch()} />
      ) : isLoading ? (
        <div className="space-y-3" aria-busy aria-label="Cargando tus cotizaciones">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : data && data.length === 0 ? (
        <EstadoVacio
          titulo="Aún no tienes cotizaciones."
          accion={
            <Button asChild>
              <Link to="/cotizar">Cotizar ahora</Link>
            </Button>
          }
        />
      ) : (
        <ul className="space-y-3">
          {data?.map((c) => (
            <li key={c.id}>
              <Card className="flex flex-wrap items-center gap-x-4 gap-y-3 p-4">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-navy-50">
                  <Car className="size-6 text-navy-700" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-navy-700">
                    {c.vehiculo.marca} {c.vehiculo.modelo} {c.vehiculo.anio}
                  </p>
                  <p className="text-small text-ink-soft">{formatearFecha(c.fecha, 'larga')}</p>
                  {c.primaMensualDesde ? (
                    <p className="mt-1 flex items-baseline gap-1 text-small text-ink-soft">
                      Desde <MoneyValue value={c.primaMensualDesde} size="md" sufijo="/ mes" sufijoAria="al mes" />
                    </p>
                  ) : null}
                </div>
                <StatusBadge entity="cotizacion" value={c.estado} />
                <Button variant="outlineNavy" size="sm" asChild>
                  <Link to={`/cotizacion/${c.id}`}>{c.estado === 'CONVERTIDA' ? 'Ver' : 'Continuar'}</Link>
                </Button>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

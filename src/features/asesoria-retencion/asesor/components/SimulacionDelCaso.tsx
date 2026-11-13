import { ShieldAlert } from 'lucide-react';
import { formatearFecha } from '../../../../shared/lib/format';
import { Skeleton } from '../../../../shared/ui/skeleton';
import { MoneyValue } from '../../../../shared/ui/domain/MoneyValue';
import { Badge } from '../../../../shared/ui/badge';
import { useUltimaSimulacion } from '../../../prueba-choque/hooks/usePruebaChoque';

/**
 * Resumen de la Prueba de Choque del cliente dentro del caso (RF-35, diseño §10.3): le dice al asesor qué plan protege mejor
 * y cuál es el peor caso, para conversar con datos. Solo se pide cuando el asesor puede ver la cotización (caso tomado);
 * los montos son los de la simulación guardada, el frontend no calcula nada.
 */
export function SimulacionDelCaso({ cotizacionId, puedeVer }: { cotizacionId: string; puedeVer: boolean }) {
  const { data, isLoading, isError } = useUltimaSimulacion(puedeVer ? cotizacionId : undefined);
  const sim = data?.simulacion;

  return (
    <section aria-labelledby="titulo-simulacion" className="rounded-xl bg-accent-50 p-4">
      <h2 id="titulo-simulacion" className="flex items-center gap-2 text-h3 text-navy-700">
        <ShieldAlert className="size-5 text-accent-600" aria-hidden /> Prueba de Choque del cliente
      </h2>

      {!puedeVer ? (
        <p className="mt-2 text-small text-ink-soft">Toma el caso para ver la Prueba de Choque de este cliente.</p>
      ) : isLoading ? (
        <Skeleton className="mt-3 h-24 w-full" aria-busy aria-label="Cargando la Prueba de Choque" />
      ) : isError ? (
        <p className="mt-2 text-small text-ink-soft">No pudimos cargar la Prueba de Choque de este cliente.</p>
      ) : !sim ? (
        <p className="mt-2 text-small text-ink-soft">El cliente todavía no hizo la Prueba de Choque.</p>
      ) : (
        <>
          <p className="mt-1 text-caption text-ink-soft">Simulada el {formatearFecha(sim.fecha, 'larga')}</p>
          {!sim.vigente ? (
            <p role="status" className="mt-2 rounded-lg bg-status-warning/15 px-3 py-2 text-small text-ink">
              El cliente cambió su suma asegurada después de simular: estos números ya no están vigentes.
            </p>
          ) : null}
          <ol className="mt-3 space-y-2" aria-label="Ranking por costo real anual">
            {sim.ranking.slice(0, 3).map((p) => (
              <li key={p.primaCotizadaId} className="rounded-lg bg-surface p-3">
                <div className="flex flex-wrap items-center gap-x-2">
                  <span className="font-bold text-navy-700">
                    {p.posicion}. {p.aseguradora} · Plan {p.plan}
                  </span>
                  {!p.datosCompletos ? <Badge tone="warning">Información incompleta</Badge> : null}
                </div>
                <p className="text-small text-ink-soft">
                  Costo real al año <MoneyValue value={p.costoRealAnual} /> · Peor caso <MoneyValue value={p.peorCaso} />
                </p>
              </li>
            ))}
          </ol>
          <p className="mt-2 text-caption text-ink-soft">{sim.leyenda}</p>
        </>
      )}
    </section>
  );
}

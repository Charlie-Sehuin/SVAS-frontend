import type { ReactNode } from 'react';
import type { UseQueryResult } from '@tanstack/react-query';
import { Skeleton } from '../../../shared/ui/skeleton';
import { EstadoError } from '../../../shared/ui/domain/EstadoVacio';
import { PageHeader } from '../../../shared/ui/domain/PageHeader';
import type { usePeriodoEnLaUrl } from '../lib/periodo';
import { FiltroPeriodo } from './FiltroPeriodo';

interface Props<T extends { desde: string; hasta: string }> {
  titulo: string;
  descripcion: string;
  accion?: ReactNode;
  periodo: ReturnType<typeof usePeriodoEnLaUrl>;
  consulta: UseQueryResult<T>;
  children: (datos: T) => ReactNode;
}

/**
 * Marco común de todos los reportes: título, selector de periodo y los tres estados (cargando, error, datos). Mientras llega
 * un periodo nuevo se conserva lo anterior, atenuado y marcado como ocupado, en vez de vaciar la pantalla.
 */
export function ReporteShell<T extends { desde: string; hasta: string }>({ titulo, descripcion, accion, periodo, consulta, children }: Props<T>) {
  const { data, isError, error, isLoading, isFetching, refetch } = consulta;

  return (
    <>
      <PageHeader titulo={titulo} descripcion={descripcion} accion={accion} />
      <FiltroPeriodo periodo={periodo.periodo} errorExterno={periodo.error} usado={data} onAplicar={periodo.aplicar} />

      {!periodo.habilitado ? null : isError ? (
        <EstadoError error={error} onRetry={() => void refetch()} />
      ) : isLoading || !data ? (
        <div className="space-y-3" aria-busy aria-label="Cargando el reporte">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      ) : (
        <div aria-busy={isFetching} className={isFetching ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
          {children(data)}
        </div>
      )}
    </>
  );
}

import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { qk } from '../../../shared/lib/query-keys';
import { formatearFecha } from '../../../shared/lib/format';
import { Badge } from '../../../shared/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../../../shared/ui/card';
import { Skeleton } from '../../../shared/ui/skeleton';
import { EstadoError, EstadoVacio } from '../../../shared/ui/domain/EstadoVacio';
import { PageHeader } from '../../../shared/ui/domain/PageHeader';
import { obtenerPanel } from '../api/admin.api';

/**
 * Inicio del ADMINISTRADOR con los contadores del catálogo y los últimos cambios (`GET /admin/panel`).
 * El dashboard del administrador (`/app`) lo incluye como una sección; esta pantalla suelta sigue disponible.
 */
export function PanelAdminPage() {
  return (
    <>
      <PageHeader titulo="Panel" descripcion="Estado del catálogo y últimos cambios registrados." />
      <PanelAdminContenido />
    </>
  );
}

/** Los contadores del catálogo y los últimos cambios, sin título: el dashboard del administrador los muestra como una sección más. */
export function PanelAdminContenido() {
  const { data, isLoading, isError, error, refetch } = useQuery({ queryKey: qk.admin.panel, queryFn: obtenerPanel, staleTime: 30_000 });

  return (
    <>
      {isError ? (
        <EstadoError error={error} onRetry={() => void refetch()} />
      ) : isLoading || !data ? (
        <div className="grid gap-4 sm:grid-cols-3" aria-busy aria-label="Cargando panel">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Contador etiqueta="Aseguradoras activas" activos={data.aseguradoras.activas} total={data.aseguradoras.total} to="/app/admin/aseguradoras" />
            <Contador etiqueta="Planes activos" activos={data.planes.activos} total={data.planes.total} to="/app/admin/aseguradoras" />
            <Contador etiqueta="Campos activos" activos={data.campos.activos} total={data.campos.total} to="/app/admin/campos" />
          </div>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Últimos cambios</CardTitle>
            </CardHeader>
            <CardContent>
              {data.ultimosCambios.length === 0 ? (
                <EstadoVacio titulo="Todavía no hay cambios registrados." />
              ) : (
                <ul className="divide-y divide-line">
                  {data.ultimosCambios.map((c) => (
                    <li key={c.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-small">
                      <span className="tabular text-ink-soft">{formatearFecha(c.fecha, 'hora')}</span>
                      <Badge tone="navy" dot={false}>
                        {c.accion}
                      </Badge>
                      <span className="font-mono text-ink">{c.entidad}</span>
                    </li>
                  ))}
                </ul>
              )}
              <Link to="/app/admin/bitacora" className="mt-3 inline-block text-small font-bold text-brand-600 underline-offset-4 hover:underline">
                Ver toda la bitácora
              </Link>
            </CardContent>
          </Card>
        </>
      )}
    </>
  );
}

function Contador({ etiqueta, activos, total, to }: { etiqueta: string; activos: number; total: number; to: string }) {
  return (
    <Link to={to} className="block rounded-xl focus-visible:outline-3">
      <Card className="h-full transition-colors hover:border-navy-500">
        <CardContent className="p-4 pt-4 lg:p-5 lg:pt-5">
          <p className="text-small text-ink-soft">{etiqueta}</p>
          <p className="mt-1 text-money-xl text-navy-700">
            {activos} <span className="text-money-md text-ink-soft">de {total}</span>
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}

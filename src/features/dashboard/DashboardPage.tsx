import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/useAuth';
import { tiempoTranscurrido } from '../../shared/lib/format';
import { Button } from '../../shared/ui/button';
import { Card } from '../../shared/ui/card';
import { Skeleton } from '../../shared/ui/skeleton';
import { EstadoError } from '../../shared/ui/domain/EstadoVacio';
import { MoneyValue } from '../../shared/ui/domain/MoneyValue';
import { PageHeader } from '../../shared/ui/domain/PageHeader';
import { useColaAsesoria, useSeguimientos } from '../asesoria-retencion/hooks/useAsesoria';
import { TEXTO_MOTIVO } from '../asesoria-retencion/asesor/textos';
import { useCompletitudContenido } from '../administracion/hooks/useContenidoAdmin';
import { PanelAdminContenido } from '../administracion/pages/PanelAdminPage';
import { BarrasHorizontales } from '../reportes/components/BarrasHorizontales';
import { KpiCard } from '../reportes/components/KpiCard';
import { useMiDesempeno, useVentas } from '../reportes/hooks/useReportes';
import { cantidad, TEXTO_CANAL_VENTA, textoPorcentaje } from '../reportes/lib/formato';

/**
 * `/app` (diseño §10.2, RF-38): el dashboard según el rol. El ASESOR ve su trabajo del día (su cola y sus seguimientos) y su
 * mes; el ADMINISTRADOR ve las ventas del mes por canal, qué requiere su atención y el estado del catálogo. Cada cifra sale del
 * backend; el periodo es siempre el mes en curso.
 */
export function DashboardPage() {
  const { roles } = useAuth();
  return roles.includes('ADMINISTRADOR') ? <DashboardAdmin /> : <DashboardAsesor />;
}

/* ───────────────────────── Administrador ───────────────────────── */

function DashboardAdmin() {
  const ventas = useVentas({}, 'canal');
  const completitud = useCompletitudContenido();
  const cola = useColaAsesoria({});
  const seguimientos = useSeguimientos();

  const pendientes = cola.data?.filter((s) => s.estado === 'PENDIENTE').length;
  const planesIncompletos = completitud.data?.planesActivosIncompletos;

  return (
    <>
      <PageHeader titulo="Dashboard" descripcion="Las ventas del mes en curso y lo que necesita tu atención." />

      {ventas.isError ? (
        <EstadoError error={ventas.error} onRetry={() => void ventas.refetch()} />
      ) : ventas.isLoading || !ventas.data ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-busy aria-label="Cargando las ventas del mes">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard etiqueta="Pólizas del mes" valor={ventas.data.totales.polizas} ayuda={`${cantidad(ventas.data.totales.enCuotas, 'compra', 'compras')} en cuotas`} />
            <KpiCard etiqueta="Prima final vendida" valor={<MoneyValue value={ventas.data.totales.primaFinal} size="inline" className="text-money-xl text-navy-700" />} />
            <KpiCard etiqueta="Cobrado hasta hoy" valor={<MoneyValue value={ventas.data.totales.cobrado} size="inline" className="text-money-xl text-navy-700" />} />
            <KpiCard
              etiqueta="Ticket promedio"
              valor={ventas.data.totales.ticketPromedio === null ? 'Sin datos' : <MoneyValue value={ventas.data.totales.ticketPromedio} size="inline" className="text-money-xl text-navy-700" />}
            />
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <Card className="p-4 lg:p-5">
              <h2 className="mb-3 text-h3 text-navy-700">Ventas por canal</h2>
              {ventas.data.grupos.length === 0 ? (
                <p className="text-ink-soft">Todavía no hay ventas este mes.</p>
              ) : (
                <BarrasHorizontales
                  etiqueta="Prima final por canal"
                  items={ventas.data.grupos.map((g) => ({
                    id: g.clave,
                    etiqueta: TEXTO_CANAL_VENTA[g.etiqueta] ?? g.etiqueta,
                    valor: g.primaFinal,
                    texto: (
                      <>
                        <MoneyValue value={g.primaFinal} /> · {textoPorcentaje(g.participacion)}
                      </>
                    ),
                    detalle: cantidad(g.polizas, 'póliza', 'pólizas'),
                  }))}
                />
              )}
              <Button variant="link" asChild className="mt-3">
                <Link to="/app/reportes/ventas">Ver el reporte de ventas</Link>
              </Button>
            </Card>

            <Card className="p-4 lg:p-5">
              <h2 className="mb-3 text-h3 text-navy-700">Para revisar</h2>
              <ul className="space-y-3">
                <ItemRevisar
                  cargando={cola.isLoading}
                  texto={pendientes === undefined ? '' : pendientes === 0 ? 'No hay solicitudes de asesoría pendientes.' : `${cantidad(pendientes, 'solicitud de asesoría pendiente', 'solicitudes de asesoría pendientes')}`}
                  alerta={!!pendientes}
                  to="/app/asesorias"
                  enlace="Ver la cola"
                />
                <ItemRevisar
                  cargando={seguimientos.isLoading}
                  texto={
                    seguimientos.data === undefined
                      ? ''
                      : seguimientos.data.length === 0
                        ? 'No hay seguimientos abiertos.'
                        : cantidad(seguimientos.data.length, 'seguimiento abierto', 'seguimientos abiertos')
                  }
                  to="/app/seguimientos"
                  enlace="Ver seguimientos"
                />
                <ItemRevisar
                  cargando={completitud.isLoading}
                  texto={
                    planesIncompletos === undefined
                      ? ''
                      : planesIncompletos === 0
                        ? 'Todos los planes activos tienen su contenido completo.'
                        : cantidad(planesIncompletos, 'plan activo con el contenido incompleto', 'planes activos con el contenido incompleto')
                  }
                  alerta={!!planesIncompletos}
                  to="/app/admin/contenido/completitud"
                  enlace="Ver la completitud"
                />
              </ul>
            </Card>
          </div>
        </>
      )}

      <h2 className="mb-3 mt-8 text-h3 text-navy-700">Catálogo</h2>
      <PanelAdminContenido />
    </>
  );
}

function ItemRevisar({ texto, to, enlace, alerta = false, cargando = false }: { texto: string; to: string; enlace: string; alerta?: boolean; cargando?: boolean }) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
      {cargando ? (
        <Skeleton className="h-5 w-48" aria-busy aria-label="Cargando" />
      ) : (
        <span className={alerta ? 'font-bold text-status-pending' : 'text-ink'}>{texto}</span>
      )}
      <Link to={to} className="text-small font-bold text-brand-600 underline-offset-4 hover:underline">
        {enlace}
      </Link>
    </li>
  );
}

/* ───────────────────────── Asesor ───────────────────────── */

function DashboardAsesor() {
  const mi = useMiDesempeno({});
  const cola = useColaAsesoria({});
  const seguimientos = useSeguimientos();

  const pendientes = cola.data?.filter((s) => s.estado === 'PENDIENTE') ?? [];
  const misCasos = cola.data?.filter((s) => s.asignadoAMi && s.estado === 'EN_ATENCION') ?? [];

  return (
    <>
      <PageHeader titulo="Dashboard" descripcion="Tu trabajo del día y tu mes en curso." />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-4 lg:p-5">
          <h2 className="text-h3 text-navy-700">Cola de asesoría</h2>
          {cola.isError ? (
            <EstadoError error={cola.error} onRetry={() => void cola.refetch()} />
          ) : cola.isLoading ? (
            <Skeleton className="mt-3 h-20 w-full" aria-busy aria-label="Cargando la cola" />
          ) : (
            <>
              <p className="mt-1 text-ink">
                {pendientes.length === 0 ? 'No hay solicitudes pendientes.' : cantidad(pendientes.length, 'solicitud pendiente', 'solicitudes pendientes')}
              </p>
              {misCasos.length > 0 ? (
                <>
                  <h3 className="mb-1 mt-3 font-bold text-navy-700">Tus casos en atención</h3>
                  <ul className="divide-y divide-line rounded-lg border border-line text-small">
                    {misCasos.slice(0, 5).map((s) => (
                      <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                        <span>
                          <span className="font-bold text-navy-700">{s.cliente.nombre}</span> · {TEXTO_MOTIVO[s.motivo]} · {tiempoTranscurrido(s.fechaCreacion)}
                        </span>
                        <Link to={`/app/asesorias/${s.id}`} className="font-bold text-brand-600 underline-offset-4 hover:underline">
                          Atender
                        </Link>
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}
              <Button className="mt-4" asChild>
                <Link to="/app/asesorias">Ir a la cola</Link>
              </Button>
            </>
          )}
        </Card>

        <Card className="p-4 lg:p-5">
          <h2 className="text-h3 text-navy-700">Seguimientos abiertos</h2>
          {seguimientos.isError ? (
            <EstadoError error={seguimientos.error} onRetry={() => void seguimientos.refetch()} />
          ) : seguimientos.isLoading ? (
            <Skeleton className="mt-3 h-20 w-full" aria-busy aria-label="Cargando los seguimientos" />
          ) : (
            <>
              <p className="mt-1 text-ink">
                {seguimientos.data!.length === 0 ? 'No hay seguimientos abiertos.' : cantidad(seguimientos.data!.length, 'seguimiento abierto', 'seguimientos abiertos')}
              </p>
              <Button className="mt-4" variant="outlineNavy" asChild>
                <Link to="/app/seguimientos">Ir a seguimientos</Link>
              </Button>
            </>
          )}
        </Card>
      </div>

      <h2 className="mb-3 mt-8 text-h3 text-navy-700">Tu mes</h2>
      {mi.isError ? (
        <EstadoError error={mi.error} onRetry={() => void mi.refetch()} />
      ) : mi.isLoading || !mi.data ? (
        <div className="grid gap-4 sm:grid-cols-3" aria-busy aria-label="Cargando tu desempeño">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          <KpiCard etiqueta="Asesorías atendidas" valor={mi.data.asesorias.atendidas} ayuda={`Cerradas: ${mi.data.asesorias.cerradas}`} />
          <KpiCard etiqueta="Ventas que se te atribuyen" valor={mi.data.ventasAtribuidas.polizas} />
          <KpiCard etiqueta="Conversión de tus descuentos" valor={textoPorcentaje(mi.data.descuentos.tasaConversion)} ayuda={`Otorgados: ${mi.data.descuentos.otorgados}`} />
        </div>
      )}
      <Button variant="link" asChild className="mt-3">
        <Link to="/app/reportes/mi-desempeno">Ver mi desempeño completo</Link>
      </Button>
    </>
  );
}

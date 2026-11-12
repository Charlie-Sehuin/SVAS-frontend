import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Car, MapPin } from 'lucide-react';
import { isApiError } from '../../../shared/lib/api-client';
import { Button } from '../../../shared/ui/button';
import { Select } from '../../../shared/ui/select';
import { Skeleton } from '../../../shared/ui/skeleton';
import { EstadoError, EstadoVacio } from '../../../shared/ui/domain/EstadoVacio';
import { ErrorToast, WarningToast } from '../../../shared/ui/domain/toasts';
import { DerivacionBanner } from '../components/DerivacionBanner';
import { PlanCard, PlanNoDisponible } from '../components/PlanCard';
import { SumaAseguradaControl } from '../components/SumaAseguradaControl';
import { useActualizarSuma, useResumenCotizacion } from '../hooks/useCotizacion';
import { agruparPorAseguradora, aseguradorasDe, type OrdenComparativo } from '../lib/agrupar';

const MENSAJE_COMPRA_EN_CURSO = 'Ya iniciaste tu compra: la suma asegurada ya no se puede cambiar.';
const MENSAJE_COMPRADA = 'Ya compraste este seguro: la suma asegurada ya no se puede cambiar.';

/**
 * `/cotizacion/:id` (RF-05, RF-08, RF-10): un bloque por aseguradora con sus planes, la PRIMA MENSUAL como protagonista
 * y un control de suma asegurada por aseguradora. Todos los montos vienen del backend; aquí solo se ordenan y se pintan.
 * Se llega con el token de la cotización (anónimo) o con la sesión del CLIENTE dueño.
 */
export function ComparativoPage() {
  const { id } = useParams();
  const { data, isLoading, isError, error, refetch } = useResumenCotizacion(id);
  const actualizar = useActualizarSuma(id ?? '');
  const [orden, setOrden] = useState<OrdenComparativo>('precio');
  const [filtro, setFiltro] = useState('');
  /** Aseguradoras con un recálculo en curso (su monto se reemplaza por un esqueleto). */
  const [pendientes, setPendientes] = useState<ReadonlySet<string>>(new Set());
  const [compraEnCurso, setCompraEnCurso] = useState(false);

  // RF-05 / RN-39: aviso ámbar no bloqueante. Con `id`, el mismo aviso no se repite si ya salió al cotizar.
  const warning = data?.warning;
  useEffect(() => {
    if (warning && id) WarningToast(warning, `warning-${id}-${warning.code}`);
  }, [warning, id]);

  const cotizacion = data?.cotizacion;
  const comprada = cotizacion?.estado === 'CONVERTIDA';
  const grupos = useMemo(() => agruparPorAseguradora(cotizacion?.primas ?? [], orden, filtro), [cotizacion, orden, filtro]);
  const aseguradoras = useMemo(() => aseguradorasDe(cotizacion?.primas ?? []), [cotizacion]);

  const cambiarSuma = async (aseguradoraId: string, sumaAsegurada: string): Promise<boolean> => {
    setPendientes((p) => new Set(p).add(aseguradoraId));
    try {
      const r = await actualizar.mutateAsync({ aseguradoraId, sumaAsegurada });
      if (r.warning && id) WarningToast(r.warning, `warning-${id}-${r.warning.code}`);
      return true;
    } catch (e) {
      // 409: ya hay compra en curso, el control se bloquea. 400 (rango) y el resto: el mensaje del backend tal cual.
      if (isApiError(e) && e.statusCode === 409) setCompraEnCurso(true);
      else ErrorToast(e);
      return false;
    } finally {
      setPendientes((p) => {
        const n = new Set(p);
        n.delete(aseguradoraId);
        return n;
      });
    }
  };

  if (isError) {
    return (
      <section className="mx-auto max-w-2xl px-4 py-10">
        <EstadoError error={error} onRetry={() => void refetch()} />
        <div className="mt-4 text-center">
          <Button asChild>
            <Link to="/cotizar">Cotizar de nuevo</Link>
          </Button>
        </div>
      </section>
    );
  }

  if (isLoading || !cotizacion) return <ComparativoEsqueleto />;

  const v = cotizacion.vehiculo;
  const bloqueoSuma = comprada ? MENSAJE_COMPRADA : compraEnCurso ? MENSAJE_COMPRA_EN_CURSO : null;
  const hayDerivacion = cotizacion.motivoDerivacion !== null || !cotizacion.opciones.includes('COMPRA_INMEDIATA');

  return (
    <section className="mx-auto max-w-[1200px] px-4 py-6 lg:px-6 lg:py-10">
      <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-h1 text-navy-700">
            <Car className="size-7 shrink-0" aria-hidden />
            {v.marca} {v.modelo} {v.anio}
          </h1>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 text-ink-soft">
            {v.distrito ? (
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-4" aria-hidden /> {v.distrito}
              </span>
            ) : null}
            <span>Elige tu plan y ajusta la suma asegurada de cada aseguradora.</span>
          </p>
        </div>
        <Button variant="outlineNavy" asChild>
          <Link to="/cotizar">Cotizar otro vehículo</Link>
        </Button>
      </header>

      {comprada ? (
        <div role="status" className="mb-5 rounded-xl border border-status-success/30 bg-status-success/10 p-4 text-ink">
          Esta cotización ya se convirtió en póliza.{' '}
          <Link to="/mi-cuenta/polizas" className="font-bold text-brand-600 underline-offset-4 hover:underline">
            Ver mis pólizas
          </Link>
        </div>
      ) : null}
      {hayDerivacion && !comprada ? <DerivacionBanner motivo={cotizacion.motivoDerivacion} /> : null}

      {cotizacion.primas.length > 0 ? (
        <div className="mb-5 flex flex-wrap items-end gap-3">
          <label className="flex min-w-56 flex-col gap-1">
            <span className="text-small font-bold text-navy-700">Ordenar por</span>
            <Select compact value={orden} onChange={(e) => setOrden(e.target.value as OrdenComparativo)}>
              <option value="precio">Precio mensual (de menor a mayor)</option>
              <option value="aseguradora">Aseguradora (A–Z)</option>
            </Select>
          </label>
          {aseguradoras.length > 1 ? (
            <label className="flex min-w-56 flex-col gap-1">
              <span className="text-small font-bold text-navy-700">Aseguradora</span>
              <Select compact value={filtro} onChange={(e) => setFiltro(e.target.value)}>
                <option value="">Todas</option>
                {aseguradoras.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nombre}
                  </option>
                ))}
              </Select>
            </label>
          ) : null}
        </div>
      ) : null}

      {grupos.length === 0 ? (
        <EstadoVacio titulo="Todavía no hay planes para esta cotización. Un asesor te ayudará a completarla." />
      ) : (
        // aria-live: cuando cambia la suma y llega la prima nueva, el lector de pantalla lo anuncia (diseño §13).
        <div aria-live="polite" className="space-y-8">
          {grupos.map((g) => {
            const primera = g.disponibles[0];
            const actualizando = pendientes.has(g.aseguradoraId);
            return (
              <section key={g.aseguradoraId} aria-labelledby={`aseg-${g.aseguradoraId}`}>
                <h2 id={`aseg-${g.aseguradoraId}`} className="mb-3 text-h2 text-navy-700">
                  {g.aseguradora}
                </h2>

                {primera?.rangoSuma && primera.sumaAsegurada ? (
                  <div className="mb-4">
                    <SumaAseguradaControl
                      aseguradora={g.aseguradora}
                      rango={primera.rangoSuma}
                      suma={primera.sumaAsegurada}
                      pendiente={actualizando}
                      bloqueada={bloqueoSuma}
                      onCommit={(suma) => cambiarSuma(g.aseguradoraId, suma)}
                    />
                  </div>
                ) : null}

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {g.disponibles.map((p) => (
                    <PlanCard
                      key={p.id}
                      prima={p}
                      cotizacionId={cotizacion.id}
                      opciones={cotizacion.opciones}
                      actualizando={actualizando}
                      comprada={comprada}
                    />
                  ))}
                  {g.noDisponibles.length > 0 ? <PlanNoDisponible aseguradora={g.aseguradora} /> : null}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </section>
  );
}

/** Esqueleto con la forma final del comparativo (diseño §11.1): título, filtros y dos bloques de tarjetas. */
function ComparativoEsqueleto() {
  return (
    <section className="mx-auto max-w-[1200px] px-4 py-6 lg:px-6 lg:py-10" aria-busy aria-label="Cargando tus cotizaciones">
      <Skeleton className="h-9 w-72" />
      <Skeleton className="mb-6 mt-2 h-5 w-96 max-w-full" />
      {Array.from({ length: 2 }, (_, i) => (
        <div key={i} className="mb-8">
          <Skeleton className="mb-3 h-7 w-40" />
          <Skeleton className="mb-4 h-20 w-full" />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      ))}
    </section>
  );
}

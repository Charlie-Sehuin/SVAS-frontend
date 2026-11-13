import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Car, Info, MapPin, ShieldAlert } from 'lucide-react';
import { isApiError } from '../../../shared/lib/api-client';
import { formatearMonto } from '../../../shared/lib/format';
import { Button } from '../../../shared/ui/button';
import { Select } from '../../../shared/ui/select';
import { Skeleton } from '../../../shared/ui/skeleton';
import { EstadoError, EstadoVacio } from '../../../shared/ui/domain/EstadoVacio';
import { ErrorToast, WarningToast } from '../../../shared/ui/domain/toasts';
import { DerivacionBanner } from '../components/DerivacionBanner';
import { PlanCard, PlanNoDisponible } from '../components/PlanCard';
import { SumaAseguradaControl } from '../components/SumaAseguradaControl';
import { useActualizarSuma, useResumenCotizacion } from '../hooks/useCotizacion';
import { agruparPorAseguradora, aseguradorasDe, limitarARango, mismoMonto, rangoUnion, type OrdenComparativo } from '../lib/agrupar';
import { guardarSumaElegida, leerSumaElegida } from '../lib/sumaElegida';

const MENSAJE_COMPRA_EN_CURSO = 'Ya iniciaste tu compra: la suma asegurada ya no se puede cambiar.';
const MENSAJE_COMPRADA = 'Ya compraste este seguro: la suma asegurada ya no se puede cambiar.';

/**
 * `/cotizacion/:id` (RF-05, RF-08, RF-10): un bloque por aseguradora con sus planes, la PRIMA MENSUAL como protagonista
 * y UNA sola barra de suma asegurada para toda la cotización. Todos los montos vienen del backend; aquí solo se ordenan y se pintan.
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
  /** La suma que la persona eligió en la barra única (o `null` si aún no eligió: cada aseguradora usa su punto medio). */
  const [sumaElegida, setSumaElegida] = useState<string | null>(() => (id ? leerSumaElegida(id) : null));

  // RF-05 / RN-39: aviso ámbar no bloqueante. Con `id`, el mismo aviso no se repite si ya salió al cotizar.
  const warning = data?.warning;
  useEffect(() => {
    if (warning && id) WarningToast(warning, `warning-${id}-${warning.code}`);
  }, [warning, id]);

  const cotizacion = data?.cotizacion;
  const comprada = cotizacion?.estado === 'CONVERTIDA';
  const grupos = useMemo(() => agruparPorAseguradora(cotizacion?.primas ?? [], orden, filtro), [cotizacion, orden, filtro]);
  const aseguradoras = useMemo(() => aseguradorasDe(cotizacion?.primas ?? []), [cotizacion]);
  const rangoGlobal = useMemo(() => rangoUnion(cotizacion?.primas ?? []), [cotizacion]);
  // Una suma guardada que ya no cabe en el rango de la barra (p. ej. cambió la tarifa) se ignora.
  const sumaDeLaBarra = sumaElegida && rangoGlobal && limitarARango(sumaElegida, rangoGlobal).ajustada === null ? sumaElegida : null;

  /**
   * La barra es una sola, pero cada aseguradora tiene su propio rango (RN-37): a cada una se le pide la suma elegida o, si
   * se sale de su rango, su mínimo o su máximo. El backend recalcula por aseguradora (una petición cada una, en paralelo).
   * Devuelve `true` si todas se aplicaron.
   */
  const aplicarSuma = async (valor: string): Promise<boolean> => {
    if (!cotizacion || !id) return false;
    const pedidos = agruparPorAseguradora(cotizacion.primas, 'precio').flatMap((g) => {
      const primera = g.disponibles[0];
      if (!primera?.rangoSuma || !primera.sumaAsegurada) return [];
      const { valor: objetivo } = limitarARango(valor, primera.rangoSuma);
      return mismoMonto(objetivo, primera.sumaAsegurada) ? [] : [{ aseguradoraId: g.aseguradoraId, sumaAsegurada: objetivo }];
    });

    setPendientes((p) => new Set([...p, ...pedidos.map((x) => x.aseguradoraId)]));
    const resultados = await Promise.allSettled(pedidos.map((x) => actualizar.mutateAsync(x)));
    setPendientes((p) => {
      const n = new Set(p);
      pedidos.forEach((x) => n.delete(x.aseguradoraId));
      return n;
    });

    const fallos: unknown[] = [];
    for (const r of resultados) {
      if (r.status === 'fulfilled') {
        if (r.value.warning) WarningToast(r.value.warning, `warning-${id}-${r.value.warning.code}`);
      } else fallos.push(r.reason);
    }
    if (fallos.length > 0) {
      // 409: ya hay compra en curso, la barra se bloquea. El resto: el mensaje del backend tal cual (una sola vez).
      if (fallos.some((e) => isApiError(e) && e.statusCode === 409)) setCompraEnCurso(true);
      else ErrorToast(fallos[0]);
      return false;
    }
    setSumaElegida(valor);
    guardarSumaElegida(id, valor);
    return true;
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

      {cotizacion.primas.length > 0 && !comprada ? (
        <div className="mb-5 flex flex-col items-start gap-2 rounded-xl bg-accent-50 p-4 sm:flex-row sm:items-center sm:gap-4">
          <div className="flex-1">
            <p className="font-bold text-navy-700">¿Cuánto pagarías tú si te pasa algo?</p>
            <p className="text-small text-ink-soft">Mira cuánto pagarías tú en un choque, un robo o un daño a terceros, plan por plan.</p>
          </div>
          <Button variant="accent" size="lg" className="w-full sm:w-auto" asChild>
            <Link to={`/cotizacion/${cotizacion.id}/prueba`}>
              <ShieldAlert aria-hidden /> Pon a prueba estos planes
            </Link>
          </Button>
        </div>
      ) : null}

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

      {rangoGlobal ? (
        <div className="mb-6 md:sticky md:top-[4.5rem] md:z-10">
          <SumaAseguradaControl
            titulo="Tu suma asegurada"
            rango={rangoGlobal}
            suma={sumaDeLaBarra}
            pendiente={pendientes.size > 0}
            bloqueada={bloqueoSuma}
            ayuda={
              sumaDeLaBarra
                ? 'Usamos esta suma en todas las aseguradoras. Si una no la admite, usamos el mínimo o el máximo que permite.'
                : 'Cada aseguradora propone su punto medio. Mueve la barra para usar la misma suma en todas.'
            }
            onCommit={aplicarSuma}
          />
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
            // Si la suma elegida se salía del rango de esta aseguradora, se le avisa a la persona qué suma se usó en su lugar.
            const limite = sumaDeLaBarra && primera?.rangoSuma ? limitarARango(sumaDeLaBarra, primera.rangoSuma) : null;
            const ajuste =
              limite?.ajustada && primera?.sumaAsegurada && mismoMonto(limite.valor, primera.sumaAsegurada) ? limite : null;
            return (
              <section key={g.aseguradoraId} aria-labelledby={`aseg-${g.aseguradoraId}`}>
                <h2 id={`aseg-${g.aseguradoraId}`} className="mb-3 text-h2 text-navy-700">
                  {g.aseguradora}
                </h2>

                {ajuste ? (
                  <p className="mb-3 flex items-start gap-1.5 text-small text-ink-soft">
                    <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
                    <span>
                      Usamos {formatearMonto(ajuste.valor, 'USD', 0)}, el {ajuste.ajustada === 'maxima' ? 'máximo' : 'mínimo'} que
                      permite {g.aseguradora}.
                    </span>
                  </p>
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

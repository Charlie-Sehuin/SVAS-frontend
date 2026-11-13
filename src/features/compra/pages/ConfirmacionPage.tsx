import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CalendarRange, Check } from 'lucide-react';
import { formatearFecha } from '../../../shared/lib/format';
import { Button } from '../../../shared/ui/button';
import { Card } from '../../../shared/ui/card';
import { Skeleton } from '../../../shared/ui/skeleton';
import { TEXTO_DEMO } from '../../../shared/ui/domain/DemoLegend';
import { EstadoError } from '../../../shared/ui/domain/EstadoVacio';
import { MoneyValue } from '../../../shared/ui/domain/MoneyValue';
import { BotonDescargarPoliza } from '../components/BotonDescargarPoliza';
import { ContenidoContratado } from '../components/ContenidoContratado';
import { CronogramaCuotas } from '../components/CronogramaCuotas';
import { useEstadoCompra } from '../hooks/useCompra';

/** `/compra/:id/listo` (CLIENTE): confirmación sobria con la póliza, el PDF y el contenido contratado (diseño §9.7). */
export function ConfirmacionPage() {
  const { id } = useParams();
  const { data: compra, isLoading, isError, error, refetch } = useEstadoCompra(id);
  const [verCuotas, setVerCuotas] = useState(false);

  if (isError) {
    return (
      <section className="mx-auto max-w-xl px-4 py-10">
        <EstadoError error={error} onRetry={() => void refetch()} />
      </section>
    );
  }
  if (isLoading || !compra) {
    return (
      <section className="mx-auto max-w-xl space-y-4 px-4 py-10" aria-busy aria-label="Cargando tu confirmación">
        <Skeleton className="mx-auto size-16 rounded-full" />
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-40 w-full" />
      </section>
    );
  }

  // La orden existe pero no se pagó: no se celebra nada, se ofrece retomar el pago.
  if (compra.estado !== 'CONFIRMADO' || !compra.poliza) {
    return (
      <section className="mx-auto max-w-xl px-4 py-10">
        <Card className="flex flex-col items-center gap-3 p-6 text-center">
          <h1 className="text-h2 text-navy-700">Tu compra aún no está pagada</h1>
          <p className="text-ink-soft">Tu póliza se emite cuando el pago se confirma. Puedes continuar donde lo dejaste.</p>
          <Button size="lg" asChild>
            <Link to={`/compra/${compra.cotizacionId}?prima=${compra.primaCotizadaId}`}>Continuar con el pago</Link>
          </Button>
        </Card>
      </section>
    );
  }

  const poliza = compra.poliza;
  const cuotas = compra.pago?.modo === 'CUOTAS' ? compra.pago.cuotas : [];
  // Solo se muestra lo que el backend marcó como pagado; no se suma nada en el navegador.
  const primeraPagada = cuotas.find((c) => c.estado === 'CONFIRMADO');
  const cuotasPendientes = cuotas.filter((c) => c.estado !== 'CONFIRMADO').length;

  return (
    <section className="mx-auto max-w-[640px] px-4 py-8 lg:py-12">
      <div className="flex flex-col items-center text-center">
        <span className="flex size-16 items-center justify-center rounded-full bg-status-success text-white">
          <Check className="size-9" aria-hidden />
        </span>
        <h1 className="mt-4 text-h1 text-navy-700">¡Listo! Tu seguro está activo</h1>
        <p className="mt-1 text-ink-soft">
          Plan {compra.plan} · {compra.aseguradora}
        </p>
      </div>

      <Card className="mt-6 p-5">
        <dl className="space-y-3">
          <div>
            <dt className="text-small text-ink-soft">Número de póliza</dt>
            <dd className="font-mono text-h3 text-navy-700 select-all">{poliza.numero}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-ink-soft">Fecha de compra</dt>
            <dd>{formatearFecha(compra.fecha, 'larga')}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-ink-soft">Suma asegurada</dt>
            <dd>
              <MoneyValue value={compra.sumaAsegurada} decimales={0} />
            </dd>
          </div>
          {cuotas.length > 0 ? (
            <>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-ink-soft">Pagado hoy (1.ª cuota)</dt>
                <dd>{primeraPagada ? <MoneyValue value={primeraPagada.monto} /> : '—'}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-ink-soft">Cuotas por pagar</dt>
                <dd>{cuotasPendientes}</dd>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <dt className="text-ink-soft">Total del plan de cuotas</dt>
                <dd>{compra.pago ? <MoneyValue value={compra.pago.montoTotal} /> : '—'}</dd>
              </div>
            </>
          ) : (
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-ink-soft">Total pagado</dt>
              <dd>{compra.pago ? <MoneyValue value={compra.pago.montoTotal} /> : '—'}</dd>
            </div>
          )}
          {compra.pago ? (
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-ink-soft">Forma de pago</dt>
              <dd>{compra.pago.modo === 'CUOTAS' ? `${compra.pago.numeroCuotas ?? cuotas.length} cuotas` : 'Pago único'}</dd>
            </div>
          ) : null}
        </dl>
      </Card>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <BotonDescargarPoliza polizaId={poliza.id} numero={poliza.numero} generando={!poliza.pdfDisponible} />
        {cuotas.length > 0 ? (
          <Button
            variant="outlineNavy"
            size="lg"
            className="w-full sm:w-auto"
            aria-expanded={verCuotas}
            aria-controls="cronograma"
            onClick={() => setVerCuotas((v) => !v)}
          >
            <CalendarRange aria-hidden /> {verCuotas ? 'Ocultar cronograma de cuotas' : 'Ver cronograma de cuotas'}
          </Button>
        ) : null}
      </div>

      {verCuotas ? (
        <div id="cronograma" className="mt-4">
          <CronogramaCuotas cuotas={cuotas} />
        </div>
      ) : null}

      <details className="group mt-6 rounded-xl border border-line bg-surface">
        <summary className="flex min-h-11 cursor-pointer items-center px-4 font-bold text-navy-700">Lo que contrataste</summary>
        <div className="border-t border-line p-4">
          <ContenidoContratado contenido={compra.contenidoPlan} />
        </div>
      </details>

      <p className="mt-6 text-center text-caption text-ink-soft">{TEXTO_DEMO}</p>
      <div className="mt-4 text-center">
        <Button variant="link" asChild>
          <Link to="/mi-cuenta/polizas">Ver mis pólizas</Link>
        </Button>
      </div>
    </section>
  );
}

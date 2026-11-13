import { Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { formatearFecha } from '../../../shared/lib/format';
import { Button } from '../../../shared/ui/button';
import { Card } from '../../../shared/ui/card';
import { Skeleton } from '../../../shared/ui/skeleton';
import { EstadoError, EstadoVacio } from '../../../shared/ui/domain/EstadoVacio';
import { MoneyValue } from '../../../shared/ui/domain/MoneyValue';
import { Badge } from '../../../shared/ui/badge';
import { MiCuentaTabs } from '../../cotizacion/pages/MisCotizacionesPage';
import { BotonDescargarPoliza } from '../components/BotonDescargarPoliza';
import { ContenidoContratado } from '../components/ContenidoContratado';
import { useMisPolizas } from '../hooks/useCompra';

/** `/mi-cuenta/polizas` (CLIENTE): cada póliza es una tarjeta con su estado y una acción principal (diseño §9.9). */
export function MisPolizasPage() {
  const { data, isLoading, isError, error, refetch } = useMisPolizas();

  return (
    <section className="mx-auto max-w-3xl px-4 py-6 lg:py-10">
      <h1 className="mb-4 text-h1 text-navy-700">Mi cuenta</h1>
      <MiCuentaTabs />

      {isError ? (
        <EstadoError error={error} onRetry={() => void refetch()} />
      ) : isLoading ? (
        <div className="space-y-3" aria-busy aria-label="Cargando tus pólizas">
          {Array.from({ length: 2 }, (_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : data && data.length === 0 ? (
        <EstadoVacio
          titulo="Aún no tienes pólizas."
          icono={<ShieldCheck className="size-10 text-navy-300" aria-hidden />}
          accion={
            <Button asChild>
              <Link to="/mi-cuenta/cotizaciones">Ver mis cotizaciones</Link>
            </Button>
          }
        />
      ) : (
        <ul className="space-y-3">
          {data?.map((p) => (
            <li key={p.id}>
              <Card className="p-4">
                <div className="flex flex-wrap items-start gap-x-4 gap-y-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-caption text-ink-soft">{p.aseguradora}</p>
                    <p className="font-bold text-navy-700">Plan {p.plan}</p>
                    <p className="text-small text-ink-soft">
                      {p.vehiculo.marca} {p.vehiculo.modelo} {p.vehiculo.anio}
                      {p.vehiculo.placa ? ` · ${p.vehiculo.placa}` : ''}
                    </p>
                  </div>
                  <Badge tone="success">Activa</Badge>
                </div>

                <dl className="mt-3 grid gap-x-6 gap-y-1 text-small sm:grid-cols-2">
                  <div className="flex justify-between gap-3">
                    <dt className="text-ink-soft">Póliza</dt>
                    <dd className="font-mono text-navy-700">{p.numero}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-ink-soft">Emitida</dt>
                    <dd>{formatearFecha(p.fechaEmision, 'larga')}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-ink-soft">Suma asegurada</dt>
                    <dd>
                      <MoneyValue value={p.sumaAsegurada} decimales={0} />
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-ink-soft">{p.pago?.modo === 'CUOTAS' ? `Total en ${p.pago.numeroCuotas ?? ''} cuotas` : 'Total pagado'}</dt>
                    <dd>
                      <MoneyValue value={p.pago?.montoTotal ?? p.primaFinal} />
                    </dd>
                  </div>
                </dl>

                <BotonDescargarPoliza polizaId={p.id} numero={p.numero} size="md" className="mt-4" generando={!p.pdfDisponible} />

                <details className="mt-4 rounded-lg border border-line">
                  <summary className="flex min-h-11 cursor-pointer items-center px-3 font-bold text-navy-700">Lo que contrataste</summary>
                  <div className="border-t border-line p-3">
                    <ContenidoContratado contenido={p.contenidoPlan} />
                  </div>
                </details>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

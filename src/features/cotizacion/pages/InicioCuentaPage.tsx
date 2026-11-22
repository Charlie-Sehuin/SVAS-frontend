import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Car, FileText, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../../auth/useAuth';
import { formatearFecha } from '../../../shared/lib/format';
import { Badge } from '../../../shared/ui/badge';
import { Button } from '../../../shared/ui/button';
import { Card } from '../../../shared/ui/card';
import { Skeleton } from '../../../shared/ui/skeleton';
import { EstadoError } from '../../../shared/ui/domain/EstadoVacio';
import { MoneyValue } from '../../../shared/ui/domain/MoneyValue';
import { StatusBadge } from '../../../shared/ui/domain/StatusBadge';
import { BotonDescargarPoliza } from '../../compra/components/BotonDescargarPoliza';
import { useMisPolizas } from '../../compra/hooks/useCompra';
import { useMisCotizaciones } from '../hooks/useCotizacion';
import { MiCuentaTabs } from './MisCotizacionesPage';

/** Cuántas filas de cada lista caben en el inicio; el resto se ve en su pestaña. */
const MAX_FILAS = 3;

/** Primer nombre para saludar. `nombre` viene de `user_metadata.full_name` y puede faltar. */
const primerNombre = (nombre: string | null) => nombre?.trim().split(/\s+/)[0] || null;

function Seccion({ titulo, verTodas, children }: { titulo: string; verTodas?: { a: string; texto: string }; children: ReactNode }) {
  return (
    <section className="mt-8">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="text-h2 text-navy-700">{titulo}</h2>
        {verTodas ? (
          <Link to={verTodas.a} className="text-small font-bold text-brand-600 underline-offset-4 hover:underline">
            {verTodas.texto}
          </Link>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function Resumen({ icono, cantidad, etiqueta, a }: { icono: ReactNode; cantidad: number | null; etiqueta: string; a: string }) {
  return (
    <Link to={a} className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500">
      <Card className="flex h-full items-center gap-3 p-4 transition-colors hover:border-navy-300">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-navy-50">{icono}</span>
        <div className="min-w-0">
          <p className="text-h1 leading-none text-navy-700">{cantidad ?? '–'}</p>
          <p className="mt-1 text-small text-ink-soft">{etiqueta}</p>
        </div>
      </Card>
    </Link>
  );
}

/**
 * `/mi-cuenta` (CLIENTE): el resumen de lo que tiene con nosotros. Solo lee lo que ya traen `GET /polizas/mias` y
 * `GET /cotizaciones/mias`; no calcula nada. Cada bloque carga y falla por separado: que falle uno no tapa al otro.
 */
export function InicioCuentaPage() {
  const { nombre } = useAuth();
  const polizas = useMisPolizas();
  const cotizaciones = useMisCotizaciones();

  const pendientes = cotizaciones.data?.filter((c) => c.estado !== 'CONVERTIDA');
  const hola = primerNombre(nombre);
  const sinNada = polizas.data?.length === 0 && pendientes?.length === 0;

  return (
    <section className="mx-auto max-w-3xl px-4 py-6 lg:py-10">
      <h1 className="mb-1 text-h1 text-navy-700">Mi cuenta</h1>
      <p className="mb-4 text-ink-soft">{hola ? `Hola, ${hola}. Esto es lo que tienes con nosotros.` : 'Esto es lo que tienes con nosotros.'}</p>
      <MiCuentaTabs />

      <div className="grid gap-3 sm:grid-cols-3">
        <Resumen
          icono={<ShieldCheck className="size-6 text-navy-700" aria-hidden />}
          cantidad={polizas.data?.length ?? null}
          etiqueta="Pólizas activas"
          a="/mi-cuenta/polizas"
        />
        <Resumen
          icono={<FileText className="size-6 text-navy-700" aria-hidden />}
          cantidad={pendientes?.length ?? null}
          etiqueta="Cotizaciones por terminar"
          a="/mi-cuenta/cotizaciones"
        />
        <Card className="flex h-full flex-col justify-center gap-2 p-4">
          <p className="text-small text-ink-soft">¿Otro auto?</p>
          <Button asChild size="sm">
            <Link to="/cotizar">Cotizar ahora</Link>
          </Button>
        </Card>
      </div>

      {sinNada ? (
        <Card className="mt-8 p-6 text-center">
          <p className="font-bold text-navy-700">Aún no tienes pólizas ni cotizaciones.</p>
          <p className="mt-1 text-ink-soft">Cotiza tu auto en un minuto y compara los planes de las aseguradoras.</p>
        </Card>
      ) : null}

      {polizas.data?.length !== 0 ? (
        <Seccion titulo="Tus pólizas" verTodas={{ a: '/mi-cuenta/polizas', texto: 'Ver todas' }}>
          {polizas.isError ? (
            <EstadoError error={polizas.error} onRetry={() => void polizas.refetch()} />
          ) : polizas.isLoading ? (
            <Skeleton className="h-28 w-full" aria-busy aria-label="Cargando tus pólizas" />
          ) : (
            <ul className="space-y-3">
              {polizas.data?.slice(0, MAX_FILAS).map((p) => (
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
                        <p className="mt-1 text-small text-ink-soft">
                          Póliza <span className="font-mono text-navy-700">{p.numero}</span> · emitida el {formatearFecha(p.fechaEmision, 'larga')}
                        </p>
                      </div>
                      <Badge tone="success">Activa</Badge>
                    </div>
                    <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-small">
                      <div className="flex gap-2">
                        <dt className="text-ink-soft">Suma asegurada</dt>
                        <dd>
                          <MoneyValue value={p.sumaAsegurada} decimales={0} />
                        </dd>
                      </div>
                      <div className="flex gap-2">
                        <dt className="text-ink-soft">Forma de pago</dt>
                        <dd>{p.pago?.modo === 'CUOTAS' ? `En ${p.pago.numeroCuotas ?? ''} cuotas` : 'Pago único'}</dd>
                      </div>
                    </dl>
                    <BotonDescargarPoliza
                      polizaId={p.id}
                      numero={p.numero}
                      variant="outlineNavy"
                      size="sm"
                      className="mt-3"
                      generando={!p.pdfDisponible}
                    />
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </Seccion>
      ) : null}

      {pendientes?.length !== 0 ? (
        <Seccion titulo="Sigue donde te quedaste" verTodas={{ a: '/mi-cuenta/cotizaciones', texto: 'Ver todas' }}>
          {cotizaciones.isError ? (
            <EstadoError error={cotizaciones.error} onRetry={() => void cotizaciones.refetch()} />
          ) : cotizaciones.isLoading ? (
            <Skeleton className="h-24 w-full" aria-busy aria-label="Cargando tus cotizaciones" />
          ) : (
            <ul className="space-y-3">
              {pendientes?.slice(0, MAX_FILAS).map((c) => (
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
                      <Link to={`/cotizacion/${c.id}`}>Continuar</Link>
                    </Button>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </Seccion>
      ) : null}
    </section>
  );
}

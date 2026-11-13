import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Download, Info, RefreshCw, ShieldAlert } from 'lucide-react';
import { formatearFecha } from '../../../shared/lib/format';
import type { PerfilRiesgo } from '../../../shared/types/api';
import { Button } from '../../../shared/ui/button';
import { Card } from '../../../shared/ui/card';
import { Skeleton } from '../../../shared/ui/skeleton';
import { EstadoError } from '../../../shared/ui/domain/EstadoVacio';
import { ErrorToast } from '../../../shared/ui/domain/toasts';
import { MoneyValue } from '../../../shared/ui/domain/MoneyValue';
import { useResumenCotizacion } from '../../cotizacion/hooks/useCotizacion';
import { MatrizEscenarios } from '../components/MatrizEscenarios';
import { PerfilRiesgoDialog } from '../components/PerfilRiesgoDialog';
import { RankingCostoReal } from '../components/RankingCostoReal';
import { useDescargarResumen, useEjecutarPruebaChoque, useEscenarios, useUltimaSimulacion } from '../hooks/usePruebaChoque';

const TEXTO_ZONA = { ALTA: 'alta', MEDIA: 'media', BAJA: 'baja' } as const;

/**
 * `/cotizacion/:id/prueba` (RF-34, RF-35): "Si este año te pasa algo, ¿cuánto pagarías tú?". Primera vez: abre las
 * preguntas del perfil. Con simulación guardada: ranking por Costo Real Anual, peor caso y matriz de escenarios.
 * Todo monto es del backend (RN-32); aquí solo se ordena y se pinta. La leyenda (RN-29) no se puede ocultar.
 */
export function PruebaChoquePage() {
  const { id = '' } = useParams();
  const cotizacionQ = useResumenCotizacion(id);
  const cotizacion = cotizacionQ.data?.cotizacion;
  const uso = cotizacion?.vehiculo.uso;
  const escenariosQ = useEscenarios(uso);
  const ultimaQ = useUltimaSimulacion(id);
  const ejecutar = useEjecutarPruebaChoque(id);
  const pdf = useDescargarResumen(id);
  const [abierto, setAbierto] = useState(false);

  // Primera vez (404 → `null`): las preguntas se abren solas, una vez.
  const yaAbrio = useRef(false);
  const sinSimulacion = ultimaQ.data === null;
  const puedeSimular = cotizacion?.estado === 'REGISTRADA';
  useEffect(() => {
    if (sinSimulacion && puedeSimular && !yaAbrio.current) {
      yaAbrio.current = true;
      setAbierto(true);
    }
  }, [sinSimulacion, puedeSimular]);

  const sumaPorPrima = useMemo(
    () => new Map((cotizacion?.primas ?? []).flatMap((p) => (p.sumaAsegurada ? [[p.id, p.sumaAsegurada] as const] : []))),
    [cotizacion],
  );

  const error = cotizacionQ.isError ? cotizacionQ.error : ultimaQ.isError ? ultimaQ.error : null;
  if (error) {
    return (
      <section className="mx-auto max-w-3xl space-y-4 px-4 py-10">
        <EstadoError error={error} onRetry={() => void (cotizacionQ.isError ? cotizacionQ.refetch() : ultimaQ.refetch())} />
        <div className="text-center">
          <Button variant="outlineNavy" asChild>
            <Link to={`/cotizacion/${id}`}>Volver a mi cotización</Link>
          </Button>
        </div>
      </section>
    );
  }
  if (cotizacionQ.isLoading || ultimaQ.isLoading || !cotizacion) return <Esqueleto />;

  const sim = ultimaQ.data?.simulacion;
  const esComercial = cotizacion.vehiculo.uso !== 'PARTICULAR';
  const puedeComprar = cotizacion.opciones.includes('COMPRA_INMEDIATA') && cotizacion.estado !== 'CONVERTIDA';
  const puedeAsesor = cotizacion.opciones.includes('ASESORIA') && cotizacion.estado !== 'CONVERTIDA';
  const mejor = sim?.ranking.find((p) => p.posicion === 1 && p.datosCompletos);

  async function enviar(perfil: PerfilRiesgo) {
    await ejecutar.mutateAsync({ perfil });
    setAbierto(false);
  }

  return (
    <section className="mx-auto max-w-[1000px] px-4 py-6 lg:py-10">
      <Button variant="ghost" size="sm" className="mb-3 -ml-3" asChild>
        <Link to={`/cotizacion/${id}`}>
          <ArrowLeft aria-hidden /> Volver a los planes
        </Link>
      </Button>

      <header className="mb-5">
        <h1 className="flex items-start gap-2 text-h1 text-navy-700">
          <ShieldAlert className="mt-1 size-7 shrink-0 text-accent-600" aria-hidden />
          Si este año te pasa algo, ¿cuánto pagarías tú?
        </h1>
        <p className="mt-1 text-ink-soft">
          {cotizacion.vehiculo.marca} {cotizacion.vehiculo.modelo} {cotizacion.vehiculo.anio}. Probamos tus planes con seis situaciones típicas de Lima.
        </p>
      </header>

      {!sim ? (
        <Card className="flex flex-col items-start gap-3 bg-accent-50 p-5">
          <h2 className="text-h3 text-navy-700">Primero cuéntanos cómo usas tu auto</h2>
          <p className="text-ink">Son 3 preguntas y toma menos de un minuto.</p>
          {puedeSimular ? (
            <Button variant="accent" size="lg" onClick={() => setAbierto(true)}>
              Responder las preguntas
            </Button>
          ) : (
            <p className="text-small text-ink-soft">Esta cotización ya no se puede simular.</p>
          )}
        </Card>
      ) : (
        <>
          {!sim.vigente ? (
            <div role="status" className="mb-5 flex flex-wrap items-center gap-3 rounded-xl border border-status-warning/40 bg-status-warning/10 p-4">
              <Info className="size-5 shrink-0 text-status-pending" aria-hidden />
              <p className="flex-1 text-ink">Cambiaste tu suma asegurada. Vuelve a simular para ver tus costos reales.</p>
              {puedeSimular ? (
                <Button variant="outlineNavy" onClick={() => setAbierto(true)}>
                  <RefreshCw aria-hidden /> Volver a simular
                </Button>
              ) : null}
            </div>
          ) : null}

          <div className={sim.vigente ? '' : 'opacity-60'}>
            <div className="rounded-2xl bg-accent-50 p-4 lg:p-5">
              <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-h3 text-navy-700">Tu resultado</h2>
                <p className="text-small text-ink-soft">
                  Zona de riesgo de tu distrito: {TEXTO_ZONA[sim.zona]} · Simulado el {formatearFecha(sim.fecha, 'larga')}
                </p>
              </div>
              <RankingCostoReal ranking={sim.ranking} cotizacionId={id} puedeComprar={puedeComprar} puedeAsesor={puedeAsesor} />
              <p className="mt-3 text-caption text-ink-soft">
                <span className="font-bold">Costo real al año</span> = lo que pagas de prima + lo que pagarías tú, en promedio, en los
                siniestros del año.
              </p>
            </div>

            {mejor ? (
              <aside className="mt-4 rounded-r-xl border-l-4 border-accent-600 bg-accent-50 p-4" aria-label="Peor caso del año">
                <p className="text-ink">
                  Tu peor caso del año con el plan {mejor.plan} de {mejor.aseguradora}: pagarías{' '}
                  <MoneyValue value={mejor.peorCaso} className="text-navy-700" />
                </p>
              </aside>
            ) : null}

            <h2 className="mb-3 mt-8 text-h2 text-navy-700">Situación por situación</h2>
            {/* El nivel de cada celda se clasifica con el daño de referencia del catálogo: se espera a que llegue
                para no pintar un instante un color equivocado. */}
            {escenariosQ.isLoading ? (
              <Skeleton className="h-64 w-full" aria-busy aria-label="Cargando las situaciones" />
            ) : (
              <MatrizEscenarios
                ranking={sim.ranking}
                matriz={sim.matriz}
                escenarios={escenariosQ.data ?? []}
                sumaPorPrima={sumaPorPrima}
                esComercial={esComercial}
              />
            )}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Button variant="outlineNavy" loading={pdf.isPending} loadingText="Preparando tu PDF…" onClick={() => pdf.mutate(undefined, { onError: (e) => ErrorToast(e) })}>
                <Download aria-hidden /> Descargar resumen en PDF
              </Button>
              {puedeSimular ? (
                <Button variant="ghost" onClick={() => setAbierto(true)}>
                  <RefreshCw aria-hidden /> Cambiar mis respuestas
                </Button>
              ) : null}
            </div>

            <p className="mt-6 flex items-start gap-2 text-small text-ink-soft">
              <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span>{sim.leyenda}</span>
            </p>
          </div>
        </>
      )}

      <PerfilRiesgoDialog
        open={abierto}
        onOpenChange={setAbierto}
        esComercial={esComercial}
        escenarios={escenariosQ.data ?? []}
        enviando={ejecutar.isPending}
        onEnviar={enviar}
      />
    </section>
  );
}

function Esqueleto() {
  return (
    <section className="mx-auto max-w-[1000px] space-y-4 px-4 py-10" aria-busy aria-label="Cargando tu Prueba de Choque">
      <Skeleton className="h-9 w-2/3" />
      <Skeleton className="h-6 w-1/2" />
      <Skeleton className="h-64 w-full" />
    </section>
  );
}

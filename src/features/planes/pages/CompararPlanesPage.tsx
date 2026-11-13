import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Info, Link2 } from 'lucide-react';
import { Button } from '../../../shared/ui/button';
import { Card } from '../../../shared/ui/card';
import { Skeleton } from '../../../shared/ui/skeleton';
import { EstadoError, EstadoVacio } from '../../../shared/ui/domain/EstadoVacio';
import { ErrorToast, SuccessToast } from '../../../shared/ui/domain/toasts';
import { MatrizCoberturas } from '../components/MatrizCoberturas';
import { useCompararPlanes } from '../hooks/usePlanes';

/** Lee `?ids=a,b,c` (también `?ids=a&ids=b`) sin repetidos ni vacíos. El backend vuelve a validar. */
function idsDeLaDireccion(params: URLSearchParams): string[] {
  const todos = params.getAll('ids').flatMap((v) => v.split(','));
  return [...new Set(todos.map((v) => v.trim()).filter(Boolean))];
}

/**
 * `/comparar?ids=…` (diseño §9.4): de 2 a 3 planes, cobertura por cobertura. Es pública y se puede compartir copiando la
 * dirección. El frontend no ordena ni deduce nada: la matriz llega armada y en el mismo orden para todos los planes.
 */
export function CompararPlanesPage() {
  const [params] = useSearchParams();
  const ids = idsDeLaDireccion(params);
  const { data, isLoading, isError, error, refetch } = useCompararPlanes(ids);

  async function compartir() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      SuccessToast('Copiamos el enlace para que lo compartas');
    } catch (e) {
      ErrorToast(e, 'No pudimos copiar el enlace. Cópialo desde la barra de direcciones.');
    }
  }

  return (
    <section className="mx-auto max-w-[1000px] px-4 py-6 lg:py-10">
      <Button variant="ghost" size="sm" className="mb-3 -ml-3" onClick={() => window.history.back()}>
        <ArrowLeft aria-hidden /> Volver
      </Button>
      <header className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-h1 text-navy-700">Compara tus planes</h1>
          <p className="mt-1 text-ink-soft">Mira qué cubre cada uno, cobertura por cobertura.</p>
        </div>
        {data ? (
          <Button variant="outlineNavy" onClick={() => void compartir()}>
            <Link2 aria-hidden /> Compartir comparación
          </Button>
        ) : null}
      </header>

      {ids.length < 2 ? (
        <EstadoVacio
          titulo="Elige al menos 2 planes para compararlos."
          accion={
            <Button asChild>
              <Link to="/cotizar">Cotizar un vehículo</Link>
            </Button>
          }
        />
      ) : isError ? (
        <EstadoError error={error} onRetry={() => void refetch()} />
      ) : isLoading || !data ? (
        <div className="space-y-4" aria-busy aria-label="Cargando la comparación">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-72 w-full" />
        </div>
      ) : (
        <>
          <ul className={`mb-5 grid gap-3 ${data.planes.length === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`} aria-label="Planes que comparas">
            {data.planes.map((p, i) => {
              const incluidas = data.filas.filter((f) => f.valores[i]?.incluida).length;
              return (
                <li key={p.planId}>
                  <Card className="h-full p-4">
                    <p className="text-caption text-ink-soft">{p.aseguradora}</p>
                    <h2 className="text-h3 text-navy-700">Plan {p.plan}</h2>
                    {p.resumen ? <p className="mt-1 text-small text-ink-soft">{p.resumen}</p> : null}
                    <p className="mt-2 text-small font-bold text-navy-700">
                      Total que cubre: {incluidas} de {data.filas.length}
                    </p>
                  </Card>
                </li>
              );
            })}
          </ul>

          <MatrizCoberturas comparacion={data} />

          <p className="mt-4 flex items-start gap-2 text-small text-ink-soft">
            <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>{data.leyenda}</span>
          </p>
        </>
      )}
    </section>
  );
}

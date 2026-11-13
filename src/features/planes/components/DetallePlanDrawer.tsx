import { useId, useRef, useState, type KeyboardEvent } from 'react';
import { Info } from 'lucide-react';
import { cn } from '../../../shared/lib/utils';
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogTitle } from '../../../shared/ui/dialog';
import { Skeleton } from '../../../shared/ui/skeleton';
import { EstadoError } from '../../../shared/ui/domain/EstadoVacio';
import { usePlanContenido } from '../hooks/usePlanes';
import { CoberturaItem } from './CoberturaItem';

const PESTANAS = [
  { id: 'cubre', texto: 'Qué cubre' },
  { id: 'no-cubre', texto: 'Qué no cubre' },
  { id: 'requisitos', texto: 'Requisitos' },
] as const;
type Pestana = (typeof PESTANAS)[number]['id'];

interface Props {
  /** `null` = cerrado. */
  planId: string | null;
  /** Título provisional mientras llega el contenido ("Rímac · Oro"). */
  titulo: string;
  onClose: () => void;
}

/**
 * Detalle de un plan (diseño §8.4): pantalla completa en móvil y panel lateral de 480 px en escritorio, con tres
 * pestañas y la leyenda fija abajo (RN-46). "Qué no cubre" = las coberturas con `incluida: false` Y las exclusiones.
 * Los requisitos informan; no bloquean nada (RN-44).
 */
export function DetallePlanDrawer({ planId, titulo, onClose }: Props) {
  const { data, isLoading, isError, error, refetch } = usePlanContenido(planId);
  const [pestana, setPestana] = useState<Pestana>('cubre');
  const idBase = useId();
  const botones = useRef<Record<string, HTMLButtonElement | null>>({});

  // Flechas izquierda/derecha entre pestañas (patrón de tabs accesible).
  function teclado(e: KeyboardEvent, indice: number) {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const siguiente = (indice + (e.key === 'ArrowRight' ? 1 : -1) + PESTANAS.length) % PESTANAS.length;
    const destino = PESTANAS[siguiente]!;
    setPestana(destino.id);
    botones.current[destino.id]?.focus();
  }

  const cubre = data?.coberturas.filter((c) => c.incluida) ?? [];
  const noCubre = data?.coberturas.filter((c) => !c.incluida) ?? [];

  return (
    <Dialog open={planId !== null} onOpenChange={(abierto) => (!abierto ? onClose() : undefined)}>
      <DialogContent
        size="md"
        className="inset-0 top-0 h-dvh max-h-dvh rounded-none md:inset-y-0 md:left-auto md:right-0 md:top-0 md:h-dvh md:max-h-dvh md:w-[480px] md:max-w-[480px] md:translate-x-0 md:translate-y-0 md:rounded-none md:rounded-l-2xl"
      >
        <div className="border-b border-line p-4 pr-16">
          <p className="text-caption text-ink-soft">{data?.aseguradora ?? titulo.split(' · ')[0]}</p>
          <DialogTitle>Plan {data?.plan ?? titulo.split(' · ')[1] ?? titulo}</DialogTitle>
          <DialogDescription className="mt-1">{data?.resumen ?? 'Qué cubre, qué no cubre y qué se necesita.'}</DialogDescription>
        </div>

        <div role="tablist" aria-label="Detalle del plan" className="flex border-b border-line px-2">
          {PESTANAS.map((p, i) => (
            <button
              key={p.id}
              ref={(el) => {
                botones.current[p.id] = el;
              }}
              type="button"
              role="tab"
              id={`${idBase}-tab-${p.id}`}
              aria-selected={pestana === p.id}
              aria-controls={`${idBase}-panel-${p.id}`}
              tabIndex={pestana === p.id ? 0 : -1}
              onClick={() => setPestana(p.id)}
              onKeyDown={(e) => teclado(e, i)}
              className={cn(
                'min-h-11 flex-1 border-b-[3px] px-2 text-small font-bold transition-colors focus-visible:outline-3 focus-visible:outline-offset-[-3px] focus-visible:outline-brand-300',
                pestana === p.id ? 'border-brand-500 text-navy-700' : 'border-transparent text-ink-soft hover:text-navy-700',
              )}
            >
              {p.texto}
            </button>
          ))}
        </div>

        <DialogBody className="pt-3">
          {isError ? (
            <EstadoError error={error} onRetry={() => void refetch()} />
          ) : isLoading || !data ? (
            <div className="space-y-3" aria-busy aria-label="Cargando el detalle del plan">
              {Array.from({ length: 5 }, (_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <div role="tabpanel" id={`${idBase}-panel-${pestana}`} aria-labelledby={`${idBase}-tab-${pestana}`} tabIndex={0}>
              {pestana === 'cubre' ? (
                <>
                  {data.idealPara ? <p className="mb-2 text-small text-ink-soft">Ideal para: {data.idealPara}</p> : null}
                  {cubre.length === 0 ? (
                    <p className="text-ink-soft">Este plan no tiene coberturas incluidas.</p>
                  ) : (
                    <ul className="divide-y divide-line">
                      {cubre.map((c) => (
                        <CoberturaItem key={c.codigo} cobertura={c} />
                      ))}
                    </ul>
                  )}
                </>
              ) : pestana === 'no-cubre' ? (
                <>
                  {noCubre.length > 0 ? (
                    <ul className="divide-y divide-line">
                      {noCubre.map((c) => (
                        <CoberturaItem key={c.codigo} cobertura={c} />
                      ))}
                    </ul>
                  ) : null}
                  {data.exclusiones.length > 0 ? (
                    <section className={noCubre.length > 0 ? 'mt-4' : ''}>
                      <h3 className="mb-1 font-bold text-navy-700">Exclusiones</h3>
                      <ul className="list-disc space-y-1 pl-5 text-ink">
                        {data.exclusiones.map((e) => (
                          <li key={e}>{e}</li>
                        ))}
                      </ul>
                    </section>
                  ) : null}
                  {noCubre.length === 0 && data.exclusiones.length === 0 ? <p className="text-ink-soft">No hay exclusiones registradas.</p> : null}
                </>
              ) : data.requisitos.length === 0 ? (
                <p className="text-ink-soft">Este plan no pide requisitos adicionales.</p>
              ) : (
                <ul className="space-y-2">
                  {data.requisitos.map((r) => (
                    <li key={r.texto} className="rounded-lg border border-line p-3">
                      <p className="text-ink">{r.texto}</p>
                      <p className="mt-0.5 text-caption text-ink-soft">{r.obligatorio ? 'Requisito del plan' : 'Informativo'}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </DialogBody>

        <div className="flex items-start gap-2 border-t border-line bg-surface-muted p-3 text-caption text-ink-soft">
          <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          <span>{data?.leyenda ?? 'Contenido ilustrativo; no es el condicionado de la aseguradora.'}</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}

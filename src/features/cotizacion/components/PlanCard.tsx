import { Link } from 'react-router-dom';
import { Headset, Info } from 'lucide-react';
import { TELEFONO_HREF } from '../../../shared/lib/contacto';
import { cn } from '../../../shared/lib/utils';
import type { PrimaCotizada } from '../../../shared/types/api';
import type { OpcionCotizacion } from '../../../shared/types/enums';
import { Button } from '../../../shared/ui/button';
import { Card } from '../../../shared/ui/card';
import { Skeleton } from '../../../shared/ui/skeleton';
import { MAXIMO_COMPARAR, useCompararPlanesStore } from '../../planes/store/useCompararPlanesStore';
import { MoneyValue } from '../../../shared/ui/domain/MoneyValue';

interface PlanCardProps {
  prima: PrimaCotizada;
  cotizacionId: string;
  /** Opciones habilitadas por la derivación (RN-01..RN-04): sin `COMPRA_INMEDIATA` no hay botón de comprar. */
  opciones: readonly OpcionCotizacion[];
  /** Hay un recálculo de la suma de esta aseguradora: el monto se reemplaza por un esqueleto (nunca uno calculado aquí). */
  actualizando?: boolean;
  /** La cotización ya se convirtió en póliza: no se ofrece comprar. */
  comprada?: boolean;
  /** Abre el detalle del plan (qué cubre, qué no, requisitos). Sin él no hay botón. */
  onVerDetalle?: (prima: PrimaCotizada) => void;
  /** Abre "Hablar con un asesor". Sin él, el botón es solo una llamada telefónica. */
  onHablarAsesor?: () => void;
}

/**
 * Tarjeta de un plan (diseño §8.2). La PRIMA MENSUAL es la protagonista ("USD 53.37 / mes"); la anual y la suma
 * asegurada van debajo. Todos los montos llegan del backend como string y solo se formatean.
 * "Ver detalle" y "Comparar" llegan con el contenido de los planes (Ola 2).
 */
export function PlanCard({ prima, cotizacionId, opciones, actualizando = false, comprada = false, onVerDetalle, onHablarAsesor }: PlanCardProps) {
  const seleccionados = useCompararPlanesStore((s) => s.planes);
  const alternarComparar = useCompararPlanesStore((s) => s.alternar);
  const marcado = seleccionados.some((p) => p.planId === prima.planId);
  const llenoDeComparar = !marcado && seleccionados.length >= MAXIMO_COMPARAR;
  // Sin `resumen` el plan aún no tiene contenido publicado (el backend respondería 404): no se ofrece ver ni comparar.
  const hayContenido = prima.resumen !== null;
  const puedeComprar = opciones.includes('COMPRA_INMEDIATA') && !comprada;
  const puedeAsesor = opciones.includes('ASESORIA') && !comprada;

  return (
    <Card className="flex h-full flex-col p-4 lg:p-5">
      <p className="text-caption text-ink-soft">{prima.aseguradora}</p>
      <h3 className="mt-0.5 text-h3 text-navy-700">Plan {prima.plan}</h3>
      {prima.resumen ? <p className="mt-1 text-small text-ink-soft">{prima.resumen}</p> : null}

      <div className="mt-4" aria-busy={actualizando}>
        {actualizando || !prima.primaMensual || !prima.prima || !prima.sumaAsegurada ? (
          <div role="status" aria-label="Recalculando el precio">
            <Skeleton className="h-9 w-44" />
            <Skeleton className="mt-2 h-6 w-56" />
          </div>
        ) : (
          <div className="animate-[aparecer_200ms_ease-out]">
            <MoneyValue value={prima.primaMensual} size="xl" sufijo="/ mes" sufijoAria="al mes" />
            <p className="mt-1 flex flex-wrap items-baseline gap-x-1.5 text-ink-soft">
              <MoneyValue value={prima.prima} size="md" sufijo="al año" />
              <span aria-hidden>·</span>
              <span className="inline-flex items-baseline gap-1">
                Suma asegurada <MoneyValue value={prima.sumaAsegurada} size="md" decimales={0} />
              </span>
            </p>
          </div>
        )}
      </div>

      {hayContenido ? (
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
          {onVerDetalle ? (
            <Button variant="outlineNavy" size="sm" onClick={() => onVerDetalle(prima)}>
              Ver detalle
            </Button>
          ) : null}
          <label className={cn('flex min-h-11 items-center gap-2 text-small', llenoDeComparar ? 'cursor-not-allowed text-ink-soft' : 'cursor-pointer text-navy-700')}>
            <input
              type="checkbox"
              checked={marcado}
              disabled={llenoDeComparar}
              onChange={() => alternarComparar({ planId: prima.planId, etiqueta: `${prima.aseguradora} · ${prima.plan}` })}
              className="size-5 accent-brand-500"
            />
            <span>
              Comparar
              <span className="sr-only"> el plan {prima.plan} de {prima.aseguradora}</span>
              {llenoDeComparar ? <span className="block text-caption">Máximo {MAXIMO_COMPARAR} planes</span> : null}
            </span>
          </label>
        </div>
      ) : null}

      {puedeComprar || puedeAsesor ? (
        <div className={cn('mt-5 flex flex-col gap-2')}>
          {puedeComprar ? (
            <Button size="lg" className="w-full" asChild disabled={actualizando}>
              <Link to={`/compra/${cotizacionId}?prima=${prima.id}`}>Comprar este plan</Link>
            </Button>
          ) : null}
          {puedeAsesor ? (
            onHablarAsesor ? (
              <Button variant="secondary" className="w-full" onClick={onHablarAsesor}>
                <Headset aria-hidden /> Hablar con un asesor
              </Button>
            ) : (
              <Button variant="secondary" className="w-full" asChild>
                <a href={TELEFONO_HREF}>
                  <Headset aria-hidden /> Hablar con un asesor
                </a>
              </Button>
            )
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}

/**
 * Tarjeta gris de una aseguradora que no pudo cotizar (RF-05, RN-39): sin botones, con el motivo en lenguaje llano.
 * Es una sola por aseguradora, al final de su bloque.
 */
export function PlanNoDisponible({ aseguradora }: { aseguradora: string }) {
  return (
    <Card className="flex h-full items-start gap-3 border-dashed bg-surface-muted p-4 text-ink-soft">
      <Info className="mt-0.5 size-5 shrink-0" aria-hidden />
      <p>
        <strong className="text-ink">{aseguradora}</strong> no cotiza este vehículo; te mostramos las demás.
      </p>
    </Card>
  );
}

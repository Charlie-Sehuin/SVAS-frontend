import { Link } from 'react-router-dom';
import { Headset, Info } from 'lucide-react';
import { TELEFONO_HREF } from '../../../shared/lib/contacto';
import { cn } from '../../../shared/lib/utils';
import type { PrimaCotizada } from '../../../shared/types/api';
import type { OpcionCotizacion } from '../../../shared/types/enums';
import { Button } from '../../../shared/ui/button';
import { Card } from '../../../shared/ui/card';
import { Skeleton } from '../../../shared/ui/skeleton';
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
}

/**
 * Tarjeta de un plan (diseño §8.2). La PRIMA MENSUAL es la protagonista ("USD 53.37 / mes"); la anual y la suma
 * asegurada van debajo. Todos los montos llegan del backend como string y solo se formatean.
 * "Ver detalle" y "Comparar" llegan con el contenido de los planes (Ola 2).
 */
export function PlanCard({ prima, cotizacionId, opciones, actualizando = false, comprada = false }: PlanCardProps) {
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

      {puedeComprar || puedeAsesor ? (
        <div className={cn('mt-5 flex flex-col gap-2')}>
          {puedeComprar ? (
            <Button size="lg" className="w-full" asChild disabled={actualizando}>
              <Link to={`/compra/${cotizacionId}?prima=${prima.id}`}>Comprar este plan</Link>
            </Button>
          ) : null}
          {puedeAsesor ? (
            <Button variant="secondary" className="w-full" asChild>
              <a href={TELEFONO_HREF}>
                <Headset aria-hidden /> Hablar con un asesor
              </a>
            </Button>
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

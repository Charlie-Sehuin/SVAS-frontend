import { Car } from 'lucide-react';
import { formatearFecha } from '../../../../shared/lib/format';
import type { CotizacionDelCaso, PrimaDelCaso } from '../../../../shared/types/api';
import { Card } from '../../../../shared/ui/card';
import { MoneyValue } from '../../../../shared/ui/domain/MoneyValue';

/** Vehículo cotizado y sus planes con el precio que dio el backend; los que no cotizaron lo dicen. */
export function PlanesCotizadosCard({ cotizacion, primas }: { cotizacion: CotizacionDelCaso; primas: PrimaDelCaso[] }) {
  return (
    <Card className="p-4">
      <h2 className="flex items-center gap-2 text-h3 text-navy-700">
        <Car className="size-5" aria-hidden /> Cotización
      </h2>
      <p className="mt-2 font-bold text-ink">{cotizacion.vehiculo}</p>
      <p className="text-small text-ink-soft">Cotizada el {formatearFecha(cotizacion.fecha, 'larga')}</p>

      <h3 className="mb-1 mt-4 font-bold text-navy-700">Planes cotizados</h3>
      {primas.length === 0 ? (
        <p className="text-small text-ink-soft">Esta cotización no tiene planes.</p>
      ) : (
        <ul className="divide-y divide-line rounded-lg border border-line">
          {primas.map((p) => (
            <li key={p.planId} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-small">
              <span className="flex-1 font-bold text-navy-700">
                {p.aseguradora} · Plan {p.plan}
              </span>
              {p.disponible && p.primaMensual && p.prima ? (
                <span className="text-ink">
                  <MoneyValue value={p.primaMensual} sufijo="/ mes" sufijoAria="al mes" /> · <MoneyValue value={p.prima} sufijo="al año" />
                </span>
              ) : (
                <span className="text-ink-soft">No disponible para este vehículo</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

import { Car } from 'lucide-react';
import type { VehiculoGuardado } from '../../../shared/types/api';
import { useMisVehiculos } from '../hooks/useCotizacion';
import { nombreVehiculo } from '../lib/vehiculoABorrador';

/** Cuántos autos se ofrecen arriba del formulario; el resto está en "Mis vehículos". */
const MAX_OPCIONES = 3;

/**
 * "¿Es uno de tus autos?": atajo del paso Vehículo para quien ya cotizó con su cuenta. Un toque rellena marca, modelo,
 * año, uso, placa y ubicación, y la persona solo revisa. Sin sesión, sin autos o si la consulta falla, no se muestra
 * nada: es una ayuda, nunca un obstáculo para cotizar.
 */
export function UsarMisVehiculos({ onElegir }: { onElegir: (v: VehiculoGuardado) => void }) {
  const { data } = useMisVehiculos();
  if (!data || data.length === 0) return null;

  return (
    <section className="mb-4 rounded-xl border border-line bg-surface p-4" aria-label="Usar uno de tus autos">
      <p className="font-bold text-navy-700">¿Es uno de tus autos?</p>
      <p className="mb-3 text-small text-ink-soft">Tócalo y rellenamos los datos por ti.</p>
      <ul className="flex flex-wrap gap-2">
        {data.slice(0, MAX_OPCIONES).map((v) => (
          <li key={v.clave}>
            <button
              type="button"
              onClick={() => onElegir(v)}
              className="flex min-h-11 items-center gap-2 rounded-full border-2 border-line bg-surface px-4 text-small font-bold text-navy-700 transition-colors hover:border-navy-300 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand-300"
            >
              <Car className="size-5 shrink-0" aria-hidden />
              <span>
                {nombreVehiculo(v)}
                {v.placa ? <span className="ml-1 font-normal text-ink-soft">· {v.placa}</span> : null}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

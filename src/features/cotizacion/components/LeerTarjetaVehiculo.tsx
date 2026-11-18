import { useRef, useState, type ChangeEvent } from 'react';
import { FileText } from 'lucide-react';
import { isApiError } from '../../../shared/lib/api-client';
import { reducirImagen } from '../../../shared/lib/imagen';
import type { TarjetaLeida } from '../../../shared/types/api';
import { Button } from '../../../shared/ui/button';
import { useLeerTarjeta } from '../hooks/useCatalogo';
import type { ValorVehiculo } from './SelectorVehiculoCascada';

interface Props {
  /** Marca, modelo y año leídos (el año solo si es cotizable) y la placa, si la hubo. */
  onLeida: (v: { vehiculo: ValorVehiculo; placa?: string }) => void;
  disabled?: boolean;
}

const TIPOS = 'image/jpeg,image/png,image/webp,application/pdf';
const MAX_BYTES = 5 * 1024 * 1024; // el mismo tope del backend

function mensajeDe(r: TarjetaLeida): string {
  if (!r.leida) return 'No pudimos leer la tarjeta. Prueba con otra foto o elige tu auto a mano.';
  if (r.marca && !r.modelo) {
    return `Leímos la marca ${r.marca.nombre}, pero ese modelo aún no lo cotizamos. Elige tu auto a mano o habla con un asesor.`;
  }
  if (r.anio !== undefined && r.anioCotizable === false) {
    return `Leímos el año ${r.anio}, pero por ahora no lo cotizamos. Elige otro año o habla con un asesor.`;
  }
  return 'Leímos tu tarjeta. Revisa que marca, modelo, año y placa coincidan con ella.';
}

/**
 * "Sube tu tarjeta de propiedad" (foto o PDF) → rellena marca, modelo, año y placa. A diferencia de la
 * foto del auto, el año sale impreso en el documento, así que sí se rellena (el cliente lo confirma).
 * Si algo falla, el formulario sigue igual y se completa a mano.
 */
export function LeerTarjetaVehiculo({ onLeida, disabled }: Props) {
  const entrada = useRef<HTMLInputElement>(null);
  const leer = useLeerTarjeta();
  const [resultado, setResultado] = useState<TarjetaLeida | null>(null);
  const [errorLocal, setErrorLocal] = useState<string | null>(null);

  async function alElegir(e: ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    e.target.value = ''; // permite volver a elegir el mismo archivo
    if (!archivo) return;
    setResultado(null);
    setErrorLocal(null);
    leer.reset();
    const aEnviar = await reducirImagen(archivo); // un PDF pasa sin tocar
    if (aEnviar.size > MAX_BYTES) {
      setErrorLocal('El archivo pesa más de 5 MB. Prueba con una foto más liviana.');
      return;
    }
    try {
      const r = await leer.mutateAsync(aEnviar);
      setResultado(r);
      if (!r.leida) return;
      onLeida({
        vehiculo: {
          marcaId: r.marca?.id ?? '',
          modeloId: r.modelo?.id ?? '',
          anio: r.modelo && r.anio !== undefined && r.anioCotizable ? String(r.anio) : '',
        },
        placa: r.placa,
      });
    } catch {
      /* el mensaje sale de `leer.error` */
    }
  }

  const mensaje =
    errorLocal ??
    (leer.isError
      ? isApiError(leer.error)
        ? leer.error.message
        : 'No pudimos revisar la tarjeta. Elige tu auto a mano.'
      : resultado
        ? mensajeDe(resultado)
        : null);

  return (
    <div className="mb-4 rounded-lg border border-dashed border-line p-4">
      <input
        ref={entrada}
        type="file"
        accept={TIPOS}
        className="sr-only"
        tabIndex={-1}
        aria-label="Tarjeta de propiedad"
        onChange={(e) => void alElegir(e)}
      />
      <Button
        type="button"
        variant="secondary"
        loading={leer.isPending}
        loadingText="Leyendo tu tarjeta…"
        disabled={disabled}
        onClick={() => entrada.current?.click()}
      >
        <FileText aria-hidden />
        Rellenar con tu tarjeta de propiedad
      </Button>
      <p className="mt-2 text-small text-ink-soft">
        Sube una foto o el PDF. Leemos marca, modelo, año y placa. Es lo más exacto.
      </p>
      <p className="mt-1 text-small text-ink-soft">
        No guardamos tu tarjeta: la enviamos a un servicio de lectura solo para esos cuatro datos.
      </p>
      <p role="status" className="mt-2 text-small text-ink empty:hidden">
        {mensaje}
      </p>
    </div>
  );
}

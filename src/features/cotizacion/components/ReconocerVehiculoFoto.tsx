import { useRef, useState, type ChangeEvent } from 'react';
import { Camera } from 'lucide-react';
import { isApiError } from '../../../shared/lib/api-client';
import { reducirImagen } from '../../../shared/lib/imagen';
import type { VehiculoReconocido } from '../../../shared/types/api';
import { Button } from '../../../shared/ui/button';
import { useReconocerVehiculo } from '../hooks/useCatalogo';
import type { ValorVehiculo } from './SelectorVehiculoCascada';

interface Props {
  /** Recibe marca y modelo sugeridos. El año NO se rellena: no tiene valor por defecto (RN-44). */
  onReconocido: (v: ValorVehiculo) => void;
  disabled?: boolean;
}

const TIPOS = 'image/jpeg,image/png,image/webp';

function textoAnios(anios: number[]) {
  if (anios.length === 0) return 'Elige el año de tu auto.';
  return `Elige el año de tu auto; podría ser ${anios.slice(0, 3).join(', ')}.`;
}

/**
 * "Sube o toma una foto de tu auto" → sugiere marca y modelo del catálogo. Es una ayuda, no una
 * decisión: rellena los selects y el cliente los puede cambiar. Si no reconoce nada (o falla),
 * el formulario sigue igual y se completa a mano.
 */
export function ReconocerVehiculoFoto({ onReconocido, disabled }: Props) {
  const entrada = useRef<HTMLInputElement>(null);
  const reconocer = useReconocerVehiculo();
  const [resultado, setResultado] = useState<VehiculoReconocido | null>(null);

  async function alElegir(e: ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    e.target.value = ''; // permite volver a elegir la misma foto
    if (!archivo) return;
    setResultado(null);
    reconocer.reset();
    try {
      const r = await reconocer.mutateAsync(await reducirImagen(archivo));
      setResultado(r);
      if (r.reconocido && r.marca && r.modelo) {
        onReconocido({ marcaId: r.marca.id, modeloId: r.modelo.id, anio: '' });
      }
    } catch {
      /* el mensaje sale de `reconocer.error` */
    }
  }

  const mensaje = reconocer.isError
    ? isApiError(reconocer.error)
      ? reconocer.error.message
      : 'No pudimos revisar la foto. Elige tu auto a mano.'
    : resultado?.reconocido && resultado.marca && resultado.modelo
      ? `Parece un ${resultado.marca.nombre} ${resultado.modelo.nombre}. ${textoAnios(resultado.aniosProbables)}`
      : resultado
        ? 'No pudimos reconocer tu auto en la foto. Elígelo a mano.'
        : null;

  return (
    <div className="mb-6 rounded-lg border border-dashed border-line p-4">
      <input
        ref={entrada}
        type="file"
        accept={TIPOS}
        className="sr-only"
        tabIndex={-1}
        aria-label="Foto de tu auto"
        onChange={(e) => void alElegir(e)}
      />
      <Button
        type="button"
        variant="secondary"
        loading={reconocer.isPending}
        loadingText="Revisando tu foto…"
        disabled={disabled}
        onClick={() => entrada.current?.click()}
      >
        <Camera aria-hidden />
        Rellenar con una foto de tu auto
      </Button>
      <p className="mt-2 text-small text-ink-soft">Sube o toma una foto y te sugerimos la marca y el modelo. Tú confirmas.</p>
      <p role="status" className="mt-2 text-small text-ink empty:hidden">
        {mensaje}
      </p>
    </div>
  );
}

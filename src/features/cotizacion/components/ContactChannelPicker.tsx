import { AlertCircle, MessageCircle, Phone } from 'lucide-react';
import type { CanalContacto } from '../../../shared/types/enums';
import { cn } from '../../../shared/lib/utils';

const OPCIONES: { valor: CanalContacto; titulo: string; detalle: string; icono: typeof Phone }[] = [
  { valor: 'LLAMADA', titulo: 'Llamada', detalle: 'Te llamamos', icono: Phone },
  { valor: 'WHATSAPP', titulo: 'WhatsApp', detalle: 'Te escribimos', icono: MessageCircle },
];

/**
 * Dos tarjetas-radio grandes (diseño §8.8): obligatorio en la cotización (RF-01). Son radios reales
 * (teclado y lector de pantalla gratis); la elegida lleva borde `brand-500` y un punto, no solo color.
 */
export function ContactChannelPicker({
  value,
  onChange,
  onBlur,
  error,
}: {
  value: string;
  onChange: (valor: CanalContacto) => void;
  onBlur?: () => void;
  error?: string | undefined;
}) {
  return (
    <fieldset className="mb-4" aria-describedby={error ? 'canal-error' : undefined}>
      <legend className="mb-1.5 text-small font-bold text-navy-700">
        ¿Cómo prefieres que te contactemos?
        <span aria-hidden className="ml-0.5 text-brand-600">
          *
        </span>
      </legend>
      <div className="grid grid-cols-2 gap-3">
        {OPCIONES.map(({ valor, titulo, detalle, icono: Icono }) => {
          const elegida = value === valor;
          return (
            <label key={valor} className="relative block cursor-pointer">
              <input
                type="radio"
                name="canalPreferido"
                value={valor}
                checked={elegida}
                onChange={() => onChange(valor)}
                onBlur={onBlur}
                className="peer sr-only"
              />
              <span
                className={cn(
                  'flex min-h-20 flex-col items-start justify-center gap-0.5 rounded-xl border-2 bg-surface p-3 transition-colors duration-150',
                  'peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand-300',
                  elegida ? 'border-brand-500 bg-brand-50' : 'border-line hover:border-navy-300',
                  error && !elegida && 'border-status-danger',
                )}
              >
                <span className="flex w-full items-center justify-between">
                  <Icono className={cn('size-6', elegida ? 'text-brand-600' : 'text-navy-700')} aria-hidden />
                  <span
                    aria-hidden
                    className={cn(
                      'flex size-5 items-center justify-center rounded-full border-2',
                      elegida ? 'border-brand-500' : 'border-line',
                    )}
                  >
                    {elegida ? <span className="size-2.5 rounded-full bg-brand-500" /> : null}
                  </span>
                </span>
                <span className="font-bold text-ink">{titulo}</span>
                <span className="text-small text-ink-soft">{detalle}</span>
              </span>
            </label>
          );
        })}
      </div>
      {error ? (
        <p id="canal-error" role="alert" className="mt-1.5 flex items-start gap-1.5 text-small text-status-danger">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>{error}</span>
        </p>
      ) : null}
    </fieldset>
  );
}

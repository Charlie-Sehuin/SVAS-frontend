import { Headset } from 'lucide-react';
import type { MotivoDerivacion } from '../../../shared/types/enums';

const TEXTO: Record<MotivoDerivacion, string> = {
  // RN-03
  INSPECCION: 'Este uso requiere una inspección. Un asesor te contactará por el canal que elegiste, con tus datos ya cargados.',
  // RN-04
  NO_ASEGURABLE: 'No podemos cotizarlo en línea. Ya lo pasamos a un asesor, no necesitas escribir un correo.',
};

/**
 * Banda informativa cuando la cotización se deriva a un asesor (diseño §8.8, RN-01..RN-04): la Opción 1
 * (comprar en línea) se oculta y queda solo "Hablar con un asesor". No es un error.
 */
export function DerivacionBanner({ motivo }: { motivo: MotivoDerivacion | null }) {
  return (
    <div role="status" className="mb-5 flex items-start gap-3 rounded-xl border border-status-info/30 bg-status-info/10 p-4">
      <Headset className="mt-0.5 size-6 shrink-0 text-status-info" aria-hidden />
      <p className="text-ink">{motivo ? TEXTO[motivo] : 'Un asesor te ayudará a completar esta cotización.'}</p>
    </div>
  );
}

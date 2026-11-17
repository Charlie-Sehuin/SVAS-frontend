import { lazy, Suspense } from 'react';
import { MessageCircle } from 'lucide-react';
import { useAsistenteStore } from '../store/useAsistenteStore';

/** La ventana del chat se descarga solo al abrirla: la portada no debe pagar por ella (meta de JS inicial, arquitectura §6.2). */
const AsistentePanel = lazy(() => import('./AsistentePanel').then((m) => ({ default: m.AsistentePanel })));

/**
 * Burbuja del chatbot (sitio público). Abajo a la derecha; en móvil sube para no tapar el botón fijo del asistente
 * de cotizar y comprar. `cotizacionId` es la cotización de la pantalla actual, si la hay.
 */
export function AsistenteBurbuja({ cotizacionId }: { cotizacionId: string | null }) {
  const abierto = useAsistenteStore((s) => s.abierto);
  const abrir = useAsistenteStore((s) => s.abrir);

  if (abierto) {
    return (
      <Suspense fallback={null}>
        <AsistentePanel cotizacionId={cotizacionId} />
      </Suspense>
    );
  }
  return (
    <button
      type="button"
      aria-label="Abrir el asistente virtual"
      onClick={() => abrir(true)}
      className="fixed bottom-24 right-4 z-30 flex h-14 items-center gap-2 rounded-full bg-brand-500 px-4 font-bold text-[var(--primary-foreground)] shadow-card transition-colors hover:bg-brand-600 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand-300 md:bottom-6 md:right-6"
    >
      <MessageCircle aria-hidden className="size-6" />
      <span className="hidden sm:inline">¿Te ayudo?</span>
    </button>
  );
}

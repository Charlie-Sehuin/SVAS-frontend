import { Loader2 } from 'lucide-react';
import { useWakeUpNotice } from '../../hooks/useWakeUpNotice';

/** Banda status-info: "Estamos despertando el servidor…" (diseño §11.1, estado `waking`). */
export function WakeUpBanner() {
  const despertando = useWakeUpNotice();
  if (!despertando) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center justify-center gap-2 bg-status-info/10 px-4 py-2 text-small text-status-info"
    >
      <Loader2 className="size-4 animate-spin" aria-hidden />
      Estamos despertando el servidor, puede tardar unos segundos.
    </div>
  );
}

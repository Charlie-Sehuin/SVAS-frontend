import { Info } from 'lucide-react';
import { cn } from '../../lib/utils';

export const TEXTO_DEMO = 'Documento de demostración sin validez legal';

/** Franja de 32 px, caption (RNF-20). No se puede ocultar. */
export function DemoLegend({ className }: { className?: string }) {
  return (
    <div
      role="note"
      className={cn(
        'flex h-8 items-center justify-center gap-2 bg-surface-muted px-4 text-caption text-ink-soft',
        className,
      )}
    >
      <Info className="size-3.5 shrink-0" aria-hidden />
      {TEXTO_DEMO}
    </div>
  );
}

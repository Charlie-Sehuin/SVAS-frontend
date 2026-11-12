import { Toaster as Sonner } from 'sonner';
import { useIsDesktop } from '../hooks/useMediaQuery';

/** Toasts (§7.8): arriba a la derecha en escritorio, abajo en móvil; 6 s; los de error no se cierran solos. */
export function Toaster() {
  const desktop = useIsDesktop();
  return (
    <Sonner
      position={desktop ? 'top-right' : 'bottom-center'}
      duration={6000}
      closeButton
      richColors={false}
      toastOptions={{
        classNames: {
          toast: 'font-sans !rounded-xl !border !border-line !bg-surface !text-ink !shadow-float',
          title: '!font-bold',
          description: '!text-ink-soft',
        },
      }}
    />
  );
}

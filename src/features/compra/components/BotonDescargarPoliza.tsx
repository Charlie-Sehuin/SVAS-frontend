import { Download } from 'lucide-react';
import { Button, type ButtonProps } from '../../../shared/ui/button';
import { useDescargarPoliza } from '../hooks/useCompra';

interface Props {
  polizaId: string;
  numero: string;
  variant?: ButtonProps['variant'];
  size?: ButtonProps['size'];
  className?: string;
  /** El PDF aún se está generando: se avisa con texto, no solo con el spinner. */
  generando?: boolean;
}

/**
 * "Descargar mi póliza (PDF)". Si el backend responde 202 (`PDF_EN_GENERACION`), aparece un toast ámbar y el botón
 * queda disponible para reintentar en unos segundos: la póliza ya existe.
 */
export function BotonDescargarPoliza({ polizaId, numero, variant = 'primary', size = 'lg', className, generando = false }: Props) {
  const descargar = useDescargarPoliza();
  return (
    <div className={className}>
      <Button
        variant={variant}
        size={size}
        className="w-full sm:w-auto"
        loading={descargar.isPending}
        loadingText="Preparando tu PDF…"
        onClick={() => descargar.mutate({ polizaId, numero })}
      >
        <Download aria-hidden /> Descargar mi póliza (PDF)
      </Button>
      {generando ? <p className="mt-2 text-small text-ink-soft">Tu póliza se está generando; si no baja ahora, vuelve a intentarlo en unos segundos.</p> : null}
    </div>
  );
}

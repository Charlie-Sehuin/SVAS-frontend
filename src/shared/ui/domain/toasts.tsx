import { toast } from 'sonner';
import { AlertTriangle, CheckCircle2, Copy, XCircle } from 'lucide-react';
import type { Warning } from '../../types/api/comunes.types';
import { ApiError, isApiError } from '../../lib/api-client';

/**
 * Tres niveles que nunca se mezclan (arquitectura §12.1):
 *  2. Advertencia no bloqueante → WarningToast (ámbar): la operación SÍ se ejecutó.
 *  3. Error real → ErrorToast (rojo): no se ejecutó; mensaje del backend tal cual.
 * Se exponen como funciones (no componentes) porque sonner es imperativo; el
 * nombre se mantiene por el doc de arquitectura §4.2.
 */

export function WarningToast(warning: Warning | string, id?: string) {
  const message = typeof warning === 'string' ? warning : warning.message;
  // Con `id`, el mismo aviso no se duplica si se dispara dos veces (p. ej. al cotizar y al abrir el comparativo).
  return toast.warning(message, {
    id,
    icon: <AlertTriangle className="size-5 text-status-warning" aria-hidden />,
    className: '!border-l-4 !border-l-status-warning',
  });
}

export function ErrorToast(error: unknown, fallback = 'Ocurrió un error inesperado. Inténtalo de nuevo.') {
  const apiError = isApiError(error) ? error : null;
  const message = apiError?.message ?? (error instanceof Error ? error.message : fallback);
  const correlationId = apiError?.correlationId ?? null;

  return toast.error(message, {
    duration: Infinity, // los de error no se cierran solos (§7.8)
    icon: <XCircle className="size-5 text-status-danger" aria-hidden />,
    className: '!border-l-4 !border-l-status-danger',
    description: correlationId ? `Código de seguimiento: ${correlationId}` : undefined,
    action: correlationId
      ? {
          label: (
            <span className="inline-flex items-center gap-1">
              <Copy className="size-4" aria-hidden /> Copiar
            </span>
          ) as unknown as string,
          onClick: () => void navigator.clipboard?.writeText(correlationId),
        }
      : undefined,
  });
}

export function SuccessToast(message: string, description?: string) {
  return toast.success(message, {
    description,
    icon: <CheckCircle2 className="size-5 text-status-success" aria-hidden />,
    className: '!border-l-4 !border-l-status-success',
  });
}

/** Atajo para `onError` de mutaciones: muestra el ErrorToast y devuelve el ApiError si lo es. */
export function manejarError(error: unknown): ApiError | null {
  ErrorToast(error);
  return isApiError(error) ? error : null;
}

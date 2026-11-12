import type { ReactNode } from 'react';
import { Inbox, RefreshCw } from 'lucide-react';
import { Button } from '../button';
import { isApiError } from '../../lib/api-client';

/** Estado `empty` (§11.1): ilustración pequeña, una línea y una acción. */
export function EstadoVacio({
  titulo,
  accion,
  icono = <Inbox className="size-10 text-navy-300" aria-hidden />,
}: {
  titulo: string;
  accion?: ReactNode;
  icono?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 py-12 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-navy-50">{icono}</div>
      <p className="text-ink-soft">{titulo}</p>
      {accion}
    </div>
  );
}

/** Estado `error` en pantalla (§11.1): mensaje del backend tal cual + Reintentar + correlationId copiable. */
export function EstadoError({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const api = isApiError(error) ? error : null;
  const mensaje = api?.message ?? (error instanceof Error ? error.message : 'No pudimos cargar esta información.');
  return (
    <div role="alert" className="flex flex-col items-center gap-3 rounded-xl border border-status-danger/30 bg-status-danger/5 px-4 py-8 text-center">
      <p className="font-bold text-status-danger">{mensaje}</p>
      {api?.correlationId ? (
        <p className="text-small text-ink-soft">
          Código de seguimiento: <code className="font-mono select-all">{api.correlationId}</code>
        </p>
      ) : null}
      {onRetry ? (
        <Button variant="outlineNavy" size="sm" onClick={onRetry}>
          <RefreshCw aria-hidden /> Reintentar
        </Button>
      ) : null}
    </div>
  );
}

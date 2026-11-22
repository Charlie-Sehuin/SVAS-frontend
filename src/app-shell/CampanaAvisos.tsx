import { Link } from 'react-router-dom';
import { Bell, BellRing } from 'lucide-react';
import { useAuth } from '../auth/useAuth';
import { cn } from '../shared/lib/utils';
import { MoneyValue } from '../shared/ui/domain/MoneyValue';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '../shared/ui/dropdown-menu';
import { useMisPolizas } from '../features/compra/hooks/useCompra';
import { avisosDeCuotas } from '../features/compra/lib/avisos';

/**
 * La campanita del CLIENTE: las cuotas que ya vencieron o vencen pronto. Sale de `GET /polizas/mias` (la misma
 * consulta de "Mis pólizas", que ya está en caché). Solo aparece con sesión de cliente; sin avisos se ve apagada.
 * El estado va en texto ("Vencida", "Por vencer"), no solo en color.
 */
export function CampanaAvisos({ variante }: { variante: 'claro' | 'oscuro' }) {
  const { estado, roles } = useAuth();
  const esCliente = estado === 'autenticado' && roles.includes('CLIENTE');
  const polizas = useMisPolizas();
  if (!esCliente) return null;

  const avisos = avisosDeCuotas(polizas.data ?? []);
  const vencidas = avisos.filter((a) => a.severidad === 'vencida').length;
  const oscuro = variante === 'oscuro';
  const Icono = avisos.length > 0 ? BellRing : Bell;
  const resumen =
    avisos.length === 0 ? 'Avisos: no tienes pendientes' : `Avisos: ${avisos.length} ${avisos.length === 1 ? 'pendiente' : 'pendientes'}`;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={resumen}
          className={cn(
            'relative flex size-11 items-center justify-center rounded-full',
            oscuro ? 'text-white hover:bg-white/10 focus-visible:outline-white' : 'text-navy-700 hover:bg-navy-50',
          )}
        >
          <Icono className="size-6" aria-hidden />
          {avisos.length > 0 ? (
            <span
              aria-hidden
              className={cn(
                'absolute right-1 top-1 flex size-5 items-center justify-center rounded-full text-[11px] font-bold text-white',
                vencidas > 0 ? 'bg-status-danger' : 'bg-status-warning !text-ink',
              )}
            >
              {avisos.length}
            </span>
          ) : null}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[min(22rem,calc(100vw-2rem))]">
        <DropdownMenuLabel className="font-bold text-navy-700">Avisos de tus cuotas</DropdownMenuLabel>
        {polizas.isError ? (
          <p className="px-3 py-3 text-small text-ink-soft">No pudimos cargar tus avisos. Inténtalo de nuevo en un momento.</p>
        ) : avisos.length === 0 ? (
          <p className="px-3 py-3 text-small text-ink-soft">Estás al día: no tienes cuotas vencidas ni por vencer.</p>
        ) : (
          avisos.map((a) => (
            <DropdownMenuItem key={a.id} asChild className="items-start">
              <Link to={`/mi-cuenta/polizas#poliza-${a.polizaId}`} className="flex flex-col items-start gap-0.5 whitespace-normal py-2">
                <span className="flex items-center gap-2">
                  <span className={cn('text-caption font-bold uppercase', a.severidad === 'vencida' ? 'text-status-danger' : 'text-ink')}>
                    {a.severidad === 'vencida' ? 'Vencida' : 'Por vencer'}
                  </span>
                  <MoneyValue value={a.cuota.monto} />
                </span>
                <span className="font-bold text-navy-700">{a.titulo}</span>
                <span className="text-small text-ink-soft">{a.detalle}</span>
              </Link>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

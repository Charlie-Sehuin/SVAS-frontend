import { useRef, useState } from 'react';
import { AlertCircle, CalendarClock } from 'lucide-react';
import { isApiError, nuevaIdempotencyKey } from '../../../shared/lib/api-client';
import { cn } from '../../../shared/lib/utils';
import type { PolizaResumen } from '../../../shared/types/api';
import { Button } from '../../../shared/ui/button';
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../../shared/ui/dialog';
import { Select } from '../../../shared/ui/select';
import { ErrorToast, SuccessToast } from '../../../shared/ui/domain/toasts';
import { MoneyValue } from '../../../shared/ui/domain/MoneyValue';
import { usePagarCuotas } from '../hooks/useCompra';

type Forma = 'SIGUIENTE' | 'GRUPO' | 'TODAS';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  poliza: Pick<PolizaResumen, 'ordenId' | 'numero'> & { cuotas: NonNullable<PolizaResumen['pago']>['cuotas'] };
}

/** "la cuota 3" o "las cuotas 3 a 5": solo los números que ya trae el cronograma. */
const rango = (numeros: number[]) =>
  numeros.length === 1 ? `la cuota ${numeros[0]}` : `las cuotas ${numeros[0]} a ${numeros[numeros.length - 1]}`;

/**
 * Pagar cuotas pendientes (Fase B). Siempre se pagan las SIGUIENTES en orden: la próxima, un grupo o todas las que
 * quedan. Cuánto cuesta lo elegido lo da el backend en cada cuota (`montoAcumulado`): aquí no se suma nada.
 * Una cuota vencida se paga igual, sin recargo.
 */
export function PagarCuotasDialog({ open, onOpenChange, poliza }: Props) {
  const pagar = usePagarCuotas(poliza.ordenId);
  const pendientes = poliza.cuotas.filter((c) => c.estado === 'PENDIENTE').sort((a, b) => a.numero - b.numero);
  const total = pendientes.length;

  const [forma, setForma] = useState<Forma>('SIGUIENTE');
  const [grupo, setGrupo] = useState(2);
  const [rechazo, setRechazo] = useState<string | null>(null);
  // Una Idempotency-Key por intento: si la red falla y se repite el clic, la misma clave evita cobrar dos veces.
  // Se renueva cuando el intento terminó (rechazo) o cambió lo que se paga.
  const claveRef = useRef<string | null>(null);

  // Opciones según las cuotas que queden: con 1 solo "la siguiente"; con 2, además "todas"; desde 3, también un grupo.
  const formas: { valor: Forma; titulo: string }[] = [
    { valor: 'SIGUIENTE', titulo: 'Solo la siguiente cuota' },
    ...(total >= 3 ? [{ valor: 'GRUPO' as const, titulo: 'Un grupo de cuotas, en orden' }] : []),
    ...(total >= 2 ? [{ valor: 'TODAS' as const, titulo: `Todas las que quedan (${total})` }] : []),
  ];
  const grupoMax = Math.max(2, total - 1);
  const cantidad = forma === 'SIGUIENTE' ? 1 : forma === 'TODAS' ? total : Math.min(grupo, grupoMax);
  const elegidas = pendientes.slice(0, cantidad);
  const ultima = elegidas[elegidas.length - 1];
  const hayVencidas = elegidas.some((c) => (c.diasParaVencer ?? 0) < 0);

  function elegir(f: Forma) {
    setForma(f);
    claveRef.current = null;
    setRechazo(null);
  }

  function cerrar(o: boolean) {
    if (pagar.isPending) return;
    onOpenChange(o);
    if (!o) {
      setForma('SIGUIENTE');
      setGrupo(2);
      setRechazo(null);
      claveRef.current = null;
    }
  }

  function pagarAhora() {
    if (!ultima) return;
    claveRef.current ??= nuevaIdempotencyKey();
    setRechazo(null);
    pagar.mutate(
      { cantidad, idempotencyKey: claveRef.current },
      {
        onSuccess: (r) => {
          SuccessToast('Pago registrado', `Pagaste ${rango(r.pago.cuotasPagadas)}.`);
          cerrar(false);
        },
        onError: (err) => {
          if (isApiError(err) && err.statusCode === 409) {
            // Ya estaba al día (otra pestaña u otro intento): se muestra el estado real del cronograma.
            ErrorToast(err);
            cerrar(false);
          } else if (isApiError(err) && err.statusCode === 400) {
            // Rechazo o cantidad inválida: el intento terminó, el próximo usa otra clave. Mensaje del backend tal cual.
            claveRef.current = null;
            setRechazo(err.message);
          } else {
            // Red o servidor: la clave se conserva para reintentar sin riesgo de doble cobro.
            ErrorToast(err);
          }
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={cerrar}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="size-6 text-navy-700" aria-hidden /> Pagar cuotas
          </DialogTitle>
          <DialogDescription>Póliza {poliza.numero}. Las cuotas se pagan en orden: siempre empiezas por la siguiente.</DialogDescription>
        </DialogHeader>

        <DialogBody>
          {total === 0 || !ultima ? (
            <p className="text-ink">No tienes cuotas pendientes en esta póliza.</p>
          ) : (
            <>
              <fieldset className="mb-4">
                <legend className="mb-1.5 text-small font-bold text-navy-700">¿Cuánto quieres pagar ahora?</legend>
                <div className="space-y-2">
                  {formas.map((f) => (
                    <label
                      key={f.valor}
                      className={cn(
                        'flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border-2 bg-surface p-3 transition-colors has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand-300',
                        forma === f.valor ? 'border-brand-500 bg-brand-50' : 'border-line hover:border-navy-300',
                      )}
                    >
                      <input
                        type="radio"
                        name="forma-pago-cuotas"
                        value={f.valor}
                        checked={forma === f.valor}
                        disabled={pagar.isPending}
                        onChange={() => elegir(f.valor)}
                        className="size-5 accent-brand-500"
                      />
                      <span className="font-bold text-navy-700">{f.titulo}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              {forma === 'GRUPO' ? (
                <div className="mb-4">
                  <label htmlFor="cuotas-grupo" className="mb-1.5 block text-small font-bold text-navy-700">
                    ¿Cuántas cuotas?
                  </label>
                  <Select
                    id="cuotas-grupo"
                    value={cantidad}
                    disabled={pagar.isPending}
                    onChange={(e) => {
                      setGrupo(Number(e.target.value));
                      claveRef.current = null;
                      setRechazo(null);
                    }}
                  >
                    {Array.from({ length: grupoMax - 1 }, (_, i) => i + 2).map((n) => (
                      <option key={n} value={n}>
                        {n} cuotas
                      </option>
                    ))}
                  </Select>
                </div>
              ) : null}

              <div className="rounded-xl bg-navy-50 p-4" aria-live="polite">
                <p className="text-small text-ink-soft">Vas a pagar {rango(elegidas.map((c) => c.numero))}</p>
                <p className="mt-1">
                  <MoneyValue value={ultima.montoAcumulado ?? ultima.monto} size="xl" />
                </p>
                {hayVencidas ? <p className="mt-2 text-small text-ink-soft">Incluye cuotas vencidas: no tienen recargo.</p> : null}
              </div>

              <p className="mt-3 text-small text-ink-soft">El pago es simulado: no se cobra dinero real.</p>

              {pagar.isPending ? (
                <p role="status" className="mt-3 text-ink-soft">
                  Procesando tu pago…
                </p>
              ) : null}

              {rechazo ? (
                <div role="alert" className="mt-4 flex items-start gap-3 rounded-lg border border-status-danger/30 bg-status-danger/5 p-4">
                  <AlertCircle className="mt-0.5 size-5 shrink-0 text-status-danger" aria-hidden />
                  <div>
                    <p className="font-bold text-status-danger">Tu pago no pudo procesarse</p>
                    <p className="text-small text-ink">{rechazo}</p>
                  </div>
                </div>
              ) : null}
            </>
          )}
        </DialogBody>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => cerrar(false)} disabled={pagar.isPending}>
            Ahora no
          </Button>
          {ultima ? (
            <Button type="button" size="lg" loading={pagar.isPending} loadingText="Procesando…" onClick={pagarAhora}>
              Pagar <MoneyValue value={ultima.montoAcumulado ?? ultima.monto} className="ml-1" />
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

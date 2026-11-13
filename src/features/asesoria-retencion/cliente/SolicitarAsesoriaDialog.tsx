import { useEffect, useState, type FormEvent } from 'react';
import { CheckCircle2, Headset, Phone } from 'lucide-react';
import { RegistroMinimoDialog } from '../../../auth/RegistroMinimoDialog';
import { useAuth } from '../../../auth/useAuth';
import { TELEFONO, TELEFONO_HREF } from '../../../shared/lib/contacto';
import { cn } from '../../../shared/lib/utils';
import type { MotivoCliente } from '../../../shared/types/api';
import type { CanalContacto } from '../../../shared/types/enums';
import { Button } from '../../../shared/ui/button';
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../../shared/ui/dialog';
import { EstadoError } from '../../../shared/ui/domain/EstadoVacio';
import { ErrorToast } from '../../../shared/ui/domain/toasts';
import { useVinculoCotizacion } from '../../compra/hooks/useCompra';
import { ContactChannelPicker } from '../../cotizacion/components/ContactChannelPicker';
import { useSolicitarAsesoria } from '../hooks/useAsesoria';

const MOTIVOS: { valor: MotivoCliente; titulo: string; detalle: string }[] = [
  { valor: 'DUDA', titulo: 'Tengo una duda', detalle: 'Quiero que me expliquen un plan o una cobertura.' },
  { valor: 'NEGOCIACION', titulo: 'Quiero negociar', detalle: 'Quiero conversar el precio o las condiciones.' },
  { valor: 'DESCUENTO', titulo: 'Quiero un descuento', detalle: 'Quiero saber si puedo pagar menos.' },
];

const TEXTO_CANAL: Record<CanalContacto, string> = { WHATSAPP: 'WhatsApp', LLAMADA: 'una llamada' };

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cotizacionId: string;
  /** Motivo ya marcado al abrir (por ejemplo `DUDA` desde la Prueba de Choque). */
  motivoInicial?: MotivoCliente;
}

/**
 * "Hablar con un asesor" (CU-03, RF-11). Quien aún no tiene cuenta la crea aquí mismo sin salir de la pantalla
 * (`RegistroMinimoDialog`); quien cotizó sin cuenta y entró con una que ya tenía, primero vincula su cotización. Luego
 * elige el motivo y el canal (WhatsApp por defecto) y el backend crea la solicitud en la cola del asesor.
 */
export function SolicitarAsesoriaDialog({ open, onOpenChange, cotizacionId, motivoInicial = 'DUDA' }: Props) {
  const { estado, roles } = useAuth();
  const vinculo = useVinculoCotizacion(cotizacionId);
  const solicitar = useSolicitarAsesoria();
  const reiniciar = solicitar.reset;
  const [motivo, setMotivo] = useState<MotivoCliente>(motivoInicial);
  const [canal, setCanal] = useState<CanalContacto>('WHATSAPP');

  // Cada vez que se abre vuelve a empezar con el motivo que corresponde y sin el resultado de la vez anterior.
  useEffect(() => {
    if (open) {
      setMotivo(motivoInicial);
      reiniciar();
    }
  }, [open, motivoInicial, reiniciar]);

  // Sin cuenta: se crea aquí. Al iniciar sesión, `estado` cambia y este mismo diálogo muestra el formulario.
  if (estado !== 'autenticado') {
    return <RegistroMinimoDialog open={open && estado !== 'cargando'} onOpenChange={onOpenChange} cotizacionId={cotizacionId} />;
  }

  function enviar(e: FormEvent) {
    e.preventDefault();
    solicitar.mutate({ cotizacionId, motivo, canal }, { onError: (err) => ErrorToast(err) });
  }

  const esCliente = roles.includes('CLIENTE');
  const creada = solicitar.data;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md">
        {!esCliente ? (
          <>
            <DialogHeader>
              <DialogTitle>Hablar con un asesor</DialogTitle>
              <DialogDescription>Solo los clientes pueden pedir asesoría desde aquí.</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outlineNavy" onClick={() => onOpenChange(false)}>
                Cerrar
              </Button>
            </DialogFooter>
          </>
        ) : creada ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle2 className="size-6 text-status-success" aria-hidden /> Listo, ya avisamos a un asesor
              </DialogTitle>
              <DialogDescription>Te contactará por {TEXTO_CANAL[creada.canal]}. Tu cotización sigue guardada.</DialogDescription>
            </DialogHeader>
            <DialogBody>
              <p className="text-ink">
                ¿Prefieres hablar ahora? Llámanos al{' '}
                <a href={TELEFONO_HREF} className="font-bold text-brand-600 underline-offset-4 hover:underline">
                  {TELEFONO}
                </a>
                .
              </p>
            </DialogBody>
            <DialogFooter>
              <Button onClick={() => onOpenChange(false)}>Entendido</Button>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={enviar} noValidate className="flex min-h-0 flex-1 flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Headset className="size-6 text-navy-700" aria-hidden /> Hablar con un asesor
              </DialogTitle>
              <DialogDescription>Cuéntanos qué necesitas y por dónde prefieres que te contactemos.</DialogDescription>
            </DialogHeader>

            <DialogBody>
              {vinculo.isError ? (
                <EstadoError error={vinculo.error} onRetry={() => void vinculo.refetch()} />
              ) : (
                <>
                  <fieldset className="mb-4">
                    <legend className="mb-1.5 text-small font-bold text-navy-700">¿En qué te ayudamos?</legend>
                    <div className="space-y-2">
                      {MOTIVOS.map((m) => (
                        <label
                          key={m.valor}
                          className={cn(
                            'flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border-2 bg-surface p-3 transition-colors has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand-300',
                            motivo === m.valor ? 'border-brand-500 bg-brand-50' : 'border-line hover:border-navy-300',
                          )}
                        >
                          <input
                            type="radio"
                            name="motivo-asesoria"
                            value={m.valor}
                            checked={motivo === m.valor}
                            onChange={() => setMotivo(m.valor)}
                            className="mt-1 size-5 accent-brand-500"
                          />
                          <span>
                            <span className="block font-bold text-navy-700">{m.titulo}</span>
                            <span className="block text-small text-ink-soft">{m.detalle}</span>
                          </span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                  <ContactChannelPicker value={canal} onChange={setCanal} />
                  <p className="flex items-center gap-1.5 text-small text-ink-soft">
                    <Phone className="size-4 shrink-0" aria-hidden /> También puedes llamarnos al{' '}
                    <a href={TELEFONO_HREF} className="font-bold text-brand-600 underline-offset-4 hover:underline">
                      {TELEFONO}
                    </a>
                  </p>
                </>
              )}
            </DialogBody>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={solicitar.isPending}>
                Ahora no
              </Button>
              <Button type="submit" size="lg" loading={solicitar.isPending} loadingText="Enviando…" disabled={!vinculo.listo || vinculo.isError}>
                Pedir que me contacten
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

import { useState, type FormEvent } from 'react';
import type { MotivoCierre } from '../../../../shared/types/enums';
import { Button } from '../../../../shared/ui/button';
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../../../../shared/ui/dialog';
import { Field } from '../../../../shared/ui/field';
import { Select } from '../../../../shared/ui/select';
import { ErrorToast, SuccessToast, WarningToast } from '../../../../shared/ui/domain/toasts';
import { useCerrarSeguimiento } from '../../hooks/useAsesoria';
import { TEXTO_MOTIVO_CIERRE } from '../textos';

const MOTIVOS = Object.keys(TEXTO_MOTIVO_CIERRE) as MotivoCierre[];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  seguimientoId: string;
}

/**
 * Cierre del seguimiento (RF-18, RN-11): convertido, o descartado con un motivo OBLIGATORIO. Descartar le envía al
 * cliente el mensaje final de retención (RN-12); si ese mensaje no sale, el cierre igual queda hecho y se avisa en ámbar.
 */
export function CerrarSeguimientoDialog({ open, onOpenChange, seguimientoId }: Props) {
  const cerrar = useCerrarSeguimiento(seguimientoId);
  const [estado, setEstado] = useState<'CONVERTIDO' | 'DESCARTADO'>('DESCARTADO');
  const [motivo, setMotivo] = useState<MotivoCierre | ''>('');
  const [intento, setIntento] = useState(false);

  const errorMotivo = intento && estado === 'DESCARTADO' && !motivo ? 'Elige el motivo del cierre' : undefined;

  function enviar(e: FormEvent) {
    e.preventDefault();
    setIntento(true);
    if (estado === 'DESCARTADO' && !motivo) return;
    cerrar.mutate(
      { estado, ...(estado === 'DESCARTADO' && motivo ? { motivo } : {}) },
      {
        onSuccess: (r) => {
          SuccessToast(estado === 'CONVERTIDO' ? 'Seguimiento cerrado como convertido' : 'Seguimiento descartado');
          if (r.warning) WarningToast(r.warning, `warning-seg-${seguimientoId}`);
          onOpenChange(false);
        },
        onError: (err) => ErrorToast(err),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <form onSubmit={enviar} noValidate className="flex min-h-0 flex-1 flex-col">
          <DialogHeader>
            <DialogTitle>Cerrar seguimiento</DialogTitle>
            <DialogDescription>El cierre no se puede deshacer.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <fieldset className="mb-4">
              <legend className="mb-1.5 text-small font-bold text-navy-700">¿Cómo termina?</legend>
              <div className="space-y-2">
                {(
                  [
                    ['DESCARTADO', 'Descartado', 'El cliente no compró. Se le envía el mensaje final.'],
                    ['CONVERTIDO', 'Convertido', 'El cliente ya compró.'],
                  ] as const
                ).map(([valor, titulo, detalle]) => (
                  <label key={valor} className="flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border-2 border-line p-3 has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50">
                    <input
                      type="radio"
                      name="estado-cierre"
                      value={valor}
                      checked={estado === valor}
                      onChange={() => setEstado(valor)}
                      className="mt-1 size-5 accent-brand-500"
                    />
                    <span>
                      <span className="block font-bold text-navy-700">{titulo}</span>
                      <span className="block text-small text-ink-soft">{detalle}</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            {estado === 'DESCARTADO' ? (
              <Field label="Motivo del cierre" error={errorMotivo} required>
                {(p) => (
                  <Select {...p} value={motivo} onChange={(e) => setMotivo(e.target.value as MotivoCierre | '')} invalid={!!errorMotivo}>
                    <option value="">Elige un motivo</option>
                    {MOTIVOS.map((m) => (
                      <option key={m} value={m}>
                        {TEXTO_MOTIVO_CIERRE[m]}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
            ) : null}
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={cerrar.isPending}>
              Cancelar
            </Button>
            <Button type="submit" loading={cerrar.isPending} loadingText="Cerrando…">
              Cerrar seguimiento
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

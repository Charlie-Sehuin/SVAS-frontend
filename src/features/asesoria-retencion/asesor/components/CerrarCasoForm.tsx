import { useState, type FormEvent } from 'react';
import { CheckCheck } from 'lucide-react';
import type { SolicitudDetalle } from '../../../../shared/types/api';
import { Button } from '../../../../shared/ui/button';
import { Field } from '../../../../shared/ui/field';
import { ConfirmDialog } from '../../../../shared/ui/domain/ConfirmDialog';
import { ErrorToast, SuccessToast } from '../../../../shared/ui/domain/toasts';
import { useCerrarSolicitud } from '../../hooks/useAsesoria';

const MAXIMO = 200;

interface Props {
  caso: SolicitudDetalle;
  habilitado: boolean;
}

/**
 * Cierre del caso (RF-15, RPC 6.7): resultado en una frase (hasta 200 caracteres) e indicar si el cliente aceptó. Si
 * aceptó, el descuento negociado queda disponible para su compra. Cerrar pide confirmación porque no se deshace.
 */
export function CerrarCasoForm({ caso, habilitado }: Props) {
  const cerrar = useCerrarSolicitud(caso.id);
  const [resultado, setResultado] = useState('');
  const [acepta, setAcepta] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [intento, setIntento] = useState(false);

  const error = intento && !resultado.trim() ? 'Describe el resultado de la atención' : undefined;

  function revisar(e: FormEvent) {
    e.preventDefault();
    setIntento(true);
    if (resultado.trim()) setConfirmando(true);
  }

  function confirmar() {
    cerrar.mutate(
      { resultado: resultado.trim(), acepta },
      {
        onSuccess: () => {
          setConfirmando(false);
          SuccessToast('Caso cerrado');
        },
        onError: (err) => {
          setConfirmando(false);
          ErrorToast(err);
        },
      },
    );
  }

  if (caso.estado === 'CERRADA') {
    return (
      <section aria-labelledby="titulo-cierre" className="rounded-xl border border-line bg-surface p-4">
        <h2 id="titulo-cierre" className="flex items-center gap-2 text-h3 text-navy-700">
          <CheckCheck className="size-5 text-status-success" aria-hidden /> Caso cerrado
        </h2>
        <p className="mt-2 text-ink">{caso.resultado ?? 'Sin resultado registrado.'}</p>
      </section>
    );
  }

  return (
    <section aria-labelledby="titulo-cierre" className="rounded-xl border border-line bg-surface p-4">
      <h2 id="titulo-cierre" className="text-h3 text-navy-700">
        Cerrar el caso
      </h2>
      {habilitado ? (
        <form onSubmit={revisar} noValidate className="mt-3">
          <Field label="Resultado de la atención" help={`${resultado.length} de ${MAXIMO} caracteres`} error={error} required>
            {(p) => (
              <textarea
                {...p}
                value={resultado}
                onChange={(e) => setResultado(e.target.value)}
                maxLength={MAXIMO}
                rows={3}
                className="w-full rounded-lg border border-line bg-surface p-3 text-base text-ink focus:border-brand-500 focus-visible:outline-3 focus-visible:outline-brand-300"
              />
            )}
          </Field>
          <label className="mb-4 flex min-h-11 cursor-pointer items-center gap-3">
            <input type="checkbox" checked={acepta} onChange={(e) => setAcepta(e.target.checked)} className="size-5 accent-brand-500" />
            <span>El cliente aceptó</span>
          </label>
          <Button type="submit" variant="outlineNavy">
            Cerrar caso
          </Button>
        </form>
      ) : (
        <p className="mt-3 text-small text-ink-soft">Solo el asesor que atiende el caso puede cerrarlo.</p>
      )}

      <ConfirmDialog
        open={confirmando}
        onOpenChange={setConfirmando}
        titulo="¿Cerrar este caso?"
        descripcion={`Quedará registrado que el cliente ${acepta ? 'aceptó' : 'no aceptó'}. Esto no se puede deshacer.`}
        confirmarTexto="Cerrar caso"
        destructivo={false}
        loading={cerrar.isPending}
        onConfirm={confirmar}
      />
    </section>
  );
}

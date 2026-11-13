import { useState, type FormEvent } from 'react';
import { PhoneCall } from 'lucide-react';
import { cn } from '../../../../shared/lib/utils';
import type { SeguimientoDetalle } from '../../../../shared/types/api';
import type { CanalContacto, ResultadoIntento } from '../../../../shared/types/enums';
import { Button } from '../../../../shared/ui/button';
import { ErrorToast, SuccessToast, WarningToast } from '../../../../shared/ui/domain/toasts';
import { useRegistrarIntento } from '../../hooks/useAsesoria';
import { TEXTO_CANAL, TEXTO_RESULTADO_INTENTO } from '../textos';
import { AttemptCounter } from './AttemptCounter';

const CANALES: CanalContacto[] = ['LLAMADA', 'WHATSAPP'];
const RESULTADOS: ResultadoIntento[] = ['CONTACTADO', 'NO_RESPONDE', 'RECHAZA', 'ACEPTA'];

interface Props {
  seguimiento: SeguimientoDetalle;
  /** Solo el ASESOR, y solo mientras el seguimiento sigue abierto. */
  habilitado: boolean;
  diasRestantes: number;
}

/**
 * Registrar un intento de contacto (RF-17, RN-10). Solo el canal preferido del cliente está habilitado (el otro se ve
 * apagado y dice por qué). Al alcanzar el máximo de intentos o pasar el plazo, el registro se bloquea con el motivo en
 * texto. El backend vuelve a validar todo y, al llegar al máximo sin aceptación, cierra el seguimiento solo.
 */
export function RegistrarIntentoForm({ seguimiento, habilitado, diasRestantes }: Props) {
  const registrar = useRegistrarIntento(seguimiento.id);
  const preferido = seguimiento.cliente.canalPreferido;
  const [resultado, setResultado] = useState<ResultadoIntento | ''>('');
  const [intento, setIntento] = useState(false);

  const alMaximo = seguimiento.intentos >= seguimiento.maxIntentos;
  const sinPlazo = diasRestantes <= 0;
  const bloqueo = !habilitado
    ? null
    : alMaximo
      ? `Se alcanzó el máximo de ${seguimiento.maxIntentos} intentos`
      : sinPlazo
        ? `Pasaron los ${seguimiento.diasSeguimiento} días del seguimiento`
        : null;
  const puedeRegistrar = habilitado && !bloqueo;
  const errorResultado = intento && !resultado ? 'Elige cómo te fue en el intento' : undefined;

  function enviar(e: FormEvent) {
    e.preventDefault();
    setIntento(true);
    if (!resultado) return;
    registrar.mutate(
      { canal: preferido, resultado },
      {
        onSuccess: (r) => {
          setResultado('');
          setIntento(false);
          if (r.estado !== 'EN_SEGUIMIENTO') {
            SuccessToast('Intento registrado', 'Se alcanzó el máximo de intentos: el seguimiento se cerró.');
          } else {
            SuccessToast('Intento registrado', resultado === 'ACEPTA' ? 'Ahora puedes enviarle el enlace de compra.' : undefined);
          }
          // El cierre sí se hizo; el mensaje al cliente no salió (MENSAJE_NO_ENVIADO).
          if (r.warning) WarningToast(r.warning, `warning-seg-${seguimiento.id}`);
        },
        onError: (err) => ErrorToast(err),
      },
    );
  }

  return (
    <section aria-labelledby="titulo-intento" className="rounded-xl border border-line bg-surface p-4">
      <h2 id="titulo-intento" className="flex items-center gap-2 text-h3 text-navy-700">
        <PhoneCall className="size-5" aria-hidden /> Registrar intento de contacto
      </h2>
      <div className="mt-3">
        <AttemptCounter intentos={seguimiento.intentos} maximo={seguimiento.maxIntentos} diasRestantes={diasRestantes} />
      </div>

      {!habilitado ? (
        <p className="mt-3 text-small text-ink-soft">
          {seguimiento.estado === 'EN_SEGUIMIENTO' ? 'Solo un asesor puede registrar intentos.' : 'Este seguimiento ya está cerrado.'}
        </p>
      ) : bloqueo ? (
        <p role="status" className="mt-3 rounded-lg bg-status-warning/15 px-3 py-2 text-small text-ink">
          {bloqueo}. Ciérralo con un motivo.
        </p>
      ) : null}

      {puedeRegistrar ? (
        <form onSubmit={enviar} noValidate className="mt-4">
          <fieldset className="mb-4">
            <legend className="mb-1.5 text-small font-bold text-navy-700">Canal</legend>
            <div className="grid grid-cols-2 gap-3">
              {CANALES.map((c) => {
                const permitido = c === preferido;
                return (
                  <label
                    key={c}
                    title={permitido ? undefined : `Solo puedes usar el canal que el cliente prefiere (${TEXTO_CANAL[preferido]})`}
                    className={cn(
                      'flex min-h-11 items-center gap-2 rounded-xl border-2 p-3',
                      permitido ? 'border-brand-500 bg-brand-50' : 'cursor-not-allowed border-line bg-surface-muted text-ink-soft',
                    )}
                  >
                    <input type="radio" name="canal-intento" value={c} checked={permitido} disabled={!permitido} readOnly className="size-5 accent-brand-500" />
                    <span>
                      <span className="block font-bold">{TEXTO_CANAL[c]}</span>
                      <span className="block text-caption">{permitido ? 'Canal preferido' : 'No es el preferido'}</span>
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <fieldset className="mb-4">
            <legend className="mb-1.5 text-small font-bold text-navy-700">¿Cómo te fue?</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {RESULTADOS.map((r) => (
                <label
                  key={r}
                  className={cn(
                    'flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border-2 p-3 transition-colors',
                    resultado === r ? 'border-brand-500 bg-brand-50' : 'border-line hover:border-navy-300',
                  )}
                >
                  <input
                    type="radio"
                    name="resultado-intento"
                    value={r}
                    checked={resultado === r}
                    onChange={() => setResultado(r)}
                    aria-describedby={errorResultado ? 'error-resultado-intento' : undefined}
                    className="size-5 accent-brand-500"
                  />
                  <span className="font-bold text-navy-700">{TEXTO_RESULTADO_INTENTO[r]}</span>
                </label>
              ))}
            </div>
            {errorResultado ? (
              <p id="error-resultado-intento" role="alert" className="mt-1.5 text-small text-status-danger">
                {errorResultado}
              </p>
            ) : null}
          </fieldset>

          <Button type="submit" loading={registrar.isPending} loadingText="Registrando…">
            Registrar intento
          </Button>
        </form>
      ) : null}
    </section>
  );
}

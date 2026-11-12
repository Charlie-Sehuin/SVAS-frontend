import { useEffect, useId, useRef, useState, type CSSProperties } from 'react';
import { AlertCircle, Lock } from 'lucide-react';
import { useDebouncedValue } from '../../../shared/hooks/useDebouncedValue';
import { aDecimal, formatearMonto } from '../../../shared/lib/format';
import type { RangoSuma } from '../../../shared/types/api';
import { Input } from '../../../shared/ui/input';

/** "15000.00" → "15000"; "15000.50" se conserva. Solo es texto de un campo, no un cálculo. */
const comoTexto = (monto: string) => monto.replace(/\.00$/, '');

/** `true` si el texto es un monto con hasta 2 decimales. */
const esMontoValido = (texto: string) => /^\d{1,10}(\.\d{1,2})?$/.test(texto);

const dentroDelRango = (texto: string, rango: RangoSuma) =>
  esMontoValido(texto) && aDecimal(texto).gte(rango.minima) && aDecimal(texto).lte(rango.maxima);

const iguales = (a: string, b: string) => esMontoValido(a) && esMontoValido(b) && aDecimal(a).eq(b);

interface Props {
  aseguradora: string;
  /** Límites que ESA aseguradora permite para este modelo y año (RN-37). */
  rango: RangoSuma;
  /** Suma vigente que devolvió el backend. */
  suma: string;
  /** Hay un recálculo en curso para esta aseguradora. */
  pendiente: boolean;
  /** Si hay texto, el control está deshabilitado y lo explica (409: compra en curso). */
  bloqueada?: string | null;
  /**
   * Se llama cuando la persona deja de mover el control y el valor es válido. Devuelve `true` si el backend lo aceptó;
   * con `false` (p. ej. 400 por rango) el campo vuelve a la suma vigente.
   */
  onCommit: (suma: string) => Promise<boolean>;
}

/**
 * Control de suma asegurada de UNA aseguradora (RN-37, diseño §8.3): slider + campo numérico sincronizados entre el
 * mínimo y el máximo de su rango. Espera 400 ms sin cambios (debounce) y recién entonces pide el recálculo al backend.
 *
 * Regla de oro (arquitectura §1): NUNCA se calcula una prima aquí. Mientras llega la respuesta, el padre muestra un
 * esqueleto en lugar del monto; este control solo mueve la suma y pide.
 */
export function SumaAseguradaControl({ aseguradora, rango, suma, pendiente, bloqueada, onCommit }: Props) {
  const id = useId();
  const [borrador, setBorrador] = useState(comoTexto(suma));
  const diferido = useDebouncedValue(borrador, 400);
  /** La suma vigente de la última vez que se miró y el último valor que se pidió al backend (aceptado o no). */
  const vigenteAnterior = useRef(suma);
  const ultimoPedido = useRef<string | null>(null);

  // Cuando el backend confirma una suma nueva, el campo la refleja, salvo que la persona ya se haya movido a otro valor.
  useEffect(() => {
    const sinTocar =
      !esMontoValido(borrador) ||
      iguales(borrador, vigenteAnterior.current) ||
      (ultimoPedido.current !== null && iguales(borrador, ultimoPedido.current));
    vigenteAnterior.current = suma;
    if (sinTocar) setBorrador(comoTexto(suma));
  }, [suma]);

  const valido = dentroDelRango(borrador, rango);
  const fueraDeRango = borrador !== '' && esMontoValido(borrador) && !valido;

  // Pide el recálculo cuando el valor se estabilizó, es válido y es distinto de lo vigente. Mientras hay uno en curso
  // no se pide otro: al terminar, este efecto vuelve a evaluar y pide el último valor. Un valor que ya se pidió (y que el
  // backend aceptó o rechazó) no se vuelve a pedir hasta que la persona lo cambie: así un 400 no provoca reintentos sin fin.
  useEffect(() => {
    if (bloqueada || pendiente) return;
    if (!dentroDelRango(diferido, rango) || iguales(diferido, suma)) return;
    if (ultimoPedido.current !== null && iguales(diferido, ultimoPedido.current)) return;
    ultimoPedido.current = diferido;
    void onCommit(diferido.includes('.') ? diferido : `${diferido}.00`).then((aceptada) => {
      if (!aceptada) setBorrador(comoTexto(vigenteAnterior.current));
    });
  }, [diferido, pendiente, bloqueada, suma, rango.minima, rango.maxima]);

  const minimo = Number(rango.minima);
  const maximo = Number(rango.maxima);
  const posicion = esMontoValido(borrador) ? Math.min(Math.max(Number(borrador), minimo), maximo) : Number(suma);
  const porcentaje = maximo > minimo ? ((posicion - minimo) / (maximo - minimo)) * 100 : 0; // solo dibuja la pista

  const alMoverSlider = (valor: string) => {
    if ((Number(valor) === minimo || Number(valor) === maximo) && Number(valor) !== Number(borrador)) navigator.vibrate?.(15);
    ultimoPedido.current = null; // la persona movió el control: puede volver a pedirse cualquier valor
    setBorrador(valor);
  };

  const mensajeRango = `La suma asegurada de ${aseguradora} debe estar entre ${formatearMonto(rango.minima, 'USD', 0)} y ${formatearMonto(rango.maxima, 'USD', 0)}.`;

  return (
    <div role="group" aria-labelledby={`${id}-titulo`} className="rounded-xl bg-surface-muted p-3">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <p id={`${id}-titulo`} className="text-small font-bold text-navy-700">
          {aseguradora} · Suma asegurada
        </p>
        {pendiente ? (
          <span role="status" className="text-small text-ink-soft">
            Recalculando…
          </span>
        ) : null}
      </div>

      <div className="flex items-center gap-3">
        <span className="hidden text-small text-ink-soft tabular sm:inline">{formatearMonto(rango.minima, 'USD', 0)}</span>
        <input
          type="range"
          className="suma-slider min-w-0 flex-1"
          min={minimo}
          max={maximo}
          step={100}
          value={posicion}
          disabled={!!bloqueada}
          aria-label={`Suma asegurada de ${aseguradora}`}
          aria-valuetext={esMontoValido(borrador) ? formatearMonto(borrador, 'USD', 0) : formatearMonto(suma, 'USD', 0)}
          style={{ '--pct': `${porcentaje}%` } as CSSProperties}
          onChange={(e) => alMoverSlider(e.target.value)}
        />
        <span className="hidden text-small text-ink-soft tabular sm:inline">{formatearMonto(rango.maxima, 'USD', 0)}</span>
        <div className="flex w-36 items-center">
          <span aria-hidden className="flex h-11 items-center rounded-l-lg border border-r-0 border-line bg-surface px-2 text-small text-ink-soft">
            USD
          </span>
          <Input
            inputMode="numeric"
            autoComplete="off"
            aria-label={`Suma asegurada de ${aseguradora}, en dólares`}
            aria-describedby={fueraDeRango ? `${id}-rango` : undefined}
            invalid={fueraDeRango}
            disabled={!!bloqueada}
            value={borrador}
            className="h-11 rounded-l-none font-money tabular"
            onChange={(e) => {
              const t = e.target.value.replace(',', '.');
              if (t === '' || /^\d{0,10}(\.\d{0,2})?$/.test(t)) {
                ultimoPedido.current = null; // la persona escribió: puede volver a pedirse cualquier valor
                setBorrador(t);
              }
            }}
          />
        </div>
      </div>

      <p className="mt-1 text-small text-ink-soft sm:hidden">
        Rango permitido: {formatearMonto(rango.minima, 'USD', 0)} – {formatearMonto(rango.maxima, 'USD', 0)}
      </p>

      {fueraDeRango ? (
        <p id={`${id}-rango`} role="alert" className="mt-1.5 flex items-start gap-1.5 text-small text-status-danger">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>{mensajeRango}</span>
        </p>
      ) : null}

      {bloqueada ? (
        <p role="status" className="mt-1.5 flex items-start gap-1.5 text-small text-ink-soft">
          <Lock className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>{bloqueada}</span>
        </p>
      ) : null}
    </div>
  );
}

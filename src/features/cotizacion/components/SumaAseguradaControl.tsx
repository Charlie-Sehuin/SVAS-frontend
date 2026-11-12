import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from 'react';
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

const iguales = (a: string | null, b: string | null) => a !== null && b !== null && esMontoValido(a) && esMontoValido(b) && aDecimal(a).eq(b);

interface Props {
  titulo: string;
  /** Límites entre los que se puede mover la barra. */
  rango: RangoSuma;
  /** La suma que ya se aplicó, o `null` si todavía no se eligió una (cada aseguradora usa la suya). */
  suma: string | null;
  /** Hay un recálculo en curso. */
  pendiente: boolean;
  /** Si hay texto, el control está deshabilitado y lo explica (409: compra en curso; o ya comprada). */
  bloqueada?: string | null;
  /** Texto de ayuda bajo la barra. */
  ayuda?: ReactNode;
  /**
   * Se llama cuando la persona deja de mover el control y el valor es válido. Devuelve `true` si se aplicó; con `false`
   * (p. ej. el backend lo rechazó) el campo vuelve a la suma vigente.
   */
  onCommit: (suma: string) => Promise<boolean>;
}

/**
 * Control de suma asegurada (RN-37, diseño §8.3): slider + campo numérico sincronizados. Espera 400 ms sin cambios
 * (debounce) y recién entonces avisa a quien lo usa. Es UNA sola barra para toda la cotización: el padre reparte la suma
 * entre las aseguradoras (cada una con su rango) y el backend recalcula.
 *
 * Regla de oro (arquitectura §1): NUNCA se calcula una prima aquí. Mientras llega la respuesta, el padre muestra un
 * esqueleto en lugar del monto; este control solo mueve la suma y pide.
 */
export function SumaAseguradaControl({ titulo, rango, suma, pendiente, bloqueada, ayuda, onCommit }: Props) {
  const id = useId();
  const [borrador, setBorrador] = useState(suma ? comoTexto(suma) : '');
  const diferido = useDebouncedValue(borrador, 400);
  /** La suma vigente de la última vez que se miró y el último valor que se pidió (aceptado o no). */
  const vigenteAnterior = useRef(suma);
  const ultimoPedido = useRef<string | null>(null);

  // Cuando se confirma una suma nueva, el campo la refleja, salvo que la persona ya se haya movido a otro valor.
  useEffect(() => {
    const sinTocar =
      !esMontoValido(borrador) ||
      iguales(borrador, vigenteAnterior.current) ||
      (ultimoPedido.current !== null && iguales(borrador, ultimoPedido.current));
    vigenteAnterior.current = suma;
    if (sinTocar) setBorrador(suma ? comoTexto(suma) : '');
  }, [suma]);

  const valido = dentroDelRango(borrador, rango);
  const fueraDeRango = borrador !== '' && esMontoValido(borrador) && !valido;

  // Avisa cuando el valor se estabilizó, es válido y es distinto de lo vigente. Mientras hay uno en curso no se pide
  // otro: al terminar, este efecto vuelve a evaluar. Un valor que ya se pidió (aceptado o rechazado) no se vuelve a pedir
  // hasta que la persona lo cambie: así un rechazo no provoca reintentos sin fin.
  useEffect(() => {
    if (bloqueada || pendiente) return;
    if (!dentroDelRango(diferido, rango) || iguales(diferido, suma)) return;
    if (ultimoPedido.current !== null && iguales(diferido, ultimoPedido.current)) return;
    ultimoPedido.current = diferido;
    void onCommit(diferido.includes('.') ? diferido : `${diferido}.00`).then((aceptada) => {
      if (!aceptada) setBorrador(vigenteAnterior.current ? comoTexto(vigenteAnterior.current) : '');
    });
  }, [diferido, pendiente, bloqueada, suma, rango.minima, rango.maxima]);

  const minimo = Number(rango.minima);
  const maximo = Number(rango.maxima);
  // Solo coloca el asa y dibuja el tramo relleno; no es un cálculo de dinero. Sin suma elegida, el asa descansa al centro.
  const posicion = esMontoValido(borrador)
    ? Math.min(Math.max(Number(borrador), minimo), maximo)
    : suma
      ? Number(suma)
      : (minimo + maximo) / 2;
  const porcentaje = maximo > minimo ? ((posicion - minimo) / (maximo - minimo)) * 100 : 0;

  const alMoverSlider = (valor: string) => {
    if ((Number(valor) === minimo || Number(valor) === maximo) && Number(valor) !== Number(borrador)) navigator.vibrate?.(15);
    ultimoPedido.current = null; // la persona movió el control: puede volver a pedirse cualquier valor
    setBorrador(valor);
  };

  const mensajeRango = `La suma asegurada debe estar entre ${formatearMonto(rango.minima, 'USD', 0)} y ${formatearMonto(rango.maxima, 'USD', 0)}.`;

  return (
    <div role="group" aria-labelledby={`${id}-titulo`} className="rounded-xl bg-surface-muted p-3 lg:p-4">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <p id={`${id}-titulo`} className="font-bold text-navy-700">
          {titulo}
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
          aria-label={titulo}
          aria-valuetext={esMontoValido(borrador) ? formatearMonto(borrador, 'USD', 0) : 'Sin elegir'}
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
            placeholder="Elige"
            aria-label={`${titulo}, en dólares`}
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
        Rango: {formatearMonto(rango.minima, 'USD', 0)} – {formatearMonto(rango.maxima, 'USD', 0)}
      </p>

      {ayuda && !fueraDeRango && !bloqueada ? <p className="mt-2 text-small text-ink-soft">{ayuda}</p> : null}

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

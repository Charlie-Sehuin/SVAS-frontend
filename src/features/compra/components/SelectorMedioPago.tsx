import { CreditCard, Smartphone } from 'lucide-react';
import { cn } from '../../../shared/lib/utils';

/**
 * Medio de pago que la persona elige en la pantalla de pago. Es solo de demostración: la pasarela es simulada, el
 * backend no recibe ni guarda el medio (solo el modo, único o cuotas) y no se pide ningún dato de tarjeta.
 */
export type MedioPago = 'TARJETA_CREDITO' | 'TARJETA_DEBITO' | 'YAPE' | 'PLIN';

const OPCIONES: { valor: MedioPago; titulo: string; ayuda: string; icono: typeof CreditCard }[] = [
  { valor: 'TARJETA_CREDITO', titulo: 'Tarjeta de crédito', ayuda: 'Visa, Mastercard y otras.', icono: CreditCard },
  { valor: 'TARJETA_DEBITO', titulo: 'Tarjeta de débito', ayuda: 'Se descuenta de tu cuenta al instante.', icono: CreditCard },
  { valor: 'YAPE', titulo: 'Yape', ayuda: 'Billetera digital.', icono: Smartphone },
  { valor: 'PLIN', titulo: 'Plin', ayuda: 'Billetera digital.', icono: Smartphone },
];

/** Tarjeta ficticia de las pasarelas de prueba: se muestra, no se escribe nada. */
const TARJETA_DE_PRUEBA = { numero: '4111 1111 1111 1111', vence: '12/30', cvv: '123' };

export const TEXTO_MEDIO_PAGO: Record<MedioPago, string> = {
  TARJETA_CREDITO: 'tarjeta de crédito',
  TARJETA_DEBITO: 'tarjeta de débito',
  YAPE: 'Yape',
  PLIN: 'Plin',
};

interface Props {
  valor: MedioPago;
  onChange: (medio: MedioPago) => void;
  deshabilitado?: boolean;
}

/** Cuatro tarjetas-radio (crédito, débito, Yape, Plin) y, debajo, qué se simula con el medio elegido. */
export function SelectorMedioPago({ valor, onChange, deshabilitado = false }: Props) {
  const esTarjeta = valor === 'TARJETA_CREDITO' || valor === 'TARJETA_DEBITO';

  const tarjeta = (activa: boolean) =>
    cn(
      'flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border-2 bg-surface p-3 transition-colors',
      'has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand-300',
      activa ? 'border-brand-500 bg-brand-50' : 'border-line hover:border-navy-300',
      deshabilitado && 'cursor-not-allowed opacity-60',
    );

  return (
    <fieldset className="mt-6 space-y-3" disabled={deshabilitado}>
      <legend className="mb-2 text-h3 text-navy-700">¿Con qué medio pagas?</legend>

      <div className="grid gap-3 sm:grid-cols-2">
        {OPCIONES.map(({ valor: v, titulo, ayuda, icono: Icono }) => (
          <label key={v} className={tarjeta(valor === v)}>
            <input
              type="radio"
              name="medio-pago"
              value={v}
              checked={valor === v}
              onChange={() => onChange(v)}
              className="size-5 accent-brand-500"
            />
            <Icono className="size-6 shrink-0 text-navy-700" aria-hidden />
            <span className="flex-1">
              <span className="block font-bold text-navy-700">{titulo}</span>
              <span className="block text-small text-ink-soft">{ayuda}</span>
            </span>
          </label>
        ))}
      </div>

      <div className="rounded-xl border border-dashed border-line bg-surface-muted p-4 text-small text-ink">
        {esTarjeta ? (
          <>
            <p className="font-bold text-navy-700">Tarjeta de prueba ya cargada</p>
            <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
              <dt className="text-ink-soft">Número</dt>
              <dd className="font-mono">{TARJETA_DE_PRUEBA.numero}</dd>
              <dt className="text-ink-soft">Vence</dt>
              <dd className="font-mono">{TARJETA_DE_PRUEBA.vence}</dd>
              <dt className="text-ink-soft">CVV</dt>
              <dd className="font-mono">{TARJETA_DE_PRUEBA.cvv}</dd>
            </dl>
            <p className="mt-2 text-ink-soft">Solo confirma el pago. No escribas los datos de tu tarjeta real: aquí no se pide ninguno.</p>
          </>
        ) : (
          <p>
            Simularemos la aprobación desde <strong>{TEXTO_MEDIO_PAGO[valor]}</strong>. No necesitas abrir la app ni escribir tu número.
          </p>
        )}
      </div>
    </fieldset>
  );
}

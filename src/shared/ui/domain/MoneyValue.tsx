import { cn } from '../../lib/utils';
import { montoEnPalabras, partesMonto, type Moneda } from '../../lib/format';

interface MoneyValueProps {
  /** String decimal del backend ("640.40"). */
  value: string | number;
  moneda?: Moneda;
  /** `xl` = prima mensual protagonista; `md` = prima anual / desembolso; `inline` = dentro de texto. */
  size?: 'xl' | 'md' | 'inline';
  /** Sufijo visible, p. ej. "/ mes" o "al año". */
  sufijo?: string;
  /** Sufijo para lector de pantalla, p. ej. "al mes" (si difiere del visible). */
  sufijoAria?: string;
  /** Decimales visibles (por defecto 2). La lectura para pantalla siempre incluye los centavos. */
  decimales?: 0 | 2;
  className?: string;
}

/**
 * Único componente para montos (arquitectura §4.2, diseño §8.1): Inter
 * tabular, símbolo en peso 400 al 70 %, cifra en 700. El lector de pantalla
 * lee "53 dólares con 37 centavos al mes", no "USD 53.37".
 */
export function MoneyValue({ value, moneda = 'USD', size = 'inline', sufijo, sufijoAria, decimales = 2, className }: MoneyValueProps) {
  const { simbolo, cifra } = partesMonto(value, moneda, decimales);
  const aria = `${montoEnPalabras(value, moneda)}${sufijoAria ?? sufijo ? ` ${sufijoAria ?? sufijo}` : ''}`;
  const clases =
    size === 'xl'
      ? 'text-money-xl text-navy-700'
      : size === 'md'
        ? 'text-money-md text-ink-soft'
        : 'font-money tabular font-semibold';

  return (
    <span className={cn('inline-flex items-baseline gap-1 whitespace-nowrap', clases, className)} aria-label={aria}>
      <span aria-hidden className="font-normal text-[0.7em]">
        {simbolo}
      </span>
      <span aria-hidden>{cifra}</span>
      {sufijo ? (
        <span aria-hidden className="text-[0.7em] font-normal text-ink-soft">
          {sufijo}
        </span>
      ) : null}
    </span>
  );
}

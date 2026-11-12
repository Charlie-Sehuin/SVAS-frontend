import Decimal from 'decimal.js';

/**
 * Formateo (arquitectura §6.6 y §13): el frontend SOLO formatea. Nunca suma,
 * divide ni calcula primas, recargos ni desembolsos.
 */

export type Moneda = 'USD' | 'PEN';

const SIMBOLO: Record<Moneda, string> = { USD: 'USD', PEN: 'S/' };
const NOMBRE_MONEDA: Record<Moneda, { singular: string; plural: string; centavos: string }> = {
  USD: { singular: 'dólar', plural: 'dólares', centavos: 'centavos' },
  PEN: { singular: 'sol', plural: 'soles', centavos: 'céntimos' },
};

const numeroEs = new Intl.NumberFormat('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const enteroEs = new Intl.NumberFormat('es-PE', { maximumFractionDigits: 0 });

/** Convierte el string decimal del backend a Decimal. Lanza si no es numérico. */
export function aDecimal(valor: string | number): Decimal {
  return new Decimal(valor);
}

/** "640.40" → "640.40" con separador de miles: "1,250.00" (es-PE usa coma de miles y punto decimal). */
export function formatearNumero(valor: string | number, decimales = 2): string {
  const d = aDecimal(valor);
  return decimales === 0 ? enteroEs.format(d.toDecimalPlaces(0).toNumber()) : numeroEs.format(d.toNumber());
}

/** "640.40" → "USD 640.40". */
export function formatearMonto(valor: string | number, moneda: Moneda = 'USD', decimales = 2): string {
  return `${SIMBOLO[moneda]} ${formatearNumero(valor, decimales)}`;
}

/** Partes para <MoneyValue>: símbolo pequeño, cifra grande (diseño visual §8.1). */
export function partesMonto(valor: string | number, moneda: Moneda = 'USD', decimales = 2) {
  return { simbolo: SIMBOLO[moneda], cifra: formatearNumero(valor, decimales) };
}

/**
 * Monto en palabras para lectores de pantalla (accesibilidad §11):
 * "53.37" → "53 dólares con 37 centavos".
 */
export function montoEnPalabras(valor: string | number, moneda: Moneda = 'USD'): string {
  const d = aDecimal(valor).abs();
  const entero = d.floor();
  const centavos = d.minus(entero).times(100).round().toNumber();
  const n = NOMBRE_MONEDA[moneda];
  const parteEntera = `${enteroEs.format(entero.toNumber())} ${entero.eq(1) ? n.singular : n.plural}`;
  return centavos > 0 ? `${parteEntera} con ${centavos} ${n.centavos}` : parteEntera;
}

/** "5.00" → "5 %" ; "12.50" → "12.5 %" */
export function formatearPorcentaje(valor: string | number): string {
  const d = aDecimal(valor);
  return `${d.toDecimalPlaces(2).toString().replace('.', ',')} %`;
}

const ZONA = 'America/Lima';
const fechaCorta = new Intl.DateTimeFormat('es-PE', { timeZone: ZONA, day: '2-digit', month: 'short', year: 'numeric' });
const fechaLarga = new Intl.DateTimeFormat('es-PE', { timeZone: ZONA, day: 'numeric', month: 'long', year: 'numeric' });
const fechaHora = new Intl.DateTimeFormat('es-PE', {
  timeZone: ZONA,
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

/** ISO 8601 → "12 nov 2026" (zona America/Lima). */
export function formatearFecha(iso: string | Date, estilo: 'corta' | 'larga' | 'hora' = 'corta'): string {
  const fecha = typeof iso === 'string' ? new Date(iso) : iso;
  if (Number.isNaN(fecha.getTime())) return '';
  const fmt = estilo === 'larga' ? fechaLarga : estilo === 'hora' ? fechaHora : fechaCorta;
  return fmt.format(fecha).replace('.', '');
}

/** Tiempo relativo en lenguaje llano para colas ("hace 2 h", "hace 15 min"). */
export function tiempoTranscurrido(iso: string, ahora: Date = new Date()): string {
  const ms = ahora.getTime() - new Date(iso).getTime();
  const min = Math.max(0, Math.round(ms / 60_000));
  if (min < 1) return 'ahora';
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  return `hace ${d} d`;
}

/** El backend ya enmascara ("****5678"); esto es solo para datos propios en UI. */
export function enmascararDocumento(numero: string, visibles = 4): string {
  if (numero.length <= visibles) return numero;
  return `${'*'.repeat(numero.length - visibles)}${numero.slice(-visibles)}`;
}

/** Iniciales para el avatar del menú de cuenta. */
export function iniciales(nombreCompleto: string): string {
  return nombreCompleto
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

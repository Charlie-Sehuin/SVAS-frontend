import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import { isApiError } from './api-client';

/**
 * Asigna a cada campo el error por campo que devolvió el backend (RF-03,
 * arquitectura §9.4). Devuelve `true` si había errores por campo y se
 * asignaron; si no, el llamador muestra el `ErrorToast` con el mensaje.
 *
 * `mapa` traduce nombres del backend a nombres del formulario
 * (p. ej. `parametros.cargo_fijo_anual` → `cargoFijoAnual`).
 */
export function aplicarErroresBackend<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  campos: readonly string[],
  mapa: Record<string, string> = {},
): boolean {
  if (!isApiError(error) || error.errors.length === 0) return false;
  let alguno = false;
  for (const e of error.errors) {
    const destino = mapa[e.campo] ?? e.campo;
    if (campos.includes(destino)) {
      setError(destino as Path<T>, { type: 'server', message: e.mensaje });
      alguno = true;
    }
  }
  return alguno;
}

/** Arma un `searchParams` sin claves vacías (ky/URLSearchParams escribirían "undefined"). */
export function qs(params: Record<string, string | number | boolean | undefined | null>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') out[k] = String(v);
  }
  return out;
}

/** "0.0420" ↔ campo de texto. Acepta coma decimal (es-PE) y devuelve `null` si no es numérico. */
export function parseDecimal(texto: string): number | null {
  const limpio = texto.trim().replace(',', '.');
  if (limpio === '' || !/^-?\d+(\.\d+)?$/.test(limpio)) return null;
  return Number(limpio);
}

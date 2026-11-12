import { useEffect, useState } from 'react';

/** Devuelve `value` después de `delayMs` sin cambios (p. ej. slider de suma asegurada, 400 ms). */
export function useDebouncedValue<T>(value: T, delayMs = 400): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

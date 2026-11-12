/**
 * La suma que la persona eligió en la barra única de una cotización. Se guarda en sessionStorage para que un refresco no
 * la pierda: el backend solo guarda lo que aplicó a cada aseguradora (que puede ser un mínimo o un máximo ajustado), no
 * lo que se pidió. Es una comodidad de la pestaña: si falta, la barra vuelve al estado "sin elegir".
 */
const clave = (cotizacionId: string) => `svas.suma-elegida.${cotizacionId}`;

export function leerSumaElegida(cotizacionId: string): string | null {
  try {
    const v = sessionStorage.getItem(clave(cotizacionId));
    return v && /^\d{1,10}(\.\d{1,2})?$/.test(v) ? v : null;
  } catch {
    return null;
  }
}

export function guardarSumaElegida(cotizacionId: string, suma: string): void {
  try {
    sessionStorage.setItem(clave(cotizacionId), suma);
  } catch {
    /* sessionStorage puede no estar disponible */
  }
}

/**
 * Marca de que esta cotización se abrió desde un enlace de retoma (RN-12): al comprar, `POST /compras` lleva
 * `origen: 'RETOMA'` para que el reporte de retención atribuya la venta. Vive en sessionStorage, como el token.
 */
const clave = (cotizacionId: string) => `svas.origen-retoma.${cotizacionId}`;

export function marcarComoRetoma(cotizacionId: string): void {
  try {
    sessionStorage.setItem(clave(cotizacionId), '1');
  } catch {
    /* sin sessionStorage: se compra igual, solo sin el origen */
  }
}

export function vieneDeRetoma(cotizacionId: string): boolean {
  try {
    return sessionStorage.getItem(clave(cotizacionId)) === '1';
  } catch {
    return false;
  }
}

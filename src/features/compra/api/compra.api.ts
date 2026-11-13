import { api } from '../../../shared/lib/api-client';
import type {
  CamposFaltantesResponse,
  CrearCompraRequest,
  DatosCompraRequest,
  DatosCompraResponse,
  DescargaPdf,
  EstadoCompra,
  PagarRequest,
  PagoResponse,
  PolizaResumen,
  ResumenCompra,
  Warning,
} from '../../../shared/types/api';

/** Funciones puras sobre `api-client` (arquitectura §6.7). Solo el CLIENTE con sesión llama a estas rutas. */

export const obtenerResumenCompra = (cotizacionId: string, primaCotizadaId: string) =>
  api.get('compras/resumen', { searchParams: { cotizacionId, primaCotizadaId } }).json<ResumenCompra>();

export const obtenerCamposFaltantes = (cotizacionId: string) =>
  api.get(`compras/${cotizacionId}/campos-faltantes`).json<CamposFaltantesResponse>();

export const guardarDatosCompra = (cotizacionId: string, body: DatosCompraRequest) =>
  api.put(`compras/${cotizacionId}/datos`, { json: body }).json<DatosCompraResponse>();

export const crearCompra = (body: CrearCompraRequest) => api.post('compras', { json: body }).json<EstadoCompra>();

/** `Idempotency-Key`: una por intento de pago; repetir la misma devuelve el mismo resultado sin cobrar dos veces. */
export const pagarCompra = (ordenId: string, body: PagarRequest, idempotencyKey: string) =>
  api
    .post(`compras/${ordenId}/pago`, { json: body, headers: { 'Idempotency-Key': idempotencyKey } })
    .json<PagoResponse>();

export const obtenerEstadoCompra = (ordenId: string) => api.get(`compras/${ordenId}/estado`).json<EstadoCompra>();

export const listarMisPolizas = () => api.get('polizas/mias').json<PolizaResumen[]>();

/** Nombre del archivo desde `Content-Disposition` (`poliza-<numero>.pdf`). */
function nombreDesdeCabecera(valor: string | null, respaldo: string): string {
  const m = valor ? /filename="?([^";]+)"?/i.exec(valor) : null;
  return m?.[1] ?? respaldo;
}

/** 200 → el PDF; 202 → todavía se genera (la compra ya está confirmada y el backend lo reintenta). */
export async function descargarPdfPoliza(polizaId: string, respaldo = 'poliza.pdf'): Promise<DescargaPdf> {
  const res = await api.get(`polizas/${polizaId}/pdf`);
  if (res.status === 202) {
    const cuerpo = (await res.json()) as { warning: Warning };
    return { listo: false, warning: cuerpo.warning };
  }
  return { listo: true, blob: await res.blob(), nombreArchivo: nombreDesdeCabecera(res.headers.get('Content-Disposition'), respaldo) };
}

import { api } from '../../../shared/lib/api-client';
import type {
  AceptacionResponse,
  CerrarSeguimientoRequest,
  CerrarSeguimientoResponse,
  DescuentoDelCaso,
  DescuentoRequest,
  RegistrarIntentoRequest,
  RegistrarIntentoResponse,
  ResultadoSolicitudRequest,
  ResultadoSolicitudResponse,
  RetomaResponse,
  SeguimientoDetalle,
  SeguimientoEnLista,
  SolicitarAsesoriaRequest,
  SolicitudCreada,
  SolicitudDetalle,
  SolicitudEnCola,
  TomarSolicitudResponse,
} from '../../../shared/types/api';
import type { EstadoSeguimiento, EstadoSolicitudAsesoria, OrigenCaso } from '../../../shared/types/enums';

/** Funciones puras sobre `api-client` (arquitectura §6.7). El frontend nunca aplica reglas de negocio: pide y muestra. */

/* ───────────── Cliente (CU-03) ───────────── */

/** El CLIENTE dueño de la cotización pide hablar con un asesor. */
export const solicitarAsesoria = (body: SolicitarAsesoriaRequest) => api.post('asesorias', { json: body }).json<SolicitudCreada>();

/* ───────────── Asesor (CU-03) ───────────── */

export const listarCola = (filtros: { estado?: EstadoSolicitudAsesoria | undefined; origen?: OrigenCaso | undefined }) => {
  const searchParams: Record<string, string> = {};
  if (filtros.estado) searchParams.estado = filtros.estado;
  if (filtros.origen) searchParams.origen = filtros.origen;
  return api.get('asesorias/cola', { searchParams }).json<SolicitudEnCola[]>();
};

export const obtenerSolicitud = (id: string) => api.get(`asesorias/${id}`).json<SolicitudDetalle>();

/** 409 si otro asesor la tomó antes. */
export const tomarSolicitud = (id: string) => api.post(`asesorias/${id}/tomar`).json<TomarSolicitudResponse>();

export const aplicarDescuento = (id: string, body: DescuentoRequest) =>
  api.post(`asesorias/${id}/descuentos`, { json: body }).json<DescuentoDelCaso>();

export const cerrarSolicitud = (id: string, body: ResultadoSolicitudRequest) =>
  api.post(`asesorias/${id}/resultado`, { json: body }).json<ResultadoSolicitudResponse>();

/* ───────────── Seguimientos (CU-04) ───────────── */

export const listarSeguimientos = (estado?: EstadoSeguimiento) =>
  api.get('seguimientos', { searchParams: estado ? { estado } : {} }).json<SeguimientoEnLista[]>();

export const obtenerSeguimiento = (id: string) => api.get(`seguimientos/${id}`).json<SeguimientoDetalle>();

export const registrarIntento = (id: string, body: RegistrarIntentoRequest) =>
  api.post(`seguimientos/${id}/intentos`, { json: body }).json<RegistrarIntentoResponse>();

/** El cliente aceptó por teléfono: reenvía el enlace de compra. */
export const registrarAceptacion = (id: string) => api.post(`seguimientos/${id}/aceptacion`).json<AceptacionResponse>();

export const cerrarSeguimiento = (id: string, body: CerrarSeguimientoRequest) =>
  api.post(`seguimientos/${id}/cierre`, { json: body }).json<CerrarSeguimientoResponse>();

/* ───────────── Retoma (RN-12) ───────────── */

/** Público. El enlace es de un solo uso: el `tokenAcceso` que devuelve sale una única vez. */
export const resolverRetoma = (token: string) => api.get(`retoma/${encodeURIComponent(token)}`).json<RetomaResponse>();

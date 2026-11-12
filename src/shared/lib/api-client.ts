import ky, { isHTTPError, isNetworkError, isTimeoutError, type KyInstance } from 'ky';
import type { ErrorBackend, ErrorCampo } from '../types/api/comunes.types';
import { cotizacionIdDesdeUrl, useCotizacionTokenStore } from '../stores/useCotizacionTokenStore';
import { useWakeUpStore } from '../stores/useWakeUpStore';
import { getAccessToken, getSupabase, supabaseConfigurado } from './supabase';

/**
 * Error tipado que ve toda la app (arquitectura §6.6). `message` es el texto
 * del backend tal cual (se muestra sin traducir); `correlationId` se ofrece
 * copiable en el detalle del ErrorToast.
 */
export class ApiError extends Error {
  readonly statusCode: number;
  readonly errors: ErrorCampo[];
  readonly correlationId: string | null;
  readonly code: string | null;

  constructor(cuerpo: Partial<ErrorBackend> & { statusCode: number; message: string }, code: string | null = null) {
    super(cuerpo.message);
    this.name = 'ApiError';
    this.statusCode = cuerpo.statusCode;
    this.errors = cuerpo.errors ?? [];
    this.correlationId = cuerpo.correlationId ?? null;
    this.code = code;
  }

  get esValidacion() {
    return this.statusCode === 400 && this.errors.length > 0;
  }
}

export function isApiError(e: unknown): e is ApiError {
  return e instanceof ApiError;
}

const WAKE_UP_MS = 4000;
const WAKE_UP_SIGNAL = Symbol('wakeUpTimer');

type RequestConTimer = Request & { [WAKE_UP_SIGNAL]?: ReturnType<typeof setTimeout> };

/** Mensaje de red en lenguaje llano (voz y tono §14). */
const MENSAJE_SIN_CONEXION = 'No pudimos conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.';
const MENSAJE_TIEMPO = 'El servidor tardó demasiado en responder. Inténtalo de nuevo en unos segundos.';

/** ky 2 ya leyó el cuerpo: viene en `error.data` (objeto si era JSON, string si no). */
async function cuerpoDeError(data: unknown, res: Response): Promise<Partial<ErrorBackend>> {
  if (data && typeof data === 'object') return data as Partial<ErrorBackend>;
  if (typeof data === 'string' && data.trim().startsWith('{')) {
    try {
      return JSON.parse(data) as Partial<ErrorBackend>;
    } catch {
      /* no era JSON */
    }
  }
  if (!res.bodyUsed) {
    try {
      const leido: unknown = await res.clone().json();
      if (leido && typeof leido === 'object') return leido as Partial<ErrorBackend>;
    } catch {
      /* sin cuerpo JSON */
    }
  }
  return {};
}

/** Intenta deducir un código de negocio desde el mensaje ("COMPARAR_MAXIMO_3", etc.). */
function codigoDesdeMensaje(mensaje: string): string | null {
  const m = /\b([A-Z][A-Z0-9]+(?:_[A-Z0-9]+)+)\b/.exec(mensaje);
  return m?.[1] ?? null;
}

export const api: KyInstance = ky.create({
  prefix: import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1',
  timeout: 30_000,
  retry: { limit: 1, methods: ['get'] },
  hooks: {
    beforeRequest: [
      async ({ request }) => {
        // Autorización: Bearer si hay sesión; si no, X-Cotizacion-Token cuando la
        // ruta es de una cotización concreta (doc conexión §2).
        const token = await getAccessToken();
        if (token) {
          request.headers.set('Authorization', `Bearer ${token}`);
        } else {
          const cotizacionId = cotizacionIdDesdeUrl(request.url);
          const tokenCotizacion = cotizacionId ? useCotizacionTokenStore.getState().obtener(cotizacionId) : null;
          if (tokenCotizacion) request.headers.set('X-Cotizacion-Token', tokenCotizacion);
        }
        // Aviso de "despertando el servidor" (plan gratuito, doc conexión §1).
        (request as RequestConTimer)[WAKE_UP_SIGNAL] = setTimeout(
          () => useWakeUpStore.getState().marcarDespertando(),
          WAKE_UP_MS,
        );
      },
    ],
    afterResponse: [
      async ({ request, response }) => {
        clearTimeout((request as RequestConTimer)[WAKE_UP_SIGNAL]);
        if (response.status < 500) useWakeUpStore.getState().marcarRespondio();

        // 401 con sesión: refrescar una sola vez y reintentar (arquitectura §6.6).
        if (
          response.status === 401 &&
          supabaseConfigurado &&
          request.headers.has('Authorization') &&
          !request.headers.has('X-Reintento-Refresh')
        ) {
          const supabase = await getSupabase();
          const { data, error } = await supabase.auth.refreshSession();
          const nuevo = data.session?.access_token;
          if (!error && nuevo) {
            const reintento = new Request(request, { headers: new Headers(request.headers) });
            reintento.headers.set('Authorization', `Bearer ${nuevo}`);
            reintento.headers.set('X-Reintento-Refresh', '1');
            return fetch(reintento);
          }
        }
        return response;
      },
    ],
    beforeError: [
      async ({ error }) => {
        if (isHTTPError(error)) {
          const cuerpo = await cuerpoDeError(error.data, error.response);
          const message =
            cuerpo.message ??
            (error.response.status >= 500
              ? 'Ocurrió un error en el servidor. Inténtalo de nuevo en unos minutos.'
              : error.response.statusText || 'Error inesperado');
          return new ApiError(
            { ...cuerpo, statusCode: error.response.status, message },
            codigoDesdeMensaje(message),
          );
        }
        if (isTimeoutError(error)) return new ApiError({ statusCode: 0, message: MENSAJE_TIEMPO }, 'TIMEOUT');
        if (isNetworkError(error)) return new ApiError({ statusCode: 0, message: MENSAJE_SIN_CONEXION }, 'SIN_CONEXION');
        return error;
      },
    ],
  },
});

/** Genera la `Idempotency-Key` de un intento de pago (una por intento, §9.1). */
export function nuevaIdempotencyKey(): string {
  return crypto.randomUUID();
}

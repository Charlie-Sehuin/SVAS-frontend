import { QueryClient } from '@tanstack/react-query';
import { isApiError } from './api-client';

/** Política global (arquitectura §9.1): retry 1 en GET, 0 en mutaciones. */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: (fallos, error) => {
        // No reintentar errores del cliente (400, 401, 403, 404, 409, 422, 429).
        if (isApiError(error) && error.statusCode >= 400 && error.statusCode < 500) return false;
        return fallos < 1;
      },
      refetchOnWindowFocus: false,
    },
    mutations: { retry: 0 },
  },
});

/** staleTime por tipo de dato (arquitectura §9.1). */
export const STALE = {
  catalogo: 10 * 60_000,
  catalogoVehiculos: 60 * 60_000,
  resumenCotizacion: 30_000,
  colas: 15_000,
  contenidoPlanes: 10 * 60_000,
} as const;

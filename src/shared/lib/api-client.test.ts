import { describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../../test/msw/server';
import { API } from '../../test/msw/handlers';
import { api, ApiError, isApiError } from './api-client';
import { useCotizacionTokenStore } from '../stores/useCotizacionTokenStore';
import type { CatalogoCampos, HealthLive } from '../types/api';

describe('api-client', () => {
  it('lee JSON de la API con prefixUrl', async () => {
    const r = await api.get('health/live').json<HealthLive>();
    expect(r.status).toBe('ok');
    const c = await api.get('catalogo/campos').json<CatalogoCampos>();
    expect(c.aseguradoras).toHaveLength(5);
    expect(c.campos.find((x) => x.nombre === 'ubigeo')?.aseguradoras).toContain('Pacífico');
  });

  it('convierte el error del backend en ApiError con message, errors y correlationId', async () => {
    server.use(
      http.post(`${API}/cotizaciones`, () =>
        HttpResponse.json(
          {
            statusCode: 400,
            message: 'Pacífico necesita el distrito para cotizarte',
            errors: [{ campo: 'distrito', mensaje: 'Es obligatorio para Pacífico' }],
            correlationId: 'corr-123',
          },
          { status: 400 },
        ),
      ),
    );
    const error = await api.post('cotizaciones', { json: {} }).json().catch((e: unknown) => e);
    expect(isApiError(error)).toBe(true);
    const e = error as ApiError;
    expect(e.statusCode).toBe(400);
    expect(e.message).toBe('Pacífico necesita el distrito para cotizarte');
    expect(e.errors[0]?.campo).toBe('distrito');
    expect(e.correlationId).toBe('corr-123');
    expect(e.esValidacion).toBe(true);
  });

  it('deduce el código de negocio del mensaje cuando viene en MAYÚSCULAS_CON_GUION', async () => {
    server.use(
      http.get(`${API}/planes/comparar`, () =>
        HttpResponse.json({ statusCode: 400, message: 'COMPARAR_MAXIMO_3: solo puedes comparar hasta 3 planes' }, { status: 400 }),
      ),
    );
    const e = (await api.get('planes/comparar').json().catch((x: unknown) => x)) as ApiError;
    expect(e.code).toBe('COMPARAR_MAXIMO_3');
  });

  it('envía X-Cotizacion-Token cuando la ruta es de una cotización con token guardado', async () => {
    const id = '7f1a2b3c-4d5e-4f60-8a7b-9c0d1e2f3a4b';
    useCotizacionTokenStore.getState().guardar(id, 'tok-abc');
    let header: string | null = null;
    server.use(
      http.get(`${API}/cotizaciones/${id}/resumen`, ({ request }) => {
        header = request.headers.get('X-Cotizacion-Token');
        return HttpResponse.json({ id });
      }),
    );
    await api.get(`cotizaciones/${id}/resumen`).json();
    expect(header).toBe('tok-abc');
  });

  it('con sesión manda el Bearer Y el token de la cotización (el backend usa el token si el usuario no es el dueño)', async () => {
    const id = '8a1b2c3d-4e5f-4a60-8b7c-0d1e2f3a4b5c';
    useCotizacionTokenStore.getState().guardar(id, 'tok-xyz');
    const supabase = await import('./supabase');
    const espia = vi.spyOn(supabase, 'getAccessToken').mockResolvedValue('jwt-de-prueba');
    let cabeceras: { auth: string | null; token: string | null } = { auth: null, token: null };
    server.use(
      http.get(`${API}/cotizaciones/${id}/resumen`, ({ request }) => {
        cabeceras = { auth: request.headers.get('Authorization'), token: request.headers.get('X-Cotizacion-Token') };
        return HttpResponse.json({ id });
      }),
    );
    await api.get(`cotizaciones/${id}/resumen`).json();
    espia.mockRestore();
    expect(cabeceras).toEqual({ auth: 'Bearer jwt-de-prueba', token: 'tok-xyz' });
  });

  it('en 500 sin cuerpo da un mensaje llano', async () => {
    server.use(http.get(`${API}/health/ready`, () => new HttpResponse(null, { status: 503 })));
    const e = (await api.get('health/ready').json().catch((x: unknown) => x)) as ApiError;
    expect(e.statusCode).toBe(503);
    expect(e.message).toMatch(/servidor/i);
  });
});

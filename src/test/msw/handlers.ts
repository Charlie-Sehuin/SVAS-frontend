import { http, HttpResponse } from 'msw';
import type { CatalogoCampos, HealthLive, HealthReady, Usuario } from '../../shared/types/api';

/** Base de la API en los mocks: la misma que lee el api-client. */
export const API = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1';

/** Formas reales del backend (doc conexión §6). Se amplían ola por ola. */
const TODAS = ['Rímac', 'Pacífico', 'La Positiva', 'Mapfre', 'Qualitas'];

export const catalogoCamposMock: CatalogoCampos = {
  aseguradoras: [
    { id: '11111111-1111-4111-8111-111111111111', nombre: 'Rímac' },
    { id: '22222222-2222-4222-8222-222222222222', nombre: 'Pacífico' },
    { id: '33333333-3333-4333-8333-333333333333', nombre: 'La Positiva' },
    { id: '44444444-4444-4444-8444-444444444444', nombre: 'Mapfre' },
    { id: '55555555-5555-4555-8555-555555555555', nombre: 'Qualitas' },
  ],
  // Lo que devuelve `GET /catalogo/campos` hoy (seed 0016): el tipo de vehículo no se pregunta y el contacto no es un campo.
  campos: [
    { nombre: 'marca', tipo: 'LISTA', obligatorio: true, origenValores: 'CATALOGO', valoresPermitidos: [], aseguradoras: TODAS },
    { nombre: 'modelo', tipo: 'LISTA', obligatorio: true, origenValores: 'CATALOGO', valoresPermitidos: [], aseguradoras: TODAS },
    { nombre: 'anio', tipo: 'LISTA', obligatorio: true, origenValores: 'CATALOGO', valoresPermitidos: [], aseguradoras: TODAS },
    { nombre: 'ubigeo', tipo: 'LISTA', obligatorio: true, origenValores: 'CATALOGO', valoresPermitidos: [], aseguradoras: ['Pacífico', 'La Positiva'] },
    { nombre: 'clase', tipo: 'LISTA', obligatorio: false, origenValores: 'ESTATICO', valoresPermitidos: ['Automóvil', 'Camioneta', 'Station wagon'], aseguradoras: ['La Positiva', 'Qualitas'] },
    { nombre: 'placa', tipo: 'TEXTO', obligatorio: false, origenValores: 'ESTATICO', valoresPermitidos: [], aseguradoras: ['Rímac', 'Pacífico', 'Mapfre'] },
  ],
};

export const usuarioAdminMock: Usuario = {
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  email: 'admin@segurosimple.test',
  rol: 'ADMINISTRADOR',
  nombreCompleto: 'Ana Admin',
  activo: true,
};

export const handlers = [
  http.get(`${API}/health/live`, () => HttpResponse.json<HealthLive>({ status: 'ok' })),
  http.get(`${API}/health/ready`, () =>
    HttpResponse.json<HealthReady>({ status: 'ok', checks: { database: 'up', auth: 'up' } }),
  ),
  http.get(`${API}/catalogo/campos`, () => HttpResponse.json(catalogoCamposMock)),
  http.get(`${API}/usuarios/me`, ({ request }) => {
    if (!request.headers.get('Authorization')) {
      return HttpResponse.json(
        { statusCode: 401, message: 'No autenticado', correlationId: 'corr-401', timestamp: new Date().toISOString(), path: '/api/v1/usuarios/me' },
        { status: 401 },
      );
    }
    return HttpResponse.json(usuarioAdminMock);
  }),
];

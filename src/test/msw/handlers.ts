import { http, HttpResponse } from 'msw';
import type { CatalogoCampos, HealthLive, HealthReady, Usuario } from '../../shared/types/api';

/** Base de la API en los mocks: la misma que lee el api-client. */
export const API = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1';

/** Formas reales del backend (doc conexión §6). Se amplían ola por ola. */
export const catalogoCamposMock: CatalogoCampos = {
  aseguradoras: [
    { id: '11111111-1111-4111-8111-111111111111', nombre: 'Rímac' },
    { id: '22222222-2222-4222-8222-222222222222', nombre: 'Pacífico' },
    { id: '33333333-3333-4333-8333-333333333333', nombre: 'La Positiva' },
    { id: '44444444-4444-4444-8444-444444444444', nombre: 'Mapfre' },
    { id: '55555555-5555-4555-8555-555555555555', nombre: 'Qualitas' },
  ],
  campos: [
    { nombre: 'marca', tipo: 'LISTA', obligatorio: true, origenValores: 'CATALOGO', valoresPermitidos: [], aseguradoras: ['Rímac', 'Pacífico', 'La Positiva', 'Mapfre', 'Qualitas'] },
    { nombre: 'modelo', tipo: 'LISTA', obligatorio: true, origenValores: 'CATALOGO', valoresPermitidos: [], aseguradoras: ['Rímac', 'Pacífico', 'La Positiva', 'Mapfre', 'Qualitas'] },
    { nombre: 'anio', tipo: 'NUMERO', obligatorio: true, origenValores: 'CATALOGO', valoresPermitidos: [], aseguradoras: ['Rímac', 'Pacífico', 'La Positiva', 'Mapfre', 'Qualitas'] },
    { nombre: 'ubigeo', tipo: 'LISTA', obligatorio: true, origenValores: 'CATALOGO', valoresPermitidos: [], aseguradoras: ['Pacífico', 'La Positiva'] },
    { nombre: 'uso', tipo: 'LISTA', obligatorio: true, origenValores: 'ESTATICO', valoresPermitidos: ['PARTICULAR', 'COMERCIAL_LIGERO', 'TRANSPORTE_PASAJEROS', 'CARGA'], aseguradoras: ['Rímac', 'Pacífico', 'La Positiva', 'Mapfre', 'Qualitas'] },
    { nombre: 'placa', tipo: 'TEXTO', obligatorio: false, origenValores: 'ESTATICO', valoresPermitidos: [], aseguradoras: ['Rímac', 'Mapfre'] },
    { nombre: 'nombres', tipo: 'TEXTO', obligatorio: true, origenValores: 'ESTATICO', valoresPermitidos: [], aseguradoras: ['Rímac', 'Pacífico', 'La Positiva', 'Mapfre', 'Qualitas'] },
    { nombre: 'apellidos', tipo: 'TEXTO', obligatorio: true, origenValores: 'ESTATICO', valoresPermitidos: [], aseguradoras: ['Rímac', 'Pacífico', 'La Positiva', 'Mapfre', 'Qualitas'] },
    { nombre: 'telefono', tipo: 'TEXTO', obligatorio: true, origenValores: 'ESTATICO', valoresPermitidos: [], aseguradoras: ['Rímac', 'Pacífico', 'La Positiva', 'Mapfre', 'Qualitas'] },
    { nombre: 'email', tipo: 'TEXTO', obligatorio: true, origenValores: 'ESTATICO', valoresPermitidos: [], aseguradoras: ['Rímac', 'Pacífico', 'La Positiva', 'Mapfre', 'Qualitas'] },
    { nombre: 'canalPreferido', tipo: 'LISTA', obligatorio: true, origenValores: 'ESTATICO', valoresPermitidos: ['LLAMADA', 'WHATSAPP'], aseguradoras: ['Rímac', 'Pacífico', 'La Positiva', 'Mapfre', 'Qualitas'] },
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

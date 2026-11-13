import { describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '../../test/msw/server';
import { API } from '../../test/msw/handlers';
import { renderConProviders } from '../../test/render';
import { Toaster } from '../../shared/ui/toaster';
import type { CoberturaAdmin, EscenarioAdmin } from '../../shared/types/api';
import { PruebaChoqueCoberturasPage } from './pages/PruebaChoqueCoberturasPage';
import { PruebaChoqueEscenariosPage } from './pages/PruebaChoqueEscenariosPage';
import { PruebaChoqueFactoresPage } from './pages/PruebaChoqueFactoresPage';
import { PruebaChoqueFrecuenciasPage } from './pages/PruebaChoqueFrecuenciasPage';

const ADMIN = { roles: ['ADMINISTRADOR' as const] };
const BASE = `${API}/admin/prueba-choque`;
const PLAN = '22222222-2222-4222-8222-222222222222';
const ASEG = '11111111-1111-4111-8111-111111111111';

const resumen = (n: number) => HttpResponse.json({ recibidas: n, cambiadas: n, total: n });
const error400 = (message: string, errors?: { campo: string; mensaje: string }[]) =>
  HttpResponse.json({ statusCode: 400, message, ...(errors ? { errors } : {}), correlationId: 'corr-1' }, { status: 400 });

const choqueLeve: EscenarioAdmin = {
  id: 'e1',
  codigo: 'CHOQUE_LEVE',
  nombre: 'Choque leve',
  descripcion: 'Raspas el parachoques al estacionar',
  montoDanoReferencial: '600.00',
  diasTaller: 3,
  orden: 1,
  activo: true,
  pendientes: {
    frecuenciasFaltantes: [{ uso: 'COMERCIAL_LIGERO', zona: 'ALTA' }],
    planesSinCobertura: [{ planId: PLAN, plan: 'Oro', aseguradora: 'Rímac' }],
  },
};
const roboTotal: EscenarioAdmin = {
  id: 'e2',
  codigo: 'ROBO_TOTAL',
  nombre: 'Robo total',
  descripcion: 'Se llevan el auto',
  montoDanoReferencial: null,
  diasTaller: 30,
  orden: 2,
  activo: true,
  pendientes: { frecuenciasFaltantes: [], planesSinCobertura: [] },
};
const inactivo: EscenarioAdmin = { ...roboTotal, id: 'e3', codigo: 'VIEJO', nombre: 'Escenario viejo', orden: 3, activo: false, pendientes: null };

/* ───────────────────────── Escenarios ───────────────────────── */

describe('Prueba de Choque · Escenarios', () => {
  it('lista los escenarios con su daño, qué les falta y su estado en texto', async () => {
    server.use(http.get(`${BASE}/escenarios`, () => HttpResponse.json([choqueLeve, roboTotal, inactivo])));
    renderConProviders(<PruebaChoqueEscenariosPage />, ADMIN);

    const tabla = await screen.findByRole('table', { name: /escenarios de la prueba de choque/i });
    const filas = within(tabla).getAllByRole('row').slice(1);
    expect(filas).toHaveLength(3);
    expect(within(filas[0]!).getByText('Choque leve')).toBeInTheDocument();
    expect(within(filas[0]!).getByLabelText('600 dólares')).toBeInTheDocument();
    expect(within(filas[0]!).getByText('Falta información')).toBeInTheDocument();
    expect(within(filas[1]!).getByText('Suma asegurada del plan')).toBeInTheDocument();
    expect(within(filas[1]!).getByText('Completo')).toBeInTheDocument();
    expect(within(filas[2]!).getByText('Inactivo')).toBeInTheDocument();
  });

  it('"Ver qué falta" detalla las frecuencias sin cargar y los planes sin cobertura, con enlaces para completarlos', async () => {
    server.use(http.get(`${BASE}/escenarios`, () => HttpResponse.json([choqueLeve])));
    renderConProviders(<PruebaChoqueEscenariosPage />, ADMIN);

    await screen.findByText('Ver qué falta');
    expect(screen.getByText('Comercial ligero · zona alta')).toBeInTheDocument();
    expect(screen.getByText('Rímac · Plan Oro')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Cargar frecuencias' })).toHaveAttribute('href', '/app/admin/prueba-choque/frecuencias');
    expect(screen.getByRole('link', { name: 'Cargar deducibles y topes' })).toHaveAttribute('href', '/app/admin/prueba-choque/coberturas');
  });

  it('desactivar un escenario manda el escenario completo con activo en false', async () => {
    let enviado: { codigo: string; cuerpo: unknown } | null = null;
    server.use(
      http.get(`${BASE}/escenarios`, () => HttpResponse.json([choqueLeve, roboTotal])),
      http.put(`${BASE}/escenarios/:codigo`, async ({ request, params }) => {
        enviado = { codigo: String(params.codigo), cuerpo: await request.json() };
        return HttpResponse.json({ ...roboTotal, activo: false });
      }),
    );
    const user = userEvent.setup();
    renderConProviders(
      <>
        <PruebaChoqueEscenariosPage />
        <Toaster />
      </>,
      ADMIN,
    );
    await user.click(await screen.findByRole('switch', { name: 'Desactivar Robo total' }));
    expect(await screen.findByText('Escenario desactivado')).toBeInTheDocument();
    // El robo total no tiene monto: viaja null (el daño es la suma asegurada).
    expect(enviado).toEqual({
      codigo: 'ROBO_TOTAL',
      cuerpo: { nombre: 'Robo total', descripcion: 'Se llevan el auto', montoDanoReferencial: null, diasTaller: 30, orden: 2, activo: false },
    });
  });

  it('crea un escenario nuevo: valida el código y el monto antes de enviar y manda el cuerpo del backend', async () => {
    let enviado: { codigo: string; cuerpo: unknown } | null = null;
    server.use(
      http.get(`${BASE}/escenarios`, () => HttpResponse.json([choqueLeve])),
      http.put(`${BASE}/escenarios/:codigo`, async ({ request, params }) => {
        enviado = { codigo: String(params.codigo), cuerpo: await request.json() };
        return HttpResponse.json({ ...choqueLeve, codigo: String(params.codigo), nombre: 'Granizo' });
      }),
    );
    const user = userEvent.setup();
    renderConProviders(
      <>
        <PruebaChoqueEscenariosPage />
        <Toaster />
      </>,
      ADMIN,
    );
    await user.click(await screen.findByRole('button', { name: /nuevo escenario/i }));
    const dialogo = await screen.findByRole('dialog', { name: 'Nuevo escenario' });

    await user.click(within(dialogo).getByRole('button', { name: 'Guardar' }));
    expect(within(dialogo).getByText('El código va en mayúsculas y guiones bajos, p. ej. CHOQUE_LEVE')).toBeInTheDocument();
    expect(within(dialogo).getByText('El nombre del escenario es obligatorio')).toBeInTheDocument();
    expect(within(dialogo).getByText('El monto de daño debe ser un número con hasta 2 decimales')).toBeInTheDocument();
    expect(enviado).toBeNull();

    await user.type(within(dialogo).getByLabelText(/^código/i), 'granizo');
    await user.type(within(dialogo).getByLabelText(/^nombre/i), 'Granizo');
    await user.type(within(dialogo).getByLabelText(/descripción para el cliente/i), 'Una granizada daña la carrocería');
    await user.type(within(dialogo).getByLabelText(/daño de referencia/i), '1200.5');
    await user.clear(within(dialogo).getByLabelText(/días en taller/i));
    await user.type(within(dialogo).getByLabelText(/días en taller/i), '5');
    await user.click(within(dialogo).getByRole('button', { name: 'Guardar' }));

    expect(await screen.findByText('Escenario creado')).toBeInTheDocument();
    expect(enviado).toEqual({
      codigo: 'GRANIZO',
      cuerpo: { nombre: 'Granizo', descripcion: 'Una granizada daña la carrocería', montoDanoReferencial: 1200.5, diasTaller: 5, orden: 2, activo: true },
    });
  });

  it('editar: el código no se puede cambiar y "el daño es la suma asegurada" manda null', async () => {
    let cuerpo: unknown = null;
    server.use(
      http.get(`${BASE}/escenarios`, () => HttpResponse.json([choqueLeve])),
      http.put(`${BASE}/escenarios/CHOQUE_LEVE`, async ({ request }) => {
        cuerpo = await request.json();
        return HttpResponse.json(choqueLeve);
      }),
    );
    const user = userEvent.setup();
    renderConProviders(<PruebaChoqueEscenariosPage />, ADMIN);
    await user.click(await screen.findByRole('button', { name: 'Editar Choque leve' }));
    const dialogo = await screen.findByRole('dialog', { name: 'Editar Choque leve' });
    expect(within(dialogo).getByLabelText(/^código/i)).toBeDisabled();
    await user.click(within(dialogo).getByRole('checkbox', { name: /el daño es la suma asegurada/i }));
    expect(within(dialogo).queryByLabelText(/daño de referencia/i)).not.toBeInTheDocument();
    await user.click(within(dialogo).getByRole('button', { name: 'Guardar' }));
    await waitFor(() => expect(cuerpo).toMatchObject({ montoDanoReferencial: null }));
  });

  it('si el backend rechaza el escenario, muestra su mensaje junto al campo y no cierra', async () => {
    server.use(
      http.get(`${BASE}/escenarios`, () => HttpResponse.json([choqueLeve])),
      http.put(`${BASE}/escenarios/CHOQUE_LEVE`, () => error400('Datos no válidos', [{ campo: 'nombre', mensaje: 'Ya existe un escenario con ese nombre' }])),
    );
    const user = userEvent.setup();
    renderConProviders(<PruebaChoqueEscenariosPage />, ADMIN);
    await user.click(await screen.findByRole('button', { name: 'Editar Choque leve' }));
    const dialogo = await screen.findByRole('dialog');
    await user.click(within(dialogo).getByRole('button', { name: 'Guardar' }));
    expect(await within(dialogo).findByText('Ya existe un escenario con ese nombre')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('muestra el mensaje del backend si no carga', async () => {
    server.use(http.get(`${BASE}/escenarios`, () => HttpResponse.json({ statusCode: 500, message: 'Ocurrió un error en el servidor.' }, { status: 500 })));
    renderConProviders(<PruebaChoqueEscenariosPage />, ADMIN);
    expect(await screen.findByText('Ocurrió un error en el servidor.')).toBeInTheDocument();
  });
});

/* ───────────────────────── Deducibles y topes ───────────────────────── */

const cobertura = (extra: Partial<CoberturaAdmin> = {}): CoberturaAdmin => ({
  planId: PLAN,
  plan: 'Oro',
  aseguradora: 'Rímac',
  escenario: 'CHOQUE_LEVE',
  cubre: true,
  deduciblePct: '10.00',
  deducibleMinimo: '150.00',
  topeCobertura: null,
  condicionTaller: 'AFILIADO',
  diasAutoReemplazo: 0,
  fuente: 'Supuesto referencial (seed 0027)',
  actualizadoEn: '2026-11-01T10:00:00-05:00',
  ...extra,
});

function mockCoberturas(filas: CoberturaAdmin[], opciones: { guardado?: () => Response | Promise<Response>; cuerpos?: unknown[] } = {}) {
  server.use(
    http.get(`${API}/admin/planes`, () => HttpResponse.json([{ id: PLAN, aseguradoraId: ASEG, nombre: 'Oro', descripcion: null, activo: true }])),
    http.get(`${API}/admin/aseguradoras`, () => HttpResponse.json([{ id: ASEG, nombre: 'Rímac', activa: true, codigoEstrategia: 'RIMAC' }])),
    http.get(`${BASE}/escenarios`, () => HttpResponse.json([choqueLeve, roboTotal])),
    http.get(`${BASE}/coberturas`, () => HttpResponse.json(filas)),
    http.put(`${BASE}/coberturas`, async ({ request }) => {
      opciones.cuerpos?.push(await request.json());
      return opciones.guardado ? opciones.guardado() : resumen(1);
    }),
  );
}

async function elegirPlan(user: ReturnType<typeof userEvent.setup>) {
  await screen.findByRole('option', { name: 'Rímac · Plan Oro' });
  await user.selectOptions(screen.getByRole('combobox', { name: /^plan/i }), PLAN);
}

describe('Prueba de Choque · Deducibles y topes', () => {
  it('pide elegir un plan y luego muestra una fila por escenario; el que no tiene cobertura dice "Sin información"', async () => {
    mockCoberturas([cobertura()]);
    const user = userEvent.setup();
    renderConProviders(<PruebaChoqueCoberturasPage />, ADMIN);
    expect(await screen.findByText('Elige un plan para ver y editar sus deducibles y topes.')).toBeInTheDocument();

    await elegirPlan(user);
    const tabla = await screen.findByRole('table', { name: /deducibles y topes de rímac · plan oro/i });
    expect(within(tabla).getByLabelText('Deducible % de Choque leve')).toHaveValue('10.00');
    expect(within(tabla).getByLabelText('Deducible mínimo de Choque leve')).toHaveValue('150.00');
    const filaRobo = within(tabla).getByRole('row', { name: /robo total/i });
    expect(within(filaRobo).getByText('Sin información de este plan para este escenario.')).toBeInTheDocument();
    expect(within(filaRobo).getByText('Sin información')).toBeInTheDocument();
  });

  it('solo se envían las filas cambiadas; si no cubre, no lleva deducible, tope ni días de reemplazo', async () => {
    const cuerpos: unknown[] = [];
    mockCoberturas([cobertura()], { cuerpos });
    const user = userEvent.setup();
    renderConProviders(
      <>
        <PruebaChoqueCoberturasPage />
        <Toaster />
      </>,
      ADMIN,
    );
    await elegirPlan(user);
    await screen.findByRole('table');
    expect(screen.getByRole('button', { name: /^guardar/i })).toBeDisabled();

    await user.click(screen.getByRole('switch', { name: 'El plan cubre Choque leve' }));
    expect(screen.getByLabelText('Deducible % de Choque leve')).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Guardar (1)' }));
    expect(await screen.findByText('Coberturas guardadas')).toBeInTheDocument();
    expect(cuerpos[0]).toEqual({
      filas: [
        {
          planId: PLAN,
          escenario: 'CHOQUE_LEVE',
          cubre: false,
          deduciblePct: null,
          deducibleMinimo: null,
          topeCobertura: null,
          diasAutoReemplazo: 0,
          condicionTaller: 'AFILIADO',
          fuente: 'Supuesto referencial (seed 0027)',
        },
      ],
    });
  });

  it('valida porcentaje, tope y días en la celda y no deja guardar con errores', async () => {
    mockCoberturas([cobertura()]);
    const user = userEvent.setup();
    renderConProviders(<PruebaChoqueCoberturasPage />, ADMIN);
    await elegirPlan(user);
    await screen.findByRole('table');

    const pct = screen.getByLabelText('Deducible % de Choque leve');
    await user.clear(pct);
    await user.type(pct, '120');
    expect(await screen.findByText('Entre 0 y 100 %, hasta 2 decimales')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^guardar/i })).toBeDisabled();

    await user.clear(pct);
    await user.type(pct, '12.5');
    const tope = screen.getByLabelText('Tope de Choque leve');
    await user.type(tope, '0');
    expect(await screen.findByText('Mayor que 0, o vacío = hasta la suma asegurada')).toBeInTheDocument();
    await user.clear(tope);
    const dias = screen.getByLabelText('Días de reemplazo de Choque leve');
    await user.clear(dias);
    await user.type(dias, '400');
    expect(await screen.findByText('Entre 0 y 365')).toBeInTheDocument();
  });

  it('una cobertura nueva exige la fuente del dato', async () => {
    const cuerpos: unknown[] = [];
    mockCoberturas([cobertura()], { cuerpos });
    const user = userEvent.setup();
    renderConProviders(<PruebaChoqueCoberturasPage />, ADMIN);
    await elegirPlan(user);
    await screen.findByRole('table');

    await user.click(screen.getByRole('button', { name: 'Definir cobertura de Robo total' }));
    expect(await screen.findByText('Indica la fuente (p. ej. el condicionado)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^guardar/i })).toBeDisabled();

    await user.type(screen.getByLabelText('Fuente de Robo total'), 'Condicionado 2026');
    await user.type(screen.getByLabelText('Deducible % de Robo total'), '10');
    await user.click(screen.getByRole('button', { name: 'Guardar (1)' }));
    await waitFor(() => expect(cuerpos).toHaveLength(1));
    expect(cuerpos[0]).toMatchObject({ filas: [{ escenario: 'ROBO_TOTAL', cubre: true, deduciblePct: 10, fuente: 'Condicionado 2026' }] });
  });

  it('el error del backend por fila se pega al escenario correspondiente', async () => {
    mockCoberturas([cobertura()], {
      guardado: () => error400('Hay filas inválidas', [{ campo: 'filas.0', mensaje: 'Si el plan no cubre el escenario, no lleva deducible' }]),
    });
    const user = userEvent.setup();
    renderConProviders(<PruebaChoqueCoberturasPage />, ADMIN);
    await elegirPlan(user);
    await screen.findByRole('table');
    const pct = screen.getByLabelText('Deducible % de Choque leve');
    await user.clear(pct);
    await user.type(pct, '15');
    await user.click(screen.getByRole('button', { name: 'Guardar (1)' }));
    expect(await screen.findAllByText('Si el plan no cubre el escenario, no lleva deducible')).not.toHaveLength(0);
  });
});

/* ───────────────────────── Frecuencias y zonas ───────────────────────── */

describe('Prueba de Choque · Frecuencias y zonas', () => {
  const frecuencias = [
    { escenario: 'CHOQUE_LEVE', uso: 'PARTICULAR', zona: 'MEDIA', probabilidadAnual: '0.2000' },
    { escenario: 'CHOQUE_LEVE', uso: 'PARTICULAR', zona: 'ALTA', probabilidadAnual: '0.2200' },
  ];
  const zonas = [
    { ubigeo: '150122', departamento: 'Lima', provincia: 'Lima', distrito: 'Miraflores', zona: 'BAJA' },
    { ubigeo: '150135', departamento: 'Lima', provincia: 'Lima', distrito: 'San Juan de Lurigancho', zona: 'ALTA' },
  ];

  function mockFrecuencias(cuerpos: { frecuencias?: unknown[]; zonas?: unknown[] } = {}) {
    server.use(
      http.get(`${BASE}/escenarios`, () => HttpResponse.json([choqueLeve, roboTotal])),
      http.get(`${BASE}/frecuencias`, () => HttpResponse.json(frecuencias)),
      http.put(`${BASE}/frecuencias`, async ({ request }) => {
        cuerpos.frecuencias?.push(await request.json());
        return resumen(1);
      }),
      http.get(`${BASE}/zonas`, () => HttpResponse.json(zonas)),
      http.put(`${BASE}/zonas`, async ({ request }) => {
        cuerpos.zonas?.push(await request.json());
        return resumen(1);
      }),
    );
  }

  it('muestra la matriz uso × zona del primer escenario, la probabilidad como porcentaje y marca lo que falta', async () => {
    mockFrecuencias();
    renderConProviders(<PruebaChoqueFrecuenciasPage />, ADMIN);
    const tabla = await screen.findByRole('table', { name: /probabilidad anual por uso y zona/i });
    expect(within(tabla).getByLabelText('Probabilidad anual, Particular, zona media')).toHaveValue('0.2000');
    expect(await within(tabla).findByText('20 % al año')).toBeInTheDocument();
    // Lo que no está cargado se dice en texto: el motor lo toma como 0.
    expect(within(tabla).getAllByText('Falta: el motor usa 0').length).toBeGreaterThan(0);
  });

  it('valida la probabilidad (0,0001 a 0,95) y envía solo las celdas cambiadas', async () => {
    const cuerpos = { frecuencias: [] as unknown[] };
    mockFrecuencias(cuerpos);
    const user = userEvent.setup();
    renderConProviders(
      <>
        <PruebaChoqueFrecuenciasPage />
        <Toaster />
      </>,
      ADMIN,
    );
    const celda = await screen.findByLabelText('Probabilidad anual, Particular, zona media');
    await user.clear(celda);
    await user.type(celda, '1.2');
    expect(await screen.findByText('Entre 0,0001 y 0,95')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /guardar frecuencias/i })).toBeDisabled();

    await user.clear(celda);
    await user.type(celda, '0.25');
    await user.click(screen.getByRole('button', { name: 'Guardar frecuencias (1)' }));
    expect(await screen.findByText('Frecuencias guardadas')).toBeInTheDocument();
    expect(cuerpos.frecuencias[0]).toEqual({ filas: [{ escenario: 'CHOQUE_LEVE', uso: 'PARTICULAR', zona: 'MEDIA', probabilidadAnual: 0.25 }] });
  });

  it('lista las zonas de los distritos y guarda solo las que cambian', async () => {
    const cuerpos = { zonas: [] as unknown[] };
    mockFrecuencias(cuerpos);
    const user = userEvent.setup();
    renderConProviders(
      <>
        <PruebaChoqueFrecuenciasPage />
        <Toaster />
      </>,
      ADMIN,
    );
    const tabla = await screen.findByRole('table', { name: /zona de riesgo de cada distrito/i });
    expect(within(tabla).getByText('Miraflores')).toBeInTheDocument();
    await user.selectOptions(within(tabla).getByLabelText('Zona de Miraflores'), 'MEDIA');
    expect(within(tabla).getByText('Sin guardar')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Guardar zonas (1)' }));
    expect(await screen.findByText('Zonas guardadas')).toBeInTheDocument();
    expect(cuerpos.zonas[0]).toEqual({ filas: [{ ubigeo: '150122', zona: 'MEDIA' }] });
  });

  it('agrega un distrito que aún no figura (cuenta como media) y lo guarda con la zona elegida', async () => {
    const cuerpos = { zonas: [] as unknown[] };
    mockFrecuencias(cuerpos);
    server.use(
      http.get(`${API}/catalogo/ubigeos/departamentos`, () => HttpResponse.json([{ departamento: 'Lima' }])),
      http.get(`${API}/catalogo/ubigeos/provincias`, () => HttpResponse.json([{ provincia: 'Provincia de Lima' }])),
      http.get(`${API}/catalogo/ubigeos/distritos`, () => HttpResponse.json([{ ubigeo: '150101', distrito: 'Cercado de Lima' }])),
    );
    const user = userEvent.setup();
    renderConProviders(
      <>
        <PruebaChoqueFrecuenciasPage />
        <Toaster />
      </>,
      ADMIN,
    );
    await screen.findByRole('table', { name: /zona de riesgo de cada distrito/i });
    await screen.findByRole('option', { name: 'Lima' });
    await user.selectOptions(screen.getByLabelText(/^departamento/i), 'Lima');
    await screen.findByRole('option', { name: 'Provincia de Lima' });
    await user.selectOptions(screen.getByLabelText(/^provincia/i), 'Provincia de Lima');
    await screen.findByRole('option', { name: 'Cercado de Lima' });
    await user.selectOptions(screen.getByLabelText(/^distrito/i), '150101');
    await user.click(screen.getByRole('button', { name: /agregar a la lista/i }));

    const tabla = screen.getByRole('table', { name: /zona de riesgo de cada distrito/i });
    expect(within(tabla).getByText('Cercado de Lima')).toBeInTheDocument();
    expect(within(tabla).getByText('Nuevo')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Guardar zonas (1)' }));
    expect(await screen.findByText('Zonas guardadas')).toBeInTheDocument();
    expect(cuerpos.zonas[0]).toEqual({ filas: [{ ubigeo: '150101', zona: 'ALTA' }] });
  });

  it('la búsqueda filtra los distritos', async () => {
    mockFrecuencias();
    const user = userEvent.setup();
    renderConProviders(<PruebaChoqueFrecuenciasPage />, ADMIN);
    const tabla = await screen.findByRole('table', { name: /zona de riesgo de cada distrito/i });
    await user.type(screen.getByRole('searchbox', { name: /buscar/i }), 'miraflores');
    expect(within(tabla).getByText('Miraflores')).toBeInTheDocument();
    expect(within(tabla).queryByText('San Juan de Lurigancho')).not.toBeInTheDocument();
  });
});

/* ───────────────────────── Factores ───────────────────────── */

describe('Prueba de Choque · Factores de perfil', () => {
  const factores = [{ escenario: 'CHOQUE_LEVE', variable: 'USO_NOCTURNO', multiplicador: '1.30' }];

  it('muestra la grilla escenario × variable, "Sin factor" donde no hay, y valida de 0,10 a 3,00', async () => {
    server.use(
      http.get(`${BASE}/escenarios`, () => HttpResponse.json([choqueLeve, roboTotal])),
      http.get(`${BASE}/factores`, () => HttpResponse.json(factores)),
    );
    const user = userEvent.setup();
    renderConProviders(<PruebaChoqueFactoresPage />, ADMIN);
    const noche = await screen.findByLabelText('Usa el auto de noche en Choque leve');
    expect(noche).toHaveValue('1.30');
    expect(screen.getAllByText('Sin factor').length).toBeGreaterThan(0);

    await user.clear(noche);
    await user.type(noche, '4');
    expect(await screen.findByText('Entre 0,10 y 3,00')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^guardar/i })).toBeDisabled();
  });

  it('envía solo los factores cambiados, también los nuevos', async () => {
    const cuerpos: unknown[] = [];
    server.use(
      http.get(`${BASE}/escenarios`, () => HttpResponse.json([choqueLeve, roboTotal])),
      http.get(`${BASE}/factores`, () => HttpResponse.json(factores)),
      http.put(`${BASE}/factores`, async ({ request }) => {
        cuerpos.push(await request.json());
        return resumen(2);
      }),
    );
    const user = userEvent.setup();
    renderConProviders(
      <>
        <PruebaChoqueFactoresPage />
        <Toaster />
      </>,
      ADMIN,
    );
    const noche = await screen.findByLabelText('Usa el auto de noche en Choque leve');
    await user.clear(noche);
    await user.type(noche, '1.5');
    await user.type(screen.getByLabelText('Guarda el auto en cochera en Robo total'), '0.8');
    await user.click(screen.getByRole('button', { name: 'Guardar (2)' }));
    expect(await screen.findByText('Factores guardados')).toBeInTheDocument();
    expect(cuerpos[0]).toEqual({
      filas: [
        { escenario: 'CHOQUE_LEVE', variable: 'USO_NOCTURNO', multiplicador: 1.5 },
        { escenario: 'ROBO_TOTAL', variable: 'ESTACIONA_COCHERA', multiplicador: 0.8 },
      ],
    });
  });
});

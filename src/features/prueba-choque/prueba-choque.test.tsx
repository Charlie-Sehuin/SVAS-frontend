import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { Route, Routes } from 'react-router-dom';
import { server } from '../../test/msw/server';
import { API } from '../../test/msw/handlers';
import { renderConProviders } from '../../test/render';
import { Toaster } from '../../shared/ui/toaster';
import type { Cotizacion, EscenarioCatalogo, ResultadoEscenario, Simulacion } from '../../shared/types/api';
import { ComparativoPage } from '../cotizacion/pages/ComparativoPage';
import { PruebaChoquePage } from './pages/PruebaChoquePage';
import { nivelDesembolso } from './lib/nivel';

const COT = '7f1a2b3c-4d5e-4f60-8a7b-9c0d1e2f3a4b';
const P1 = 'aaaaaaaa-0000-4000-8000-000000000001';
const P2 = 'aaaaaaaa-0000-4000-8000-000000000002';

const prima = (id: string, aseguradora: string, plan: string, suma = '15000.00') => ({
  id,
  aseguradoraId: `aseg-${aseguradora}`,
  aseguradora,
  planId: `plan-${id}`,
  plan,
  resumen: null,
  disponible: true,
  sumaAsegurada: suma,
  rangoSuma: { minima: '12000.00', maxima: '16800.00' },
  prima: '560.00',
  primaMensual: '48.00',
  motivoNoDisponible: null,
});

const cotizacionMock = (extra: Partial<Cotizacion> = {}): Cotizacion => ({
  id: COT,
  estado: 'REGISTRADA',
  fecha: '2026-11-12T15:00:00-05:00',
  opciones: ['COMPRA_INMEDIATA', 'ASESORIA'],
  motivoDerivacion: null,
  vehiculo: { uso: 'PARTICULAR', marca: 'Toyota', modelo: 'Corolla', tipo: 'SEDAN', anio: 2022, ubigeo: '150122' },
  primas: [prima(P1, 'Pacífico', 'Premium'), prima(P2, 'Rímac', 'Oro')],
  ...extra,
});

const escenarios: EscenarioCatalogo[] = [
  { codigo: 'CHOQUE_LEVE', nombre: 'Choque leve', descripcion: 'Raspas el parachoques al estacionar', montoDanoReferencial: '600.00', diasTaller: 3 },
  { codigo: 'ROBO_TOTAL', nombre: 'Robo total', descripcion: 'Se llevan el auto', montoDanoReferencial: null, diasTaller: 30 },
];

const resultado = (id: string, extra: Partial<ResultadoEscenario> = {}): ResultadoEscenario => ({
  primaCotizadaId: id,
  cubre: true,
  deducible: '60.00',
  noCubierto: '0.00',
  ingresoPerdido: '0.00',
  desembolso: '60.00',
  sinDato: false,
  ...extra,
});

const simulacionMock = (extra: Partial<Simulacion> = {}): Simulacion => ({
  id: 'sim-1',
  zona: 'ALTA',
  moneda: 'USD',
  vigente: true,
  fecha: '2026-11-12T15:30:00-05:00',
  ranking: [
    { primaCotizadaId: P1, aseguradora: 'Pacífico', plan: 'Premium', prima: '560.00', desembolsoEsperado: '96.40', costoRealAnual: '656.40', peorCaso: '1250.00', datosCompletos: true, posicion: 1 },
    { primaCotizadaId: P2, aseguradora: 'Rímac', plan: 'Oro', prima: '560.00', desembolsoEsperado: '140.00', costoRealAnual: '700.00', peorCaso: '3500.00', datosCompletos: false, posicion: 2 },
  ],
  matriz: [
    {
      escenario: { codigo: 'CHOQUE_LEVE', nombre: 'Choque leve', probabilidad: '0.1800' },
      resultados: [resultado(P1, { desembolso: '60.00' }), resultado(P2, { desembolso: '300.00' })],
    },
    {
      escenario: { codigo: 'ROBO_TOTAL', nombre: 'Robo total', probabilidad: '0.0300' },
      resultados: [resultado(P1, { desembolso: '0.00', deducible: '0.00' }), resultado(P2, { sinDato: true, desembolso: '0.00' })],
    },
  ],
  leyenda: 'Estimación referencial basada en condiciones resumidas. Prevalece el condicionado de la aseguradora.',
  ...extra,
});

interface Opciones {
  cotizacion?: Cotizacion;
  /** `null` = todavía no hay simulación (404). */
  ultima?: Simulacion | null;
  postRespuesta?: () => Response | Promise<Response>;
}

function mockApi({ cotizacion = cotizacionMock(), ultima = null, postRespuesta }: Opciones = {}) {
  const cuerpos: unknown[] = [];
  server.use(
    http.get(`${API}/cotizaciones/${COT}/resumen`, () => HttpResponse.json({ cotizacion })),
    http.get(`${API}/prueba-choque/escenarios`, () => HttpResponse.json(escenarios)),
    http.get(`${API}/cotizaciones/${COT}/prueba-choque`, () =>
      ultima ? HttpResponse.json({ simulacion: ultima }) : HttpResponse.json({ statusCode: 404, message: 'Esta cotización todavía no tiene Prueba de Choque' }, { status: 404 }),
    ),
    http.post(`${API}/cotizaciones/${COT}/prueba-choque`, async ({ request }) => {
      cuerpos.push(await request.json());
      return postRespuesta ? postRespuesta() : HttpResponse.json({ simulacion: simulacionMock() }, { status: 201 });
    }),
  );
  return { cuerpos };
}

function renderPrueba() {
  return renderConProviders(
    <>
      <Routes>
        <Route path="/cotizacion/:id/prueba" element={<PruebaChoquePage />} />
      </Routes>
      <Toaster />
    </>,
    { ruta: `/cotizacion/${COT}/prueba` },
  );
}

/** jsdom no tiene pantalla: se simula un ancho de escritorio (≥ 768 px) o de móvil. */
function conPantalla(escritorio: boolean) {
  vi.spyOn(window, 'matchMedia').mockImplementation(
    (query: string) =>
      ({
        matches: escritorio && query.includes('min-width'),
        media: query,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      }) as MediaQueryList,
  );
}

afterEach(() => vi.restoreAllMocks());

/* ───────────────────────── Clasificación del nivel ───────────────────────── */

describe('nivelDesembolso (escala out-0…3)', () => {
  const r = (extra: Partial<ResultadoEscenario>) => resultado(P1, extra);

  it('clasifica por la proporción del daño, sin información y sin costo', () => {
    expect(nivelDesembolso(r({ sinDato: true }), '600.00')).toBe('sin-dato');
    expect(nivelDesembolso(r({ desembolso: '0.00' }), '600.00')).toBe(0);
    expect(nivelDesembolso(r({ desembolso: '60.00' }), '600.00')).toBe(1); // 10 % exacto
    expect(nivelDesembolso(r({ desembolso: '300.00' }), '600.00')).toBe(2); // 50 % exacto
    expect(nivelDesembolso(r({ desembolso: '300.01' }), '600.00')).toBe(3);
  });

  it('lo no cubierto o un plan que no cubre es siempre costo alto', () => {
    expect(nivelDesembolso(r({ desembolso: '50.00', noCubierto: '10.00' }), '5000.00')).toBe(3);
    expect(nivelDesembolso(r({ desembolso: '50.00', cubre: false }), '5000.00')).toBe(3);
  });

  it('sin daño de referencia no inventa un porcentaje: nivel medio', () => {
    expect(nivelDesembolso(r({ desembolso: '50.00' }), null)).toBe(2);
  });
});

/* ───────────────────────── Página ───────────────────────── */

describe('PruebaChoquePage', () => {
  it('la primera vez abre las preguntas, manda el perfil y muestra el resultado con el aviso de datos incompletos', async () => {
    conPantalla(true);
    const user = userEvent.setup();
    const { cuerpos } = mockApi({
      postRespuesta: () =>
        HttpResponse.json(
          { simulacion: simulacionMock(), warning: { code: 'DATOS_COBERTURA_INCOMPLETOS', message: 'No tenemos información de robo total para 1 plan.' } },
          { status: 201 },
        ),
    });
    renderPrueba();

    const dialogo = await screen.findByRole('dialog', { name: /cuéntanos cómo usas tu auto/i });
    // Uso particular: no se pregunta el ingreso diario (RN-33).
    expect(within(dialogo).queryByLabelText(/cuánto ganas al día/i)).not.toBeInTheDocument();

    await user.click(within(dialogo).getByRole('switch', { name: /cochera/i }));
    await user.click(within(dialogo).getByRole('button', { name: 'Robo total' }));
    await user.click(within(dialogo).getByRole('button', { name: /ver mi prueba de choque/i }));

    expect(await screen.findByRole('heading', { name: 'Tu resultado' })).toBeInTheDocument();
    expect(cuerpos[0]).toEqual({
      perfil: { estacionaCochera: true, kmMesAlto: false, usoNocturno: false, preocupaciones: ['ROBO_TOTAL'] },
    });
    expect(await screen.findByText('No tenemos información de robo total para 1 plan.')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('con simulación guardada: ranking por costo real, sello al mejor completo, peor caso y leyenda', async () => {
    conPantalla(true);
    mockApi({ ultima: simulacionMock() });
    renderPrueba();

    const ranking = await screen.findByRole('list', { name: /ranking de planes/i });
    const filas = within(ranking).getAllByRole('listitem');
    expect(filas).toHaveLength(2);
    expect(within(filas[0]!).getByText('Plan Premium')).toBeInTheDocument();
    expect(within(filas[0]!).getByText(/Mejor protección por tu dinero/)).toBeInTheDocument();
    expect(within(filas[0]!).getByLabelText('656 dólares con 40 centavos')).toBeInTheDocument();
    // El plan incompleto lleva la insignia y NO el sello.
    expect(within(filas[1]!).getByText('Información incompleta')).toBeInTheDocument();
    expect(within(filas[1]!).queryByText(/Mejor protección/)).not.toBeInTheDocument();

    const peor = screen.getByLabelText('Peor caso del año');
    expect(peor).toHaveTextContent('plan Premium de Pacífico');
    expect(within(peor).getByLabelText(/1.?250 dólares/)).toBeInTheDocument();
    // RN-29: la leyenda viene del backend y no se puede ocultar.
    expect(screen.getByText(/Estimación referencial basada en condiciones resumidas/)).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('la matriz usa texto con cada celda: "Pagas", nivel, y "Sin información" rayada si falta el dato (RN-30)', async () => {
    conPantalla(true);
    mockApi({ ultima: simulacionMock() });
    renderPrueba();

    const tabla = await screen.findByRole('table', { name: /lo que pagarías tú en cada situación/i });
    const filaChoque = within(tabla).getByRole('row', { name: /choque leve/i });
    // El daño de referencia viene del catálogo de escenarios: se espera a que llegue para clasificar bien.
    expect(await within(filaChoque).findByText('Costo medio')).toBeInTheDocument(); // 300 sobre 600 = 50 %
    expect(within(filaChoque).getByText('Costo bajo')).toBeInTheDocument(); // 60 sobre 600 = 10 %
    const filaRobo = within(tabla).getByRole('row', { name: /robo total/i });
    expect(within(filaRobo).getByText('Sin costo para ti')).toBeInTheDocument();
    expect(within(filaRobo).getByText('Sin información de este plan')).toBeInTheDocument();
  });

  it('en móvil muestra un carrusel de tarjetas en vez de la tabla', async () => {
    conPantalla(false);
    mockApi({ ultima: simulacionMock() });
    renderPrueba();

    const carrusel = await screen.findByRole('list', { name: 'Situaciones posibles' });
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(within(carrusel).getByText('Situación 1 de 2')).toBeInTheDocument();
    expect(within(carrusel).getAllByText(/Plan Premium/).length).toBeGreaterThan(0);
  });

  it('una simulación no vigente (RN-37) se atenúa, avisa y ofrece volver a simular', async () => {
    conPantalla(true);
    const user = userEvent.setup();
    mockApi({ ultima: simulacionMock({ vigente: false }) });
    renderPrueba();

    const aviso = await screen.findByRole('status');
    expect(aviso).toHaveTextContent('Cambiaste tu suma asegurada. Vuelve a simular para ver tus costos reales.');
    await user.click(within(aviso).getByRole('button', { name: /volver a simular/i }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });

  it('en uso comercial pregunta el ingreso diario y lo manda; muestra los días de taller y lo que se deja de ganar', async () => {
    conPantalla(true);
    const user = userEvent.setup();
    const comercial = cotizacionMock({ vehiculo: { uso: 'COMERCIAL_LIGERO', marca: 'Toyota', modelo: 'Hiace', tipo: 'VAN', anio: 2021, ubigeo: '150122' } });
    const sim = simulacionMock({
      matriz: [
        {
          escenario: { codigo: 'CHOQUE_LEVE', nombre: 'Choque leve', probabilidad: '0.1800' },
          resultados: [resultado(P1, { desembolso: '660.00', ingresoPerdido: '600.00' }), resultado(P2)],
        },
      ],
    });
    const { cuerpos } = mockApi({ cotizacion: comercial, postRespuesta: () => HttpResponse.json({ simulacion: sim }, { status: 201 }) });
    renderPrueba();

    const dialogo = await screen.findByRole('dialog');
    const ingreso = within(dialogo).getByLabelText(/cuánto ganas al día/i);
    await user.type(ingreso, 'abc');
    await user.click(within(dialogo).getByRole('button', { name: /ver mi prueba de choque/i }));
    expect(await within(dialogo).findByText('Ingresa tu ingreso diario en soles, p. ej. 150.00')).toBeInTheDocument();
    expect(cuerpos).toHaveLength(0);

    await user.clear(ingreso);
    await user.type(ingreso, '200');
    await user.click(within(dialogo).getByRole('button', { name: /ver mi prueba de choque/i }));

    expect(await screen.findByRole('heading', { name: 'Tu resultado' })).toBeInTheDocument();
    expect(cuerpos[0]).toMatchObject({ perfil: { ingresoDiarioSoles: '200' } });
    expect(screen.getByText(/Tu auto estaría en taller unos 3 días/)).toBeInTheDocument();
    expect(screen.getByText(/de ingresos que dejas de ganar/)).toBeInTheDocument();
  });

  it('si el backend rechaza el perfil, muestra su mensaje y las preguntas siguen abiertas', async () => {
    conPantalla(true);
    const user = userEvent.setup();
    mockApi({
      postRespuesta: () => HttpResponse.json({ statusCode: 400, message: 'Esta cotización ya no se puede simular' }, { status: 400 }),
    });
    renderPrueba();

    const dialogo = await screen.findByRole('dialog');
    await user.click(within(dialogo).getByRole('button', { name: /ver mi prueba de choque/i }));
    expect(await screen.findByText('Esta cotización ya no se puede simular')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('comprar lleva al plan elegido; sin COMPRA_INMEDIATA solo queda hablar con un asesor', async () => {
    conPantalla(true);
    mockApi({ ultima: simulacionMock() });
    const { unmount } = renderPrueba();
    const enlaces = await screen.findAllByRole('link', { name: 'Comprar este plan' });
    expect(enlaces[0]).toHaveAttribute('href', `/compra/${COT}?prima=${P1}`);
    expect(enlaces[1]).toHaveAttribute('href', `/compra/${COT}?prima=${P2}`);
    expect(screen.getAllByRole('button', { name: /hablar con un asesor sobre esto/i })).toHaveLength(2);
    unmount();

    mockApi({ ultima: simulacionMock(), cotizacion: cotizacionMock({ opciones: ['ASESORIA'], motivoDerivacion: 'INSPECCION' }) });
    renderPrueba();
    await screen.findByRole('heading', { name: 'Tu resultado' });
    expect(screen.queryByRole('link', { name: 'Comprar este plan' })).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /hablar con un asesor sobre esto/i })).toHaveLength(2);
  });

  it('"Hablar con un asesor sobre esto" abre la solicitud con la duda ya marcada', async () => {
    conPantalla(true);
    const user = userEvent.setup();
    mockApi({ ultima: simulacionMock() });
    renderConProviders(
      <Routes>
        <Route path="/cotizacion/:id/prueba" element={<PruebaChoquePage />} />
      </Routes>,
      { roles: ['CLIENTE'], ruta: `/cotizacion/${COT}/prueba` },
    );
    const botones = await screen.findAllByRole('button', { name: /hablar con un asesor sobre esto/i });
    await user.click(botones[0]!);
    const dialogo = await screen.findByRole('dialog', { name: /hablar con un asesor/i });
    expect(within(dialogo).getByRole('radio', { name: /tengo una duda/i })).toBeChecked();
  });

  it('descarga el resumen en PDF', async () => {
    conPantalla(true);
    const user = userEvent.setup();
    mockApi({ ultima: simulacionMock() });
    server.use(
      http.get(`${API}/cotizaciones/${COT}/prueba-choque/pdf`, () =>
        new HttpResponse(new Uint8Array([37, 80, 68, 70]), {
          headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename="prueba-de-choque.pdf"' },
        }),
      ),
    );
    const crear = vi.fn(() => 'blob:prueba');
    Object.assign(URL, { createObjectURL: crear, revokeObjectURL: vi.fn() });
    const clic = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    renderPrueba();

    await user.click(await screen.findByRole('button', { name: /descargar resumen en pdf/i }));
    await waitFor(() => expect(clic).toHaveBeenCalled());
    expect(crear).toHaveBeenCalledOnce();
  });

  it('si la cotización ya no está registrada, no ofrece simular', async () => {
    conPantalla(true);
    mockApi({ cotizacion: cotizacionMock({ estado: 'CONVERTIDA' }), ultima: null });
    renderPrueba();
    expect(await screen.findByText('Esta cotización ya no se puede simular.')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('muestra el mensaje del backend si no encuentra la cotización', async () => {
    server.use(
      http.get(`${API}/cotizaciones/${COT}/resumen`, () => HttpResponse.json({ statusCode: 404, message: 'No encontramos tu cotización' }, { status: 404 })),
      http.get(`${API}/cotizaciones/${COT}/prueba-choque`, () => HttpResponse.json({ statusCode: 404, message: 'No encontramos tu cotización' }, { status: 404 })),
    );
    renderPrueba();
    expect(await screen.findByText('No encontramos tu cotización')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Volver a mi cotización' })).toBeInTheDocument();
  });
});

/* ───────────────────────── Entrada desde el comparativo ───────────────────────── */

describe('Comparativo → Prueba de Choque', () => {
  it('ofrece "Pon a prueba estos planes" y lleva a la Prueba de Choque; no aparece si ya compró', async () => {
    mockApi();
    const { unmount } = renderConProviders(
      <Routes>
        <Route path="/cotizacion/:id" element={<ComparativoPage />} />
      </Routes>,
      { ruta: `/cotizacion/${COT}` },
    );
    const enlace = await screen.findByRole('link', { name: /pon a prueba estos planes/i });
    expect(enlace).toHaveAttribute('href', `/cotizacion/${COT}/prueba`);
    unmount();

    mockApi({ cotizacion: cotizacionMock({ estado: 'CONVERTIDA' }) });
    renderConProviders(
      <Routes>
        <Route path="/cotizacion/:id" element={<ComparativoPage />} />
      </Routes>,
      { ruta: `/cotizacion/${COT}` },
    );
    await screen.findByText(/ya se convirtió en póliza/i);
    expect(screen.queryByRole('link', { name: /pon a prueba estos planes/i })).not.toBeInTheDocument();
  });
});

import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { Route, Routes } from 'react-router-dom';
import { server } from '../../test/msw/server';
import { API } from '../../test/msw/handlers';
import { renderConProviders } from '../../test/render';
import { Toaster } from '../../shared/ui/toaster';
import type { SolicitudDetalle, SolicitudEnCola } from '../../shared/types/api';
import type { Rol } from '../../shared/types/enums';
import { CasoDetallePage } from './asesor/pages/CasoDetallePage';
import { ColaAsesoriaPage } from './asesor/pages/ColaAsesoriaPage';

const ID = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa';
const COT = '7f1a2b3c-4d5e-4f60-8a7b-9c0d1e2f3a4b';
const PLAN = 'bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb';
const hace = (horas: number) => new Date(Date.now() - horas * 3_600_000).toISOString();

const fila = (extra: Partial<SolicitudEnCola> = {}): SolicitudEnCola => ({
  id: ID,
  motivo: 'DUDA',
  estado: 'PENDIENTE',
  canal: 'WHATSAPP',
  origen: 'CLIENTE',
  fechaCreacion: hace(1),
  asignadoAMi: false,
  cotizacion: { id: COT, fecha: hace(2), estado: 'REGISTRADA', vehiculo: 'Toyota Corolla 2022' },
  cliente: { nombre: 'Ana Ríos', telefono: '*****4321', email: 'a***@example.com', canalPreferido: 'WHATSAPP', numeroDocumento: '****5678' },
  ...extra,
});

const caso = (extra: Partial<SolicitudDetalle> = {}): SolicitudDetalle => ({
  id: ID,
  motivo: 'DESCUENTO',
  estado: 'EN_ATENCION',
  canal: 'WHATSAPP',
  origen: 'CLIENTE',
  fechaCreacion: hace(1),
  asignadoAMi: true,
  resultado: null,
  cotizacion: { id: COT, fecha: hace(2), estado: 'REGISTRADA', vehiculo: 'Toyota Corolla 2022' },
  cliente: { nombres: 'Ana', apellidos: 'Ríos', telefono: '987654321', email: 'ana@example.com', canalPreferido: 'WHATSAPP', numeroDocumento: '12345678' },
  primas: [
    { planId: PLAN, plan: 'Oro', aseguradora: 'Rímac', disponible: true, sumaAsegurada: '15000.00', prima: '640.40', primaMensual: '53.37' },
    { planId: 'cccccccc-3333-4333-8333-cccccccccccc', plan: 'Plus', aseguradora: 'Qualitas', disponible: false, sumaAsegurada: null, prima: null, primaMensual: null },
  ],
  descuentos: [],
  descuentoMaximo: '10.00',
  ...extra,
});

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

/* ───────────────────────── Cola ───────────────────────── */

function renderCola(roles: Rol[] = ['ASESOR']) {
  return renderConProviders(
    <>
      <Routes>
        <Route path="/app/asesorias" element={<ColaAsesoriaPage />} />
        <Route path="/app/asesorias/:id" element={<p>pantalla del caso</p>} />
      </Routes>
      <Toaster />
    </>,
    { roles, ruta: '/app/asesorias' },
  );
}

describe('ColaAsesoriaPage', () => {
  it('muestra la cola en el orden que manda el backend (RN-13), con prioridad en texto y los datos enmascarados', async () => {
    conPantalla(true);
    server.use(
      http.get(`${API}/asesorias/cola`, () =>
        HttpResponse.json([
          fila({ id: 'a1', origen: 'SISTEMA', motivo: 'INSPECCION', cliente: { ...fila().cliente, nombre: 'Primero Sistema' } }),
          fila({ id: 'a2', origen: 'CLIENTE', motivo: 'DUDA', cliente: { ...fila().cliente, nombre: 'Segundo Cliente' } }),
        ]),
      ),
    );
    renderCola();

    const tabla = await screen.findByRole('table', { name: /cola de solicitudes/i });
    const filas = within(tabla).getAllByRole('row').slice(1);
    expect(filas).toHaveLength(2);
    expect(within(filas[0]!).getByText('Primero Sistema')).toBeInTheDocument();
    expect(within(filas[0]!).getByText('Sistema')).toBeInTheDocument();
    expect(within(filas[0]!).getByText('Inspección')).toBeInTheDocument();
    expect(within(filas[1]!).getByText('Cliente')).toBeInTheDocument();
    expect(within(filas[1]!).getByText('Pendiente')).toBeInTheDocument();
  });

  it('una espera de más de 4 horas se marca con el texto "Espera larga"; una corta, no', async () => {
    conPantalla(true);
    server.use(http.get(`${API}/asesorias/cola`, () => HttpResponse.json([fila({ id: 'a1', fechaCreacion: hace(6) }), fila({ id: 'a2', fechaCreacion: hace(1) })])));
    renderCola();
    const tabla = await screen.findByRole('table');
    const filas = within(tabla).getAllByRole('row').slice(1);
    expect(within(filas[0]!).getByText('Espera larga')).toBeInTheDocument();
    expect(within(filas[1]!).queryByText('Espera larga')).not.toBeInTheDocument();
  });

  it('el asesor toma un caso pendiente y pasa a la pantalla del caso', async () => {
    conPantalla(true);
    let tomada = false;
    server.use(
      http.get(`${API}/asesorias/cola`, () => HttpResponse.json([fila()])),
      http.post(`${API}/asesorias/${ID}/tomar`, () => {
        tomada = true;
        return HttpResponse.json({ id: ID, estado: 'EN_ATENCION' });
      }),
    );
    const user = userEvent.setup();
    renderCola();
    await user.click(await screen.findByRole('button', { name: 'Tomar caso' }));
    expect(await screen.findByText('pantalla del caso')).toBeInTheDocument();
    expect(tomada).toBe(true);
  });

  it('si otro asesor la tomó antes (409), muestra el mensaje del backend, no navega y refresca la cola', async () => {
    conPantalla(true);
    let pedidosCola = 0;
    server.use(
      http.get(`${API}/asesorias/cola`, () => {
        pedidosCola += 1;
        return HttpResponse.json(pedidosCola === 1 ? [fila()] : [fila({ estado: 'EN_ATENCION', asignadoAMi: false })]);
      }),
      http.post(`${API}/asesorias/${ID}/tomar`, () => HttpResponse.json({ statusCode: 409, message: 'Otro asesor tomó este caso.' }, { status: 409 })),
    );
    const user = userEvent.setup();
    renderCola();
    await user.click(await screen.findByRole('button', { name: 'Tomar caso' }));
    expect(await screen.findByText('Otro asesor tomó este caso.')).toBeInTheDocument();
    expect(screen.queryByText('pantalla del caso')).not.toBeInTheDocument();
    // La cola se vuelve a pedir y ya no ofrece tomar ese caso.
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Tomar caso' })).not.toBeInTheDocument());
    expect(pedidosCola).toBeGreaterThan(1);
  });

  it('el administrador solo mira: no hay "Tomar caso" y lo dice', async () => {
    conPantalla(true);
    server.use(http.get(`${API}/asesorias/cola`, () => HttpResponse.json([fila()])));
    renderCola(['ADMINISTRADOR']);
    expect(await screen.findByText('Vista de solo lectura. Los casos los atienden los asesores.')).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: 'Ver caso' })).toHaveAttribute('href', `/app/asesorias/${ID}`);
    expect(screen.queryByRole('button', { name: 'Tomar caso' })).not.toBeInTheDocument();
  });

  it('un caso asignado a mí ofrece "Atender"', async () => {
    conPantalla(true);
    server.use(http.get(`${API}/asesorias/cola`, () => HttpResponse.json([fila({ estado: 'EN_ATENCION', asignadoAMi: true })])));
    renderCola();
    expect(await screen.findByRole('link', { name: 'Atender' })).toBeInTheDocument();
  });

  it('los filtros viajan al backend', async () => {
    conPantalla(true);
    const pedidos: string[] = [];
    server.use(
      http.get(`${API}/asesorias/cola`, ({ request }) => {
        pedidos.push(new URL(request.url).search);
        return HttpResponse.json([]);
      }),
    );
    const user = userEvent.setup();
    renderCola();
    await screen.findByText('No hay solicitudes con estos filtros.');
    await user.selectOptions(screen.getByLabelText('Estado'), 'EN_ATENCION');
    await user.selectOptions(screen.getByLabelText('Origen'), 'SISTEMA');
    await waitFor(() => expect(pedidos.at(-1)).toBe('?estado=EN_ATENCION&origen=SISTEMA'));
    expect(pedidos[0]).toBe('');
  });

  it('en móvil muestra tarjetas en vez de tabla', async () => {
    conPantalla(false);
    server.use(http.get(`${API}/asesorias/cola`, () => HttpResponse.json([fila()])));
    renderCola();
    expect(await screen.findByText('Ana Ríos · Toyota Corolla 2022')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tomar caso' })).toBeInTheDocument();
  });

  it('muestra el mensaje del backend si la cola no carga', async () => {
    conPantalla(true);
    server.use(http.get(`${API}/asesorias/cola`, () => HttpResponse.json({ statusCode: 500, message: 'Ocurrió un error en el servidor.' }, { status: 500 })));
    renderCola();
    expect(await screen.findByText('Ocurrió un error en el servidor.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reintentar/i })).toBeInTheDocument();
  });
});

/* ───────────────────────── Caso ───────────────────────── */

function renderCaso(roles: Rol[] = ['ASESOR']) {
  return renderConProviders(
    <>
      <Routes>
        <Route path="/app/asesorias/:id" element={<CasoDetallePage />} />
      </Routes>
      <Toaster />
    </>,
    { roles, ruta: `/app/asesorias/${ID}` },
  );
}

function mockCaso(c: SolicitudDetalle, simulacion: 'ninguna' | 'hay' = 'ninguna') {
  server.use(
    http.get(`${API}/asesorias/${ID}`, () => HttpResponse.json(c)),
    http.get(`${API}/cotizaciones/${COT}/prueba-choque`, () =>
      simulacion === 'hay'
        ? HttpResponse.json({
            simulacion: {
              id: 's1',
              zona: 'ALTA',
              moneda: 'USD',
              vigente: true,
              fecha: hace(3),
              ranking: [
                { primaCotizadaId: 'p1', aseguradora: 'Rímac', plan: 'Oro', prima: '640.40', desembolsoEsperado: '96.40', costoRealAnual: '736.80', peorCaso: '1500.00', datosCompletos: true, posicion: 1 },
              ],
              matriz: [],
              leyenda: 'Estimación referencial basada en condiciones resumidas.',
            },
          })
        : HttpResponse.json({ statusCode: 404, message: 'Esta cotización todavía no tiene Prueba de Choque' }, { status: 404 }),
    ),
  );
}

describe('CasoDetallePage', () => {
  it('muestra al cliente con su contacto, la cotización y los planes; los no disponibles se dicen', async () => {
    mockCaso(caso());
    renderCaso();
    expect(await screen.findByRole('heading', { name: 'Caso: Descuento' })).toBeInTheDocument();
    expect(screen.getByText('Ana Ríos')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '987654321' })).toHaveAttribute('href', 'tel:+51987654321');
    expect(screen.getByRole('link', { name: 'ana@example.com' })).toHaveAttribute('href', 'mailto:ana@example.com');
    expect(screen.getByText('Documento: 12345678')).toBeInTheDocument();
    expect(screen.getByText('Toyota Corolla 2022')).toBeInTheDocument();
    // El plan sale en la lista de planes cotizados y también como opción para negociar.
    expect(screen.getAllByText('Rímac · Plan Oro').length).toBeGreaterThan(0);
    // Sale en la lista de planes cotizados y también (apagado) en la de negociar.
    expect(screen.getAllByText('No disponible para este vehículo')).toHaveLength(2);
  });

  it('un caso pendiente se toma desde aquí y mientras tanto no se puede negociar ni cerrar', async () => {
    mockCaso(caso({ estado: 'PENDIENTE', asignadoAMi: false }));
    let tomada = false;
    server.use(
      http.post(`${API}/asesorias/${ID}/tomar`, () => {
        tomada = true;
        return HttpResponse.json({ id: ID, estado: 'EN_ATENCION' });
      }),
    );
    const user = userEvent.setup();
    renderCaso();
    expect(await screen.findByText('Solo el asesor que atiende el caso puede negociar descuentos.')).toBeInTheDocument();
    expect(screen.getByText('Solo el asesor que atiende el caso puede cerrarlo.')).toBeInTheDocument();
    expect(screen.getByText('Toma el caso para ver la Prueba de Choque de este cliente.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Tomar caso' }));
    await waitFor(() => expect(tomada).toBe(true));
  });

  it('negociar: el tope se ve siempre, el campo valida contra él y manda el porcentaje como texto', async () => {
    mockCaso(caso());
    let cuerpo: unknown = null;
    server.use(
      http.post(`${API}/asesorias/${ID}/descuentos`, async ({ request }) => {
        cuerpo = await request.json();
        return HttpResponse.json({ id: 'd1', planId: PLAN, tipo: 'NEGOCIADO', porcentaje: '8.50', aceptado: false, fecha: hace(0) }, { status: 201 });
      }),
    );
    const user = userEvent.setup();
    renderCaso();
    await screen.findByRole('heading', { name: 'Negociar descuento' });
    expect(screen.getByText('Máximo permitido: 10 %')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Aplicar descuento' }));
    expect(screen.getByText('Elige el plan al que le aplicas el descuento')).toBeInTheDocument();

    await user.click(screen.getByRole('radio', { name: /Rímac · Plan Oro/ }));
    await user.type(screen.getByLabelText(/porcentaje de descuento/i), '12');
    await user.click(screen.getByRole('button', { name: 'Aplicar descuento' }));
    expect(screen.getByText('El máximo permitido es 10 %')).toBeInTheDocument();
    expect(cuerpo).toBeNull();

    await user.clear(screen.getByLabelText(/porcentaje de descuento/i));
    await user.type(screen.getByLabelText(/porcentaje de descuento/i), '8.50');
    await user.click(screen.getByRole('button', { name: 'Aplicar descuento' }));
    expect(await screen.findByText('Descuento aplicado')).toBeInTheDocument();
    expect(cuerpo).toEqual({ planId: PLAN, porcentaje: '8.50' });
  });

  it('si el backend rechaza el descuento (p. ej. ya hay uno, RN-09), muestra su mensaje junto al campo', async () => {
    mockCaso(caso());
    server.use(
      http.post(`${API}/asesorias/${ID}/descuentos`, () =>
        HttpResponse.json({ statusCode: 409, message: 'Esta cotización ya tiene un descuento negociado' }, { status: 409 }),
      ),
    );
    const user = userEvent.setup();
    renderCaso();
    await screen.findByRole('heading', { name: 'Negociar descuento' });
    await user.click(screen.getByRole('radio', { name: /Rímac · Plan Oro/ }));
    await user.type(screen.getByLabelText(/porcentaje de descuento/i), '5');
    await user.click(screen.getByRole('button', { name: 'Aplicar descuento' }));
    expect(await screen.findByText('Esta cotización ya tiene un descuento negociado')).toBeInTheDocument();
  });

  it('muestra todos los planes con su precio para elegir; los no disponibles quedan apagados y se marca el que ya tiene descuento vigente', async () => {
    mockCaso(
      caso({
        descuentos: [{ id: 'd1', planId: PLAN, tipo: 'NEGOCIADO', porcentaje: '8.50', aceptado: true, fecha: hace(1) }],
      }),
    );
    renderCaso();
    const formulario = (await screen.findByRole('heading', { name: 'Negociar descuento' })).closest('section')!;
    const lista = within(formulario);
    const oro = lista.getByRole('radio', { name: /Rímac · Plan Oro/ });
    expect(oro).toBeEnabled();
    // Precios del backend, tal cual, y el descuento vigente en texto sobre su plan.
    expect(lista.getByLabelText('53 dólares con 37 centavos al mes')).toBeInTheDocument();
    expect(lista.getByLabelText('640 dólares con 40 centavos al año')).toBeInTheDocument();
    expect(lista.getByText('Descuento vigente: 8,5 %')).toBeInTheDocument();
    const apagado = lista.getByRole('radio', { name: /Qualitas · Plan Plus/ });
    expect(apagado).toBeDisabled();
    expect(lista.getByText('No disponible para este vehículo')).toBeInTheDocument();
  });

  it('el historial de descuentos dice en texto si fue aceptado', async () => {
    mockCaso(
      caso({
        descuentos: [
          { id: 'd1', planId: PLAN, tipo: 'NEGOCIADO', porcentaje: '8.50', aceptado: true, fecha: hace(1) },
          { id: 'd2', planId: PLAN, tipo: 'PRIMERA_COMPRA', porcentaje: '5.00', aceptado: false, fecha: hace(1) },
        ],
      }),
    );
    renderCaso();
    expect(await screen.findByText('Vigente')).toBeInTheDocument();
    expect(screen.getByText('No vigente')).toBeInTheDocument();
    expect(screen.getByText(/Solo queda vigente un descuento por cotización: el mayor/)).toBeInTheDocument();
    expect(screen.getByText('8,5 %')).toBeInTheDocument();
  });

  it('cerrar el caso pide el resultado, confirma y manda si el cliente aceptó', async () => {
    mockCaso(caso());
    let cuerpo: unknown = null;
    server.use(
      http.post(`${API}/asesorias/${ID}/resultado`, async ({ request }) => {
        cuerpo = await request.json();
        return HttpResponse.json({ id: ID, estado: 'CERRADA', resultado: 'Acordamos 8.5 %', acepta: true });
      }),
    );
    const user = userEvent.setup();
    renderCaso();
    await screen.findByRole('heading', { name: 'Cerrar el caso' });

    await user.click(screen.getByRole('button', { name: 'Cerrar caso' }));
    expect(screen.getByText('Describe el resultado de la atención')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await user.type(screen.getByLabelText(/resultado de la atención/i), '  Acordamos 8.5 %  ');
    await user.click(screen.getByRole('checkbox', { name: 'El cliente aceptó' }));
    await user.click(screen.getByRole('button', { name: 'Cerrar caso' }));
    const dialogo = await screen.findByRole('dialog', { name: '¿Cerrar este caso?' });
    expect(within(dialogo).getByText(/el cliente aceptó/i)).toBeInTheDocument();
    await user.click(within(dialogo).getByRole('button', { name: 'Cerrar caso' }));
    expect(await screen.findByText('Caso cerrado')).toBeInTheDocument();
    expect(cuerpo).toEqual({ resultado: 'Acordamos 8.5 %', acepta: true });
  });

  it('un caso cerrado muestra su resultado y no ofrece actuar', async () => {
    mockCaso(caso({ estado: 'CERRADA', resultado: 'El cliente prefirió esperar' }));
    renderCaso();
    expect(await screen.findByText('El cliente prefirió esperar')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Aplicar descuento' })).not.toBeInTheDocument();
    expect(screen.getByText('Solo el asesor que atiende el caso puede negociar descuentos.')).toBeInTheDocument();
  });

  it('un caso de otro asesor se ve sin poder actuar y avisa quién lo atiende', async () => {
    mockCaso(caso({ asignadoAMi: false }));
    renderCaso();
    expect(await screen.findByText('Este caso lo atiende otro asesor.')).toBeInTheDocument();
    expect(screen.getByText('Solo el asesor que atiende el caso puede cerrarlo.')).toBeInTheDocument();
  });

  it('el asesor del caso ve la Prueba de Choque del cliente; el administrador también, en solo lectura', async () => {
    mockCaso(caso(), 'hay');
    const { unmount } = renderCaso(['ASESOR']);
    expect(await screen.findByText(/1\. Rímac · Plan Oro/)).toBeInTheDocument();
    expect(screen.getByText('Estimación referencial basada en condiciones resumidas.')).toBeInTheDocument();
    unmount();

    mockCaso(caso({ asignadoAMi: false }), 'hay');
    renderCaso(['ADMINISTRADOR']);
    expect(await screen.findByText(/1\. Rímac · Plan Oro/)).toBeInTheDocument();
    expect(screen.getByText('Vista de solo lectura.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Tomar caso' })).not.toBeInTheDocument();
  });

  it('si el cliente aún no hizo la Prueba de Choque, lo dice', async () => {
    mockCaso(caso(), 'ninguna');
    renderCaso();
    expect(await screen.findByText('El cliente todavía no hizo la Prueba de Choque.')).toBeInTheDocument();
  });

  it('muestra el mensaje del backend si el caso no existe', async () => {
    server.use(http.get(`${API}/asesorias/${ID}`, () => HttpResponse.json({ statusCode: 404, message: 'La solicitud no existe' }, { status: 404 })));
    renderCaso();
    expect(await screen.findByText('La solicitud no existe')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /volver a la cola/i })).toHaveAttribute('href', '/app/asesorias');
  });
});

import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { Route, Routes, useLocation } from 'react-router-dom';
import { server } from '../../test/msw/server';
import { API } from '../../test/msw/handlers';
import { renderConProviders } from '../../test/render';
import { Toaster } from '../../shared/ui/toaster';
import { useCotizacionTokenStore } from '../../shared/stores/useCotizacionTokenStore';
import { marcarComoRetoma } from '../asesoria-retencion/retoma/retoma';
import type {
  ContenidoPlanContratado,
  EstadoCompra,
  PagoResponse,
  PolizaResumen,
  ResumenCompra,
} from '../../shared/types/api';
import { CompraPage } from './pages/CompraPage';
import { ConfirmacionPage } from './pages/ConfirmacionPage';
import { MisPolizasPage } from './pages/MisPolizasPage';

const COT = '7f1a2b3c-4d5e-4f60-8a7b-9c0d1e2f3a4b';
const PRIMA = '9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d';
const ORDEN = 'b1b2b3b4-c1c2-4d1d-8e1e-f1f2f3f4f5f6';
const POLIZA = 'c1c2c3c4-d1d2-4e1e-8f1f-a1a2a3a4a5a6';

const resumenMock = (extra: Partial<ResumenCompra> = {}): ResumenCompra => ({
  cotizacionId: COT,
  primaCotizadaId: PRIMA,
  ordenId: null,
  aseguradora: 'La Positiva',
  plan: 'Full',
  sumaAsegurada: '15000.00',
  primaAnual: '651.79',
  descuento: { tipo: 'PRIMERA_COMPRA', porcentaje: '5.00', provisional: true },
  primaFinal: '619.20',
  pago: {
    UNICO: { total: '619.20' },
    CUOTAS: { numeroCuotas: 12, total: '650.16', cuotaMensual: '54.18', recargoPorcentaje: '5.00' },
    maxCuotas: 12,
  },
  ...extra,
});

const contenidoMock: ContenidoPlanContratado = {
  planId: 'plan-1',
  aseguradora: 'La Positiva',
  plan: 'Full',
  resumen: 'Cobertura completa',
  descripcion: 'Todo lo que necesitas',
  idealPara: null,
  coberturas: [
    { codigo: 'DANO_CHOQUE', nombre: 'Daño propio por choque', categoria: 'DANOS_PROPIOS', incluida: true, detalle: null, limiteMonto: null },
    { codigo: 'RC', nombre: 'Responsabilidad civil', categoria: 'RESPONSABILIDAD', incluida: true, detalle: 'Hasta USD 200,000', limiteMonto: '200000.00' },
    { codigo: 'LUNAS', nombre: 'Rotura de lunas', categoria: 'ADICIONAL', incluida: false, detalle: null, limiteMonto: null },
  ],
  exclusiones: ['Conducir con alcohol sobre el límite legal'],
  requisitos: [{ tipo: 'CONDUCTOR', texto: 'Conductor habitual con licencia vigente', obligatorio: true }],
  congeladoEn: '2026-11-12T15:00:00-05:00',
};

const estadoMock = (extra: Partial<EstadoCompra> = {}): EstadoCompra => ({
  ordenId: ORDEN,
  cotizacionId: COT,
  primaCotizadaId: PRIMA,
  estado: 'CONFIRMADO',
  aseguradora: 'La Positiva',
  plan: 'Full',
  sumaAsegurada: '15000.00',
  primaAnual: '651.79',
  descuento: { tipo: 'PRIMERA_COMPRA', porcentaje: '5.00' },
  primaFinal: '619.20',
  canalVenta: 'AUTONOMO',
  fecha: '2026-11-12T15:00:00-05:00',
  pago: {
    modo: 'CUOTAS',
    montoTotal: '650.16',
    numeroCuotas: 2,
    cuotas: [
      { numero: 1, monto: '325.08', fechaVencimiento: '2026-11-12', estado: 'CONFIRMADO' },
      { numero: 2, monto: '325.08', fechaVencimiento: '2026-12-12', estado: 'PENDIENTE' },
    ],
  },
  pagosRechazados: 0,
  poliza: { id: POLIZA, numero: 'LAP-2026-A1B2C3D4', pdfDisponible: true },
  contenidoPlan: contenidoMock,
  ...extra,
});

const pagoOk = (): PagoResponse => ({
  compra: {
    estado: 'CONFIRMADO',
    ordenId: ORDEN,
    polizaId: POLIZA,
    numeroPoliza: 'LAP-2026-A1B2C3D4',
    montoTotal: '619.20',
    modo: 'UNICO',
    numeroCuotas: null,
    cuotas: [],
  },
});

/** Pantalla de destino: confirma que el asistente navegó a la confirmación. */
function Destino() {
  const { pathname } = useLocation();
  return <p>destino {pathname}</p>;
}

function renderCompra(ruta = `/compra/${COT}?prima=${PRIMA}`, roles: ('CLIENTE' | 'ASESOR')[] = ['CLIENTE']) {
  return renderConProviders(
    <>
      <Routes>
        <Route path="/compra/:cotizacionId" element={<CompraPage />} />
        <Route path="/compra/:id/listo" element={<Destino />} />
        <Route path="/cotizacion/:id" element={<p>comparativo</p>} />
      </Routes>
      <Toaster />
    </>,
    { roles, ruta },
  );
}

/** Mocks comunes del asistente. `claves` recoge las Idempotency-Key recibidas; `cuerpos`, los cuerpos de pago. */
function mockAsistente(opciones: {
  resumen?: ResumenCompra;
  faltantes?: { campo: 'numeroDocumento' | 'placa'; etiqueta: string; ayuda: string }[];
  pago?: () => Response | Promise<Response>;
}) {
  const claves: (string | null)[] = [];
  const cuerpos: unknown[] = [];
  let creada = false;
  server.use(
    http.get(`${API}/compras/resumen`, () =>
      HttpResponse.json(opciones.resumen ?? resumenMock(creada ? { ordenId: ORDEN, descuento: { tipo: 'PRIMERA_COMPRA', porcentaje: '5.00', provisional: false } } : {})),
    ),
    http.get(`${API}/compras/${COT}/campos-faltantes`, () => HttpResponse.json({ campos: opciones.faltantes ?? [] })),
    http.post(`${API}/compras`, async ({ request }) => {
      cuerpos.push(await request.json());
      creada = true;
      return HttpResponse.json(estadoMock({ estado: 'PENDIENTE_PAGO', pago: null, poliza: null }), { status: 201 });
    }),
    http.post(`${API}/compras/${ORDEN}/pago`, async ({ request }) => {
      claves.push(request.headers.get('Idempotency-Key'));
      cuerpos.push(await request.json());
      return opciones.pago ? opciones.pago() : HttpResponse.json(pagoOk(), { status: 201 });
    }),
  );
  return { claves, cuerpos };
}

const FALTANTES = [
  { campo: 'numeroDocumento' as const, etiqueta: 'Número de documento', ayuda: 'DNI de 8 dígitos o carné de extranjería' },
  { campo: 'placa' as const, etiqueta: 'Placa del vehículo', ayuda: 'Formato ABC-123' },
];

afterEach(() => vi.restoreAllMocks());

/* ───────────────────────── CompraPage: sesión y parámetros ───────────────────────── */

describe('CompraPage · quién puede comprar', () => {
  it('sin sesión ofrece crear la cuenta dentro del embudo', async () => {
    renderConProviders(<CompraPage />, { roles: [], ruta: `/compra/${COT}?prima=${PRIMA}` });
    expect(await screen.findByRole('heading', { name: 'Crea tu cuenta para comprar' })).toBeInTheDocument();
  });

  it('un asesor no compra', async () => {
    renderCompra(undefined, ['ASESOR']);
    expect(await screen.findByText(/no tienes acceso/i)).toBeInTheDocument();
  });

  it('sin el plan elegido en la dirección, manda a elegirlo en la cotización', async () => {
    renderCompra(`/compra/${COT}`);
    expect(await screen.findByText('Elige primero el plan que quieres comprar.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver los planes de mi cotización' })).toHaveAttribute('href', `/cotizacion/${COT}`);
  });
});

/* ───────────────────────── Asistente de compra ───────────────────────── */

describe('Asistente de compra', () => {
  it('muestra el resumen con los montos y el descuento tal como llegan del backend', async () => {
    mockAsistente({});
    renderCompra();

    const titulo = await screen.findByRole('heading', { name: 'Revisa tu compra' });
    // En escritorio el resumen también aparece en el lateral: se mira solo el paso.
    const paso = within(titulo.parentElement!);
    expect(paso.getByText('Plan Full')).toBeInTheDocument();
    expect(paso.getByLabelText('619 dólares con 20 centavos')).toBeInTheDocument();
    expect(paso.getByLabelText('651 dólares con 79 centavos')).toBeInTheDocument();
    expect(paso.getByText('Se aplicó tu 5 % de descuento por primera compra.')).toBeInTheDocument();
    expect(paso.getByText('Paso 1 de 3', { exact: false })).toBeInTheDocument();
  });

  it('si cotizó sin cuenta y entró con una cuenta que ya tenía, primero vincula la cotización (si no, "La cotización no existe")', async () => {
    useCotizacionTokenStore.getState().guardar(COT, 'token-anonimo');
    const orden: string[] = [];
    mockAsistente({});
    server.use(
      http.patch(`${API}/cotizaciones/${COT}/cliente`, ({ request }) => {
        orden.push(`vincular(${request.headers.get('X-Cotizacion-Token')})`);
        return HttpResponse.json({ cotizacionId: COT, clienteId: 'cli-1' });
      }),
      http.get(`${API}/compras/resumen`, () => {
        orden.push('resumen');
        return HttpResponse.json(resumenMock());
      }),
    );
    renderCompra();
    expect(await screen.findByRole('heading', { name: 'Revisa tu compra' })).toBeInTheDocument();
    expect(orden).toEqual(['vincular(token-anonimo)', 'resumen']);
    useCotizacionTokenStore.getState().limpiar();
  });

  it('si la cotización es de otra cuenta, muestra el mensaje del backend y no carga la compra', async () => {
    useCotizacionTokenStore.getState().guardar(COT, 'token-anonimo');
    mockAsistente({});
    server.use(
      http.patch(`${API}/cotizaciones/${COT}/cliente`, () =>
        HttpResponse.json({ statusCode: 403, message: 'Esta cotización pertenece a otra cuenta' }, { status: 403 }),
      ),
    );
    renderCompra();
    expect(await screen.findByText('Esta cotización pertenece a otra cuenta')).toBeInTheDocument();
    useCotizacionTokenStore.getState().limpiar();
  });

  it('si el backend rechaza el plan, muestra su mensaje tal cual y deja volver', async () => {
    server.use(
      http.get(`${API}/compras/resumen`, () =>
        HttpResponse.json({ statusCode: 409, message: 'Ya iniciaste tu compra con otro plan de esta cotización' }, { status: 409 }),
      ),
      http.get(`${API}/compras/${COT}/campos-faltantes`, () => HttpResponse.json({ campos: [] })),
    );
    renderCompra();
    expect(await screen.findByText('Ya iniciaste tu compra con otro plan de esta cotización')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Volver a mi cotización' })).toBeInTheDocument();
  });

  it('pide solo los datos que faltan, con los errores del backend por campo', async () => {
    const user = userEvent.setup();
    mockAsistente({ faltantes: FALTANTES });
    let enviado: unknown = null;
    server.use(
      http.put(`${API}/compras/${COT}/datos`, async ({ request }) => {
        enviado = await request.json();
        const cuerpo = enviado as { numeroDocumento?: string };
        if (cuerpo.numeroDocumento === '123') {
          return HttpResponse.json(
            { statusCode: 400, message: 'Datos no válidos', errors: [{ campo: 'numeroDocumento', mensaje: 'El número de documento debe tener 8 dígitos (DNI) o de 9 a 12 caracteres' }] },
            { status: 400 },
          );
        }
        return HttpResponse.json({ numeroDocumento: '****5678', placa: 'ABC-123', camposFaltantes: [] });
      }),
    );
    renderCompra();

    await user.click(await screen.findByRole('button', { name: 'Continuar' }));
    expect(screen.getByRole('heading', { name: 'Faltan unos datos' })).toBeInTheDocument();
    expect(screen.getByText('Paso 2 de 4', { exact: false })).toBeInTheDocument();

    // Vacío: lo pide el propio formulario, sin llamar al backend.
    await user.click(screen.getByRole('button', { name: 'Guardar y continuar' }));
    expect(screen.getByText('Ingresa número de documento')).toBeInTheDocument();
    expect(screen.getByText('Ingresa placa del vehículo')).toBeInTheDocument();
    expect(enviado).toBeNull();

    // Formato inválido: el mensaje es el del backend.
    await user.type(screen.getByLabelText(/Número de documento/), '123');
    await user.type(screen.getByLabelText(/Placa del vehículo/), 'abc-123');
    await user.click(screen.getByRole('button', { name: 'Guardar y continuar' }));
    expect(await screen.findByText('El número de documento debe tener 8 dígitos (DNI) o de 9 a 12 caracteres')).toBeInTheDocument();

    await user.clear(screen.getByLabelText(/Número de documento/));
    await user.type(screen.getByLabelText(/Número de documento/), '12345678');
    await user.click(screen.getByRole('button', { name: 'Guardar y continuar' }));
    expect(await screen.findByRole('heading', { name: 'Firma y condiciones' })).toBeInTheDocument();
    expect(enviado).toEqual({ numeroDocumento: '12345678', placa: 'ABC-123' });
  });

  it('sin datos pendientes se salta directo a la firma (RNF-08)', async () => {
    const user = userEvent.setup();
    mockAsistente({});
    renderCompra();
    await user.click(await screen.findByRole('button', { name: 'Continuar' }));
    expect(screen.getByRole('heading', { name: 'Firma y condiciones' })).toBeInTheDocument();
    expect(screen.getByText('Paso 2 de 3', { exact: false })).toBeInTheDocument();
  });

  it('exige firma y aceptación antes de crear la compra', async () => {
    const user = userEvent.setup();
    const { cuerpos } = mockAsistente({});
    renderCompra();
    await user.click(await screen.findByRole('button', { name: 'Continuar' }));

    await user.click(screen.getByRole('button', { name: 'Firmar y continuar' }));
    expect(screen.getByText('Escribe tu nombre completo como firma')).toBeInTheDocument();
    expect(screen.getByText('Debes aceptar las condiciones para continuar')).toBeInTheDocument();
    expect(cuerpos).toHaveLength(0);

    await user.type(screen.getByLabelText(/Tu firma/), '  Ana Cliente  ');
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: 'Firmar y continuar' }));

    expect(await screen.findByRole('heading', { name: 'Elige cómo pagar' })).toBeInTheDocument();
    expect(cuerpos[0]).toEqual({ cotizacionId: COT, primaCotizadaId: PRIMA, aceptaCondiciones: true, firmaSimulada: 'Ana Cliente' });
  });

  it('una compra que llegó por el enlace de retoma manda origen RETOMA al crear la orden', async () => {
    marcarComoRetoma(COT);
    const user = userEvent.setup();
    const { cuerpos } = mockAsistente({});
    renderCompra();
    await user.click(await screen.findByRole('button', { name: 'Continuar' }));
    await user.type(screen.getByLabelText(/Tu firma/), 'Ana Cliente');
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: 'Firmar y continuar' }));
    await screen.findByRole('heading', { name: 'Elige cómo pagar' });
    expect(cuerpos[0]).toMatchObject({ cotizacionId: COT, origen: 'RETOMA' });
  });

  it('si crear la compra falla con 409, muestra el mensaje del backend y vuelve al comparativo', async () => {
    const user = userEvent.setup();
    mockAsistente({});
    server.use(
      http.post(`${API}/compras`, () =>
        HttpResponse.json({ statusCode: 409, message: 'El contenido del plan está incompleto. CONTENIDO_PLAN_INCOMPLETO' }, { status: 409 }),
      ),
    );
    renderCompra();
    await user.click(await screen.findByRole('button', { name: 'Continuar' }));
    await user.type(screen.getByLabelText(/Tu firma/), 'Ana Cliente');
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: 'Firmar y continuar' }));

    expect(await screen.findByText(/El contenido del plan está incompleto/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Volver al comparativo' })).toHaveAttribute('href', `/cotizacion/${COT}`);
  });

  async function llegarAlPago(user: ReturnType<typeof userEvent.setup>) {
    await user.click(await screen.findByRole('button', { name: 'Continuar' }));
    await user.type(screen.getByLabelText(/Tu firma/), 'Ana Cliente');
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: 'Firmar y continuar' }));
    await screen.findByRole('heading', { name: 'Elige cómo pagar' });
  }

  it('paga al contado: manda la Idempotency-Key y navega a la confirmación', async () => {
    const user = userEvent.setup();
    const { claves, cuerpos } = mockAsistente({});
    renderCompra();
    await llegarAlPago(user);

    // El total y la cuota son los del backend, sin cálculo en el navegador.
    expect(screen.getByText('12 cuotas mensuales')).toBeInTheDocument();
    expect(screen.getByLabelText('54 dólares con 18 centavos al mes')).toBeInTheDocument();
    expect(screen.getByText('Pagar en cuotas tiene un recargo de 5 % en La Positiva.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Pagar USD 619.20' }));
    expect(await screen.findByText(`destino /compra/${ORDEN}/listo`)).toBeInTheDocument();
    expect(claves).toHaveLength(1);
    expect(claves[0]).toMatch(/^[A-Za-z0-9_.:-]{8,100}$/);
    expect(cuerpos.at(-1)).toEqual({ modo: 'UNICO' });
  });

  it('paga en cuotas con el total del backend y el número de cuotas que ofrece', async () => {
    const user = userEvent.setup();
    const { cuerpos } = mockAsistente({});
    renderCompra();
    await llegarAlPago(user);

    await user.click(screen.getByRole('radio', { name: /12 cuotas/ }));
    expect(screen.getByText(/Hoy pagas solo tu 1\.ª cuota/)).toHaveTextContent('Las otras 11 cuotas');
    await user.click(screen.getByRole('button', { name: 'Pagar mi 1.ª cuota: USD 54.18' }));
    expect(await screen.findByText(`destino /compra/${ORDEN}/listo`)).toBeInTheDocument();
    expect(cuerpos.at(-1)).toEqual({ modo: 'CUOTAS', numeroCuotas: 12 });
  });

  it('sin cuotas disponibles solo ofrece el pago único', async () => {
    const user = userEvent.setup();
    mockAsistente({ resumen: resumenMock({ pago: { UNICO: { total: '619.20' }, CUOTAS: null, maxCuotas: 1 } }) });
    renderCompra();
    await llegarAlPago(user);
    expect(screen.getByRole('radio', { name: /Pago único/ })).toBeChecked();
    expect(screen.queryByRole('radio', { name: /cuotas/ })).not.toBeInTheDocument();
  });

  it('un pago rechazado muestra el aviso con el mensaje del backend y el siguiente intento usa otra clave', async () => {
    const user = userEvent.setup();
    let intento = 0;
    const { claves } = mockAsistente({
      pago: () => {
        intento += 1;
        return intento === 1
          ? HttpResponse.json({ statusCode: 400, message: 'El pago fue rechazado. Revisa los datos de tu medio de pago o intenta con otro.' }, { status: 400 })
          : HttpResponse.json(pagoOk(), { status: 201 });
      },
    });
    renderCompra();
    await llegarAlPago(user);

    await user.click(screen.getByRole('button', { name: 'Pagar USD 619.20' }));
    const alerta = await screen.findByRole('alert');
    expect(alerta).toHaveTextContent('Tu pago no pudo procesarse');
    expect(alerta).toHaveTextContent('El pago fue rechazado. Revisa los datos de tu medio de pago o intenta con otro.');

    await user.click(screen.getByRole('button', { name: 'Intentar con otro medio' }));
    expect(await screen.findByText(`destino /compra/${ORDEN}/listo`)).toBeInTheDocument();
    expect(claves).toHaveLength(2);
    expect(claves[0]).not.toBe(claves[1]);
  });

  it('si falla la red, el reintento conserva la misma clave (no hay doble cobro)', async () => {
    const user = userEvent.setup();
    let intento = 0;
    const { claves } = mockAsistente({
      pago: () => {
        intento += 1;
        return intento === 1 ? HttpResponse.json({ statusCode: 500, message: 'Ocurrió un error en el servidor.' }, { status: 500 }) : HttpResponse.json(pagoOk(), { status: 201 });
      },
    });
    renderCompra();
    await llegarAlPago(user);

    await user.click(screen.getByRole('button', { name: 'Pagar USD 619.20' }));
    await waitFor(() => expect(claves).toHaveLength(1));
    // El error de servidor no es un rechazo: no aparece el aviso de pago rechazado.
    await waitFor(() => expect(screen.getByRole('button', { name: 'Pagar USD 619.20' })).toBeEnabled());
    expect(screen.queryByText('Tu pago no pudo procesarse')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Pagar USD 619.20' }));
    expect(await screen.findByText(`destino /compra/${ORDEN}/listo`)).toBeInTheDocument();
    expect(claves).toHaveLength(2);
    expect(claves[0]).toBe(claves[1]);
  });

  it('si el pago llega con PDF en generación, avisa con un toast ámbar y la compra sigue adelante', async () => {
    const user = userEvent.setup();
    mockAsistente({
      pago: () =>
        HttpResponse.json({ ...pagoOk(), warning: { code: 'PDF_EN_GENERACION', message: 'Tu póliza se está generando. Vuelve a intentarlo en unos segundos.' } }, { status: 201 }),
    });
    renderCompra();
    await llegarAlPago(user);
    await user.click(screen.getByRole('button', { name: 'Pagar USD 619.20' }));
    expect(await screen.findByText(`destino /compra/${ORDEN}/listo`)).toBeInTheDocument();
    expect(await screen.findByText('Tu póliza se está generando. Vuelve a intentarlo en unos segundos.')).toBeInTheDocument();
  });

  it('retomar una compra ya iniciada va directo al pago, sin pedir otra firma', async () => {
    mockAsistente({ resumen: resumenMock({ ordenId: ORDEN, descuento: { tipo: 'PRIMERA_COMPRA', porcentaje: '5.00', provisional: false } }) });
    server.use(
      http.get(`${API}/compras/${ORDEN}/estado`, () => HttpResponse.json(estadoMock({ estado: 'PENDIENTE_PAGO', pago: null, poliza: null }))),
    );
    const user = userEvent.setup();
    renderCompra();
    await user.click(await screen.findByRole('button', { name: 'Continuar' }));
    expect(screen.getByRole('heading', { name: 'Elige cómo pagar' })).toBeInTheDocument();
    expect(screen.getByText('Paso 2 de 2', { exact: false })).toBeInTheDocument();
  });

  it('una compra ya pagada lleva directo a la confirmación', async () => {
    mockAsistente({ resumen: resumenMock({ ordenId: ORDEN }) });
    server.use(http.get(`${API}/compras/${ORDEN}/estado`, () => HttpResponse.json(estadoMock())));
    renderCompra();
    expect(await screen.findByText(`destino /compra/${ORDEN}/listo`)).toBeInTheDocument();
  });
});

/* ───────────────────────── Confirmación ───────────────────────── */

function renderConfirmacion() {
  return renderConProviders(
    <>
      <Routes>
        <Route path="/compra/:id/listo" element={<ConfirmacionPage />} />
        <Route path="/compra/:cotizacionId" element={<Destino />} />
      </Routes>
      <Toaster />
    </>,
    { roles: ['CLIENTE'], ruta: `/compra/${ORDEN}/listo` },
  );
}

describe('ConfirmacionPage', () => {
  it('celebra con sobriedad: número de póliza, montos del backend, cuotas y lo contratado', async () => {
    server.use(http.get(`${API}/compras/${ORDEN}/estado`, () => HttpResponse.json(estadoMock())));
    const user = userEvent.setup();
    renderConfirmacion();

    expect(await screen.findByRole('heading', { name: '¡Listo! Tu seguro está activo' })).toBeInTheDocument();
    expect(screen.getByText('LAP-2026-A1B2C3D4')).toBeInTheDocument();
    expect(screen.getByLabelText('650 dólares con 16 centavos')).toBeInTheDocument();
    expect(screen.getByText('2 cuotas')).toBeInTheDocument();
    // En cuotas no parece que todo esté pagado: se separa lo pagado hoy del total del plan.
    expect(screen.getByText('Pagado hoy (1.ª cuota)')).toBeInTheDocument();
    expect(screen.getByLabelText('325 dólares con 8 centavos')).toBeInTheDocument();
    expect(screen.getByText('Cuotas por pagar').nextSibling).toHaveTextContent('1');
    expect(screen.queryByText('Total pagado')).not.toBeInTheDocument();
    expect(screen.getByText('Documento de demostración sin validez legal')).toBeInTheDocument();

    expect(screen.queryByRole('list', { name: 'Cronograma de cuotas' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Ver cronograma de cuotas' }));
    const cuotas = screen.getByRole('list', { name: 'Cronograma de cuotas' });
    expect(cuotas).toHaveTextContent('Cuota 1');
    expect(cuotas).toHaveTextContent('Pagada');
    expect(cuotas).toHaveTextContent('Pendiente');

    // RN-45 y RN-46: lo contratado con su fecha y la leyenda.
    expect(screen.getByText(/Este es el contenido del plan que contrataste el 12 de noviembre de 2026/)).toBeInTheDocument();
    expect(screen.getByText('Daño propio por choque')).toBeInTheDocument();
    expect(screen.getByText('Rotura de lunas')).toBeInTheDocument();
    expect(screen.getByText('Contenido ilustrativo; no es el condicionado de la aseguradora.')).toBeInTheDocument();
  });

  it('descarga el PDF de la póliza', async () => {
    server.use(
      http.get(`${API}/compras/${ORDEN}/estado`, () => HttpResponse.json(estadoMock())),
      http.get(`${API}/polizas/${POLIZA}/pdf`, () =>
        new HttpResponse(new Uint8Array([37, 80, 68, 70]), {
          headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename="poliza-LAP-2026-A1B2C3D4.pdf"' },
        }),
      ),
    );
    const crear = vi.fn(() => 'blob:prueba');
    Object.assign(URL, { createObjectURL: crear, revokeObjectURL: vi.fn() });
    const clic = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const user = userEvent.setup();
    renderConfirmacion();

    await user.click(await screen.findByRole('button', { name: 'Descargar mi póliza (PDF)' }));
    await waitFor(() => expect(clic).toHaveBeenCalled());
    expect(crear).toHaveBeenCalledOnce();
  });

  it('si el PDF aún se genera (202), avisa con un toast ámbar y no descarga nada', async () => {
    server.use(
      http.get(`${API}/compras/${ORDEN}/estado`, () => HttpResponse.json(estadoMock({ poliza: { id: POLIZA, numero: 'LAP-2026-A1B2C3D4', pdfDisponible: false } }))),
      http.get(`${API}/polizas/${POLIZA}/pdf`, () =>
        HttpResponse.json({ warning: { code: 'PDF_EN_GENERACION', message: 'Tu póliza se está generando. Vuelve a intentarlo en unos segundos.' } }, { status: 202 }),
      ),
    );
    const clic = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const user = userEvent.setup();
    renderConfirmacion();

    // Antes de pedir nada, el estado se explica con texto.
    expect(await screen.findByText(/Tu póliza se está generando; si no baja ahora/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Descargar mi póliza (PDF)' }));
    expect(await screen.findByText('Tu póliza se está generando. Vuelve a intentarlo en unos segundos.')).toBeInTheDocument();
    expect(clic).not.toHaveBeenCalled();
  });

  it('una orden sin pagar no se celebra: ofrece continuar con el pago', async () => {
    server.use(http.get(`${API}/compras/${ORDEN}/estado`, () => HttpResponse.json(estadoMock({ estado: 'PENDIENTE_PAGO', pago: null, poliza: null }))));
    renderConfirmacion();
    expect(await screen.findByRole('heading', { name: 'Tu compra aún no está pagada' })).toBeInTheDocument();
    expect(screen.queryByText('¡Listo! Tu seguro está activo')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Continuar con el pago' })).toHaveAttribute('href', `/compra/${COT}?prima=${PRIMA}`);
  });

  it('muestra el mensaje del backend si la compra no existe', async () => {
    server.use(http.get(`${API}/compras/${ORDEN}/estado`, () => HttpResponse.json({ statusCode: 404, message: 'La compra no existe' }, { status: 404 })));
    renderConfirmacion();
    expect(await screen.findByText('La compra no existe')).toBeInTheDocument();
  });
});

/* ───────────────────────── Mis pólizas ───────────────────────── */

const polizaMock = (extra: Partial<PolizaResumen> = {}): PolizaResumen => ({
  id: POLIZA,
  numero: 'LAP-2026-A1B2C3D4',
  fechaEmision: '2026-11-12T15:00:00-05:00',
  aseguradora: 'La Positiva',
  plan: 'Full',
  vehiculo: { marca: 'Toyota', modelo: 'Corolla', anio: 2022, placa: 'ABC-123' },
  sumaAsegurada: '15000.00',
  primaFinal: '619.20',
  pago: { modo: 'UNICO', montoTotal: '619.20', numeroCuotas: null },
  pdfDisponible: true,
  contenidoPlan: contenidoMock,
  ...extra,
});

describe('MisPolizasPage', () => {
  it('lista las pólizas con su número, estado y descarga', async () => {
    server.use(http.get(`${API}/polizas/mias`, () => HttpResponse.json([polizaMock()])));
    renderConProviders(<MisPolizasPage />, { roles: ['CLIENTE'], ruta: '/mi-cuenta/polizas' });

    expect(await screen.findByText('Plan Full')).toBeInTheDocument();
    expect(screen.getByText('Toyota Corolla 2022 · ABC-123')).toBeInTheDocument();
    expect(screen.getByText('LAP-2026-A1B2C3D4')).toBeInTheDocument();
    expect(screen.getByText('Activa')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Descargar mi póliza (PDF)' })).toBeInTheDocument();
    expect(screen.getByText('Total pagado')).toBeInTheDocument();
  });

  it('en cuotas rotula el total con el número de cuotas', async () => {
    server.use(http.get(`${API}/polizas/mias`, () => HttpResponse.json([polizaMock({ pago: { modo: 'CUOTAS', montoTotal: '650.16', numeroCuotas: 12 } })])));
    renderConProviders(<MisPolizasPage />, { roles: ['CLIENTE'], ruta: '/mi-cuenta/polizas' });
    expect(await screen.findByText('Total del plan de 12 cuotas')).toBeInTheDocument();
    expect(screen.getByLabelText('650 dólares con 16 centavos')).toBeInTheDocument();
  });

  it('sin pólizas muestra el estado vacío con una acción', async () => {
    server.use(http.get(`${API}/polizas/mias`, () => HttpResponse.json([])));
    renderConProviders(<MisPolizasPage />, { roles: ['CLIENTE'], ruta: '/mi-cuenta/polizas' });
    expect(await screen.findByText('Aún no tienes pólizas.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver mis cotizaciones' })).toBeInTheDocument();
  });

  it('si falla la carga, muestra el mensaje del backend y permite reintentar', async () => {
    server.use(http.get(`${API}/polizas/mias`, () => HttpResponse.json({ statusCode: 500, message: 'Ocurrió un error en el servidor.' }, { status: 500 })));
    renderConProviders(<MisPolizasPage />, { roles: ['CLIENTE'], ruta: '/mi-cuenta/polizas' });
    expect(await screen.findByText('Ocurrió un error en el servidor.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Reintentar/ })).toBeInTheDocument();
  });
});

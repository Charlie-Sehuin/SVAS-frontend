import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { Route, Routes } from 'react-router-dom';
import { server } from '../../test/msw/server';
import { API } from '../../test/msw/handlers';
import { renderConProviders } from '../../test/render';
import { Toaster } from '../../shared/ui/toaster';
import type { SeguimientoDetalle, SeguimientoEnLista } from '../../shared/types/api';
import type { Rol } from '../../shared/types/enums';
import { SeguimientoDetallePage } from './asesor/pages/SeguimientoDetallePage';
import { SeguimientosPage } from './asesor/pages/SeguimientosPage';

const ID = 'dddddddd-4444-4444-8444-dddddddddddd';
const COT = '7f1a2b3c-4d5e-4f60-8a7b-9c0d1e2f3a4b';
const hace = (dias: number) => new Date(Date.now() - dias * 86_400_000).toISOString();

const fila = (extra: Partial<SeguimientoEnLista> = {}): SeguimientoEnLista => ({
  id: ID,
  estado: 'EN_SEGUIMIENTO',
  intentos: 1,
  fechaApertura: hace(1),
  fechaCierre: null,
  motivoCierre: null,
  cotizacion: { id: COT, fecha: hace(2), estado: 'NO_CONCRETADA', vehiculo: 'Toyota Corolla 2022' },
  cliente: { nombre: 'Ana Ríos', telefono: '*****4321', email: 'a***@example.com', canalPreferido: 'WHATSAPP', numeroDocumento: '****5678' },
  ...extra,
});

const seguimiento = (extra: Partial<SeguimientoDetalle> = {}): SeguimientoDetalle => ({
  id: ID,
  estado: 'EN_SEGUIMIENTO',
  intentos: 2,
  maxIntentos: 4,
  diasSeguimiento: 7,
  fechaApertura: hace(2),
  fechaCierre: null,
  motivoCierre: null,
  cotizacion: { id: COT, fecha: hace(3), estado: 'NO_CONCRETADA', vehiculo: 'Toyota Corolla 2022' },
  cliente: { nombres: 'Ana', apellidos: 'Ríos', telefono: '987654321', email: 'ana@example.com', canalPreferido: 'WHATSAPP', numeroDocumento: '****5678' },
  historial: [
    { id: 'i1', canal: 'WHATSAPP', resultado: 'NO_RESPONDE', fecha: hace(1), asesorId: 'as-1' },
    { id: 'i2', canal: 'WHATSAPP', resultado: 'CONTACTADO', fecha: hace(0.5), asesorId: 'as-1' },
  ],
  primas: [{ planId: 'p1', plan: 'Oro', aseguradora: 'Rímac', disponible: true, sumaAsegurada: '15000.00', prima: '640.40', primaMensual: '53.37' }],
  descuentos: [],
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

/* ───────────────────────── Lista ───────────────────────── */

function renderLista(roles: Rol[] = ['ASESOR']) {
  return renderConProviders(
    <Routes>
      <Route path="/app/seguimientos" element={<SeguimientosPage />} />
    </Routes>,
    { roles, ruta: '/app/seguimientos' },
  );
}

describe('SeguimientosPage', () => {
  it('lista los seguimientos abiertos con intentos y estado en texto; el asesor ve "Atender"', async () => {
    conPantalla(true);
    server.use(http.get(`${API}/seguimientos`, () => HttpResponse.json([fila({ intentos: 3 })])));
    renderLista();
    const tabla = await screen.findByRole('table', { name: /seguimientos de cotizaciones/i });
    const filaUno = within(tabla).getAllByRole('row')[1]!;
    expect(within(filaUno).getByText('Ana Ríos')).toBeInTheDocument();
    expect(within(filaUno).getByText('Toyota Corolla 2022')).toBeInTheDocument();
    expect(within(filaUno).getByText('3')).toBeInTheDocument();
    expect(within(filaUno).getByText('En seguimiento')).toBeInTheDocument();
    expect(within(filaUno).getByRole('link', { name: 'Atender' })).toHaveAttribute('href', `/app/seguimientos/${ID}`);
  });

  it('el filtro de estado viaja al backend y un cerrado dice su motivo', async () => {
    conPantalla(true);
    const pedidos: string[] = [];
    server.use(
      http.get(`${API}/seguimientos`, ({ request }) => {
        const search = new URL(request.url).search;
        pedidos.push(search);
        return HttpResponse.json(search ? [fila({ estado: 'DESCARTADO', motivoCierre: 'PRECIO', fechaCierre: hace(0) })] : []);
      }),
    );
    const user = userEvent.setup();
    renderLista();
    await screen.findByText('No hay seguimientos con este estado.');
    await user.selectOptions(screen.getByLabelText('Estado'), 'DESCARTADO');
    expect(await screen.findByText('Descartado')).toBeInTheDocument();
    expect(screen.getByText('Precio')).toBeInTheDocument();
    expect(pedidos).toEqual(['', '?estado=DESCARTADO']);
    // Un seguimiento cerrado solo se mira.
    expect(screen.getByRole('link', { name: 'Ver' })).toBeInTheDocument();
  });

  it('el administrador solo mira', async () => {
    conPantalla(true);
    server.use(http.get(`${API}/seguimientos`, () => HttpResponse.json([fila()])));
    renderLista(['ADMINISTRADOR']);
    expect(await screen.findByRole('link', { name: 'Ver' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Atender' })).not.toBeInTheDocument();
    expect(screen.getByText('Vista de solo lectura. Los seguimientos los atienden los asesores.')).toBeInTheDocument();
  });

  it('en móvil son tarjetas', async () => {
    conPantalla(false);
    server.use(http.get(`${API}/seguimientos`, () => HttpResponse.json([fila({ intentos: 1 })])));
    renderLista();
    expect(await screen.findByText(/1 intento · abierto/)).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('muestra el mensaje del backend si no carga', async () => {
    conPantalla(true);
    server.use(http.get(`${API}/seguimientos`, () => HttpResponse.json({ statusCode: 500, message: 'Ocurrió un error en el servidor.' }, { status: 500 })));
    renderLista();
    expect(await screen.findByText('Ocurrió un error en el servidor.')).toBeInTheDocument();
  });
});

/* ───────────────────────── Detalle ───────────────────────── */

function renderDetalle(roles: Rol[] = ['ASESOR']) {
  return renderConProviders(
    <>
      <Routes>
        <Route path="/app/seguimientos/:id" element={<SeguimientoDetallePage />} />
      </Routes>
      <Toaster />
    </>,
    { roles, ruta: `/app/seguimientos/${ID}` },
  );
}

function mockDetalle(s: SeguimientoDetalle) {
  server.use(http.get(`${API}/seguimientos/${ID}`, () => HttpResponse.json(s)));
}

describe('SeguimientoDetallePage', () => {
  it('muestra el contador de intentos con el plazo, el historial y los datos del cliente', async () => {
    mockDetalle(seguimiento());
    renderDetalle();
    expect(await screen.findByText(/Intentos: 2 de 4/)).toHaveTextContent('quedan 5 días');
    expect(screen.getByRole('link', { name: '987654321' })).toHaveAttribute('href', 'tel:+51987654321');
    const historial = within(screen.getByRole('list', { name: 'Historial de intentos' }));
    expect(historial.getAllByRole('listitem')).toHaveLength(2);
    expect(historial.getByText('No respondió')).toBeInTheDocument();
    expect(historial.getByText('Contactado')).toBeInTheDocument();
  });

  it('solo el canal preferido está habilitado y el otro dice por qué', async () => {
    mockDetalle(seguimiento({ cliente: { ...seguimiento().cliente, canalPreferido: 'LLAMADA' } }));
    renderDetalle();
    await screen.findByRole('heading', { name: 'Registrar intento de contacto' });
    expect(screen.getByRole('radio', { name: /Llamada/ })).toBeChecked();
    const whatsapp = screen.getByRole('radio', { name: /WhatsApp/ });
    expect(whatsapp).toBeDisabled();
    expect(screen.getByText('No es el preferido')).toBeInTheDocument();
    expect(whatsapp.closest('label')).toHaveAttribute('title', expect.stringContaining('Solo puedes usar el canal que el cliente prefiere'));
  });

  it('registra un intento por el canal preferido, exige el resultado y avisa', async () => {
    mockDetalle(seguimiento());
    let cuerpo: unknown = null;
    server.use(
      http.post(`${API}/seguimientos/${ID}/intentos`, async ({ request }) => {
        cuerpo = await request.json();
        return HttpResponse.json({ intentos: 3, maxIntentos: 4, estado: 'EN_SEGUIMIENTO', motivoCierre: null }, { status: 201 });
      }),
    );
    const user = userEvent.setup();
    renderDetalle();
    await screen.findByRole('heading', { name: 'Registrar intento de contacto' });

    await user.click(screen.getByRole('button', { name: 'Registrar intento' }));
    expect(screen.getByText('Elige cómo te fue en el intento')).toBeInTheDocument();
    expect(cuerpo).toBeNull();

    await user.click(screen.getByRole('radio', { name: 'Aceptó' }));
    await user.click(screen.getByRole('button', { name: 'Registrar intento' }));
    expect(await screen.findByText('Ahora puedes enviarle el enlace de compra.')).toBeInTheDocument();
    expect(cuerpo).toEqual({ canal: 'WHATSAPP', resultado: 'ACEPTA' });
  });

  it('al llegar al máximo sin aceptación, el backend lo cierra y si el mensaje final no salió, avisa en ámbar', async () => {
    mockDetalle(seguimiento({ intentos: 3 }));
    server.use(
      http.post(`${API}/seguimientos/${ID}/intentos`, () =>
        HttpResponse.json(
          {
            intentos: 4,
            maxIntentos: 4,
            estado: 'DESCARTADO',
            motivoCierre: 'NO_RESPONDE',
            warning: { code: 'MENSAJE_NO_ENVIADO', message: 'El seguimiento se cerró, pero no pudimos enviar el mensaje final al cliente.' },
          },
          { status: 201 },
        ),
      ),
    );
    const user = userEvent.setup();
    renderDetalle();
    await screen.findByRole('heading', { name: 'Registrar intento de contacto' });
    await user.click(screen.getByRole('radio', { name: 'No respondió' }));
    await user.click(screen.getByRole('button', { name: 'Registrar intento' }));
    expect(await screen.findByText('Se alcanzó el máximo de intentos: el seguimiento se cerró.')).toBeInTheDocument();
    expect(await screen.findByText('El seguimiento se cerró, pero no pudimos enviar el mensaje final al cliente.')).toBeInTheDocument();
  });

  it('con el máximo de intentos ya alcanzado bloquea el registro y dice por qué', async () => {
    mockDetalle(seguimiento({ intentos: 4 }));
    renderDetalle();
    expect(await screen.findByText(/Se alcanzó el máximo de 4 intentos/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Registrar intento' })).not.toBeInTheDocument();
    // Cerrar sigue disponible.
    expect(screen.getByRole('button', { name: 'Cerrar seguimiento' })).toBeInTheDocument();
  });

  it('con el plazo vencido bloquea el registro y lo dice', async () => {
    mockDetalle(seguimiento({ fechaApertura: hace(9), diasSeguimiento: 7 }));
    renderDetalle();
    expect(await screen.findByText(/Pasaron los 7 días del seguimiento/)).toBeInTheDocument();
    expect(screen.getByText(/se acabó el plazo/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Registrar intento' })).not.toBeInTheDocument();
  });

  it('si el backend rechaza el intento, muestra su mensaje', async () => {
    mockDetalle(seguimiento());
    server.use(
      http.post(`${API}/seguimientos/${ID}/intentos`, () =>
        HttpResponse.json({ statusCode: 400, message: 'Solo puedes contactar al cliente por su canal preferido' }, { status: 400 }),
      ),
    );
    const user = userEvent.setup();
    renderDetalle();
    await screen.findByRole('heading', { name: 'Registrar intento de contacto' });
    await user.click(screen.getByRole('radio', { name: 'Rechazó' }));
    await user.click(screen.getByRole('button', { name: 'Registrar intento' }));
    expect(await screen.findByText('Solo puedes contactar al cliente por su canal preferido')).toBeInTheDocument();
  });

  it('"el cliente aceptó por teléfono" reenvía el enlace de compra y confirma', async () => {
    mockDetalle(seguimiento());
    let llamado = false;
    server.use(
      http.post(`${API}/seguimientos/${ID}/aceptacion`, () => {
        llamado = true;
        return HttpResponse.json({ enlaceEnviado: true });
      }),
    );
    const user = userEvent.setup();
    renderDetalle();
    await user.click(await screen.findByRole('button', { name: 'Enviar enlace de compra' }));
    expect(await screen.findByText('Enlace de compra enviado')).toBeInTheDocument();
    expect(llamado).toBe(true);
  });

  it('si el enlace no salió, avisa en ámbar con el mensaje del backend', async () => {
    mockDetalle(seguimiento());
    server.use(
      http.post(`${API}/seguimientos/${ID}/aceptacion`, () =>
        HttpResponse.json({ enlaceEnviado: false, warning: { code: 'MENSAJE_NO_ENVIADO', message: 'No pudimos enviar el enlace al cliente. Inténtalo de nuevo.' } }),
      ),
    );
    const user = userEvent.setup();
    renderDetalle();
    await user.click(await screen.findByRole('button', { name: 'Enviar enlace de compra' }));
    expect(await screen.findByText('No pudimos enviar el enlace al cliente. Inténtalo de nuevo.')).toBeInTheDocument();
  });

  it('descartar exige el motivo (RN-11); convertir no; el cierre manda lo elegido', async () => {
    mockDetalle(seguimiento());
    const cuerpos: unknown[] = [];
    server.use(
      http.post(`${API}/seguimientos/${ID}/cierre`, async ({ request }) => {
        cuerpos.push(await request.json());
        return HttpResponse.json({ estado: 'DESCARTADO', motivoCierre: 'PRECIO' });
      }),
    );
    const user = userEvent.setup();
    renderDetalle();
    await user.click(await screen.findByRole('button', { name: 'Cerrar seguimiento' }));
    const dialogo = await screen.findByRole('dialog', { name: 'Cerrar seguimiento' });

    await user.click(within(dialogo).getByRole('button', { name: 'Cerrar seguimiento' }));
    expect(within(dialogo).getByText('Elige el motivo del cierre')).toBeInTheDocument();
    expect(cuerpos).toHaveLength(0);

    await user.selectOptions(within(dialogo).getByLabelText(/motivo del cierre/i), 'PRECIO');
    await user.click(within(dialogo).getByRole('button', { name: 'Cerrar seguimiento' }));
    expect(await screen.findByText('Seguimiento descartado')).toBeInTheDocument();
    expect(cuerpos[0]).toEqual({ estado: 'DESCARTADO', motivo: 'PRECIO' });
  });

  it('convertido se cierra sin motivo', async () => {
    mockDetalle(seguimiento());
    let cuerpo: unknown = null;
    server.use(
      http.post(`${API}/seguimientos/${ID}/cierre`, async ({ request }) => {
        cuerpo = await request.json();
        return HttpResponse.json({ estado: 'CONVERTIDO', motivoCierre: null });
      }),
    );
    const user = userEvent.setup();
    renderDetalle();
    await user.click(await screen.findByRole('button', { name: 'Cerrar seguimiento' }));
    const dialogo = await screen.findByRole('dialog', { name: 'Cerrar seguimiento' });
    await user.click(within(dialogo).getByRole('radio', { name: /Convertido/ }));
    expect(within(dialogo).queryByLabelText(/motivo del cierre/i)).not.toBeInTheDocument();
    await user.click(within(dialogo).getByRole('button', { name: 'Cerrar seguimiento' }));
    expect(await screen.findByText('Seguimiento cerrado como convertido')).toBeInTheDocument();
    expect(cuerpo).toEqual({ estado: 'CONVERTIDO' });
  });

  it('un seguimiento cerrado dice cómo terminó y no ofrece actuar', async () => {
    mockDetalle(seguimiento({ estado: 'DESCARTADO', motivoCierre: 'SIN_INTERES', fechaCierre: hace(0) }));
    renderDetalle();
    expect(await screen.findByText(/Motivo: Sin interés/)).toBeInTheDocument();
    expect(screen.getByText('Este seguimiento ya está cerrado.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Enviar enlace de compra' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cerrar seguimiento' })).not.toBeInTheDocument();
  });

  it('el administrador solo mira', async () => {
    mockDetalle(seguimiento());
    renderDetalle(['ADMINISTRADOR']);
    expect(await screen.findByText('Vista de solo lectura.')).toBeInTheDocument();
    expect(screen.getByText('Solo un asesor puede registrar intentos.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Registrar intento' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cerrar seguimiento' })).not.toBeInTheDocument();
  });

  it('muestra el mensaje del backend si el seguimiento no existe', async () => {
    server.use(http.get(`${API}/seguimientos/${ID}`, () => HttpResponse.json({ statusCode: 404, message: 'El seguimiento no existe' }, { status: 404 })));
    renderDetalle();
    expect(await screen.findByText('El seguimiento no existe')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('link', { name: /volver a seguimientos/i })).toHaveAttribute('href', '/app/seguimientos'));
  });
});

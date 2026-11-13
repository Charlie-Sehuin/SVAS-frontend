import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { Route, Routes } from 'react-router-dom';
import { server } from '../../test/msw/server';
import { API } from '../../test/msw/handlers';
import { renderConProviders } from '../../test/render';
import { Toaster } from '../../shared/ui/toaster';
import { useCotizacionTokenStore } from '../../shared/stores/useCotizacionTokenStore';
import type { Cotizacion, RetomaResponse } from '../../shared/types/api';
import type { Rol } from '../../shared/types/enums';
import { ComparativoPage } from '../cotizacion/pages/ComparativoPage';
import { RetomaPage } from './retoma/RetomaPage';
import { marcarComoRetoma, vieneDeRetoma } from './retoma/retoma';

const COT = '7f1a2b3c-4d5e-4f60-8a7b-9c0d1e2f3a4b';

const cotizacion = (extra: Partial<Cotizacion> = {}): Cotizacion => ({
  id: COT,
  estado: 'REGISTRADA',
  fecha: '2026-11-12T15:00:00-05:00',
  opciones: ['COMPRA_INMEDIATA', 'ASESORIA'],
  motivoDerivacion: null,
  vehiculo: { uso: 'PARTICULAR', marca: 'Toyota', modelo: 'Corolla', tipo: 'SEDAN', anio: 2022, ubigeo: '150122' },
  primas: [
    {
      id: 'p1',
      aseguradoraId: 'aseg-1',
      aseguradora: 'Rímac',
      planId: 'plan-1',
      plan: 'Oro',
      resumen: null,
      disponible: true,
      sumaAsegurada: '15000.00',
      rangoSuma: { minima: '12000.00', maxima: '16800.00' },
      prima: '560.00',
      primaMensual: '48.00',
      motivoNoDisponible: null,
    },
  ],
  ...extra,
});

beforeEach(() => useCotizacionTokenStore.getState().limpiar());
afterEach(() => sessionStorage.clear());

function renderComparativo(roles: Rol[]) {
  server.use(http.get(`${API}/cotizaciones/${COT}/resumen`, () => HttpResponse.json({ cotizacion: cotizacion() })));
  return renderConProviders(
    <>
      <Routes>
        <Route path="/cotizacion/:id" element={<ComparativoPage />} />
      </Routes>
      <Toaster />
    </>,
    { roles, ruta: `/cotizacion/${COT}` },
  );
}

async function abrirDialogo(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole('button', { name: 'Hablar con un asesor' }));
  return screen.findByRole('dialog');
}

/* ───────────────────────── Hablar con un asesor ───────────────────────── */

describe('SolicitarAsesoriaDialog', () => {
  it('un cliente elige motivo y canal (WhatsApp por defecto) y pide que lo contacten', async () => {
    let cuerpo: unknown = null;
    server.use(
      http.post(`${API}/asesorias`, async ({ request }) => {
        cuerpo = await request.json();
        return HttpResponse.json(
          { id: 'sol-1', motivo: 'NEGOCIACION', estado: 'PENDIENTE', canal: 'LLAMADA', origen: 'CLIENTE', fechaCreacion: '2026-11-12T15:00:00-05:00' },
          { status: 201 },
        );
      }),
    );
    const user = userEvent.setup();
    renderComparativo(['CLIENTE']);
    const dialogo = await abrirDialogo(user);

    expect(within(dialogo).getByRole('radio', { name: /tengo una duda/i })).toBeChecked();
    expect(within(dialogo).getByLabelText(/whatsapp/i)).toBeChecked();

    await user.click(within(dialogo).getByRole('radio', { name: /quiero negociar/i }));
    await user.click(within(dialogo).getByLabelText(/llamada/i));
    await user.click(within(dialogo).getByRole('button', { name: 'Pedir que me contacten' }));

    expect(await within(dialogo).findByText('Listo, ya avisamos a un asesor')).toBeInTheDocument();
    expect(within(dialogo).getByText(/Te contactará por una llamada/)).toBeInTheDocument();
    expect(cuerpo).toEqual({ cotizacionId: COT, motivo: 'NEGOCIACION', canal: 'LLAMADA' });
  });

  it('si cotizó sin cuenta y entró con una que ya tenía, vincula la cotización antes de pedir (si no, el backend no la ve)', async () => {
    useCotizacionTokenStore.getState().guardar(COT, 'token-anonimo');
    const orden: string[] = [];
    server.use(
      http.patch(`${API}/cotizaciones/${COT}/cliente`, ({ request }) => {
        orden.push(`vincular(${request.headers.get('X-Cotizacion-Token')})`);
        return HttpResponse.json({ cotizacionId: COT, clienteId: 'cli-1' });
      }),
      http.post(`${API}/asesorias`, () => {
        orden.push('solicitar');
        return HttpResponse.json({ id: 's', motivo: 'DUDA', estado: 'PENDIENTE', canal: 'WHATSAPP', origen: 'CLIENTE', fechaCreacion: '2026-11-12T15:00:00-05:00' }, { status: 201 });
      }),
    );
    const user = userEvent.setup();
    renderComparativo(['CLIENTE']);
    const dialogo = await abrirDialogo(user);
    const enviar = within(dialogo).getByRole('button', { name: 'Pedir que me contacten' });
    await user.click(enviar);
    await within(dialogo).findByText('Listo, ya avisamos a un asesor');
    expect(orden).toEqual(['vincular(token-anonimo)', 'solicitar']);
  });

  it('muestra el mensaje del backend si no se pudo crear y deja reintentar', async () => {
    server.use(
      http.post(`${API}/asesorias`, () =>
        HttpResponse.json({ statusCode: 409, message: 'Ya tienes una solicitud de asesoría abierta para esta cotización' }, { status: 409 }),
      ),
    );
    const user = userEvent.setup();
    renderComparativo(['CLIENTE']);
    const dialogo = await abrirDialogo(user);
    await user.click(within(dialogo).getByRole('button', { name: 'Pedir que me contacten' }));
    expect(await screen.findByText('Ya tienes una solicitud de asesoría abierta para esta cotización')).toBeInTheDocument();
    expect(within(dialogo).getByRole('button', { name: 'Pedir que me contacten' })).toBeEnabled();
  });

  it('sin cuenta abre el registro dentro de la misma pantalla en vez de pedir un login', async () => {
    const user = userEvent.setup();
    renderComparativo([]);
    await user.click(await screen.findByRole('button', { name: 'Hablar con un asesor' }));
    expect(await screen.findByRole('dialog', { name: /crea tu cuenta/i })).toBeInTheDocument();
  });

  it('un asesor o administrador no puede pedir asesoría desde aquí', async () => {
    const user = userEvent.setup();
    renderComparativo(['ASESOR']);
    const dialogo = await abrirDialogo(user);
    expect(within(dialogo).getByText('Solo los clientes pueden pedir asesoría desde aquí.')).toBeInTheDocument();
    expect(within(dialogo).queryByRole('button', { name: 'Pedir que me contacten' })).not.toBeInTheDocument();
  });
});

/* ───────────────────────── Retoma ───────────────────────── */

const TOKEN = 'T'.repeat(43);
const retoma = (): RetomaResponse => ({ cotizacionId: COT, tokenAcceso: 'token-nuevo', descuento: { tipo: 'PRIMERA_COMPRA', porcentaje: '5.00' } });

function renderRetoma() {
  server.use(http.get(`${API}/cotizaciones/${COT}/resumen`, () => HttpResponse.json({ cotizacion: cotizacion() })));
  return renderConProviders(
    <Routes>
      <Route path="/retoma/:token" element={<RetomaPage />} />
    </Routes>,
    { ruta: `/retoma/${TOKEN}` },
  );
}

describe('RetomaPage', () => {
  it('reabre la cotización con el descuento, guarda el token nuevo y lleva a continuar la compra', async () => {
    server.use(http.get(`${API}/retoma/${TOKEN}`, () => HttpResponse.json(retoma())));
    renderRetoma();

    expect(await screen.findByText('Tu 5 % de descuento por primera compra te está esperando.')).toBeInTheDocument();
    expect(await screen.findByText('Toyota Corolla 2022')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Continuar mi compra' })).toHaveAttribute('href', `/cotizacion/${COT}`);
    // El token que sale una sola vez queda guardado y la venta quedará marcada como de retoma.
    expect(useCotizacionTokenStore.getState().obtener(COT)).toBe('token-nuevo');
    expect(vieneDeRetoma(COT)).toBe(true);
  });

  it('al recargar no vuelve a pedir el enlace (es de un solo uso)', async () => {
    let pedidos = 0;
    server.use(
      http.get(`${API}/retoma/${TOKEN}`, () => {
        pedidos += 1;
        return pedidos === 1 ? HttpResponse.json(retoma()) : HttpResponse.json({ statusCode: 404, message: 'Este enlace ya se usó' }, { status: 404 });
      }),
    );
    const primera = renderRetoma();
    await screen.findByText('Tu 5 % de descuento por primera compra te está esperando.');
    primera.unmount();

    renderRetoma();
    expect(await screen.findByText('Tu 5 % de descuento por primera compra te está esperando.')).toBeInTheDocument();
    expect(pedidos).toBe(1);
  });

  it('un enlace vencido muestra el mensaje del backend y ofrece cotizar de nuevo', async () => {
    server.use(http.get(`${API}/retoma/${TOKEN}`, () => HttpResponse.json({ statusCode: 404, message: 'Este enlace venció' }, { status: 404 })));
    renderRetoma();
    expect(await screen.findByRole('alert')).toHaveTextContent('Este enlace venció');
    expect(screen.getByText('Puedes cotizar de nuevo en 1 minuto.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Cotizar ahora' })).toHaveAttribute('href', '/cotizar');
  });

  it('un descuento negociado se dice como tal', async () => {
    server.use(http.get(`${API}/retoma/${TOKEN}`, () => HttpResponse.json({ ...retoma(), descuento: { tipo: 'NEGOCIADO', porcentaje: '8.50' } })));
    renderRetoma();
    expect(await screen.findByText('Tienes un descuento negociado de 8,5 %.')).toBeInTheDocument();
  });
});

describe('origen de retoma', () => {
  it('se marca por cotización y no se mezcla con otras', () => {
    expect(vieneDeRetoma(COT)).toBe(false);
    marcarComoRetoma(COT);
    expect(vieneDeRetoma(COT)).toBe(true);
    expect(vieneDeRetoma('otra-cotizacion')).toBe(false);
  });
});

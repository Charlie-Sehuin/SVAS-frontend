import { beforeEach, describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { Route, Routes } from 'react-router-dom';
import { server } from '../../test/msw/server';
import { API } from '../../test/msw/handlers';
import { renderConProviders } from '../../test/render';
import type { VehiculoGuardado } from '../../shared/types/api';
import { vehiculoABorrador } from './lib/vehiculoABorrador';
import { CotizarPage } from './pages/CotizarPage';
import { MisVehiculosPage } from './pages/MisVehiculosPage';
import { useCotizarWizardStore } from './store/useCotizarWizardStore';

beforeEach(() => {
  useCotizarWizardStore.getState().reiniciar();
});

const auto = (extra: Partial<VehiculoGuardado> = {}): VehiculoGuardado => ({
  clave: 'mo1|2022|ABC123',
  marca: { id: 'm1', nombre: 'Toyota' },
  modelo: { id: 'mo1', nombre: 'Corolla' },
  anio: 2022,
  placa: 'ABC-123',
  clase: null,
  uso: 'PARTICULAR',
  ubicacion: { ubigeo: '150122', departamento: 'Lima', provincia: 'Provincia de Lima', distrito: 'MIRAFLORES' },
  cotizaciones: 1,
  ultimaCotizacion: '2026-11-12T15:00:00-05:00',
  asegurado: false,
  ...extra,
});

const dar = (autos: VehiculoGuardado[]) => server.use(http.get(`${API}/vehiculos/mios`, () => HttpResponse.json(autos)));

describe('vehiculoABorrador', () => {
  it('lleva marca, modelo, año, uso, placa y ubicación al formulario', () => {
    expect(vehiculoABorrador(auto({ clase: 'Automóvil', uso: 'COMERCIAL_LIGERO' }))).toEqual({
      vehiculo: { marcaId: 'm1', modeloId: 'mo1', anio: '2022' },
      uso: 'COMERCIAL_LIGERO',
      placa: 'ABC-123',
      sinPlaca: false,
      clase: 'Automóvil',
      ubicacion: { departamento: 'Lima', provincia: 'Provincia de Lima', ubigeo: '150122' },
    });
  });

  it('un auto sin placa marca "No tengo placa" y uno sin ubicación la deja vacía', () => {
    const b = vehiculoABorrador(auto({ placa: null, ubicacion: null }));
    expect(b).toMatchObject({
      placa: '',
      sinPlaca: true,
      ubicacion: { departamento: '', provincia: '', ubigeo: '' },
    });
  });
});

describe('Mis vehículos', () => {
  const render = () =>
    renderConProviders(
      <Routes>
        <Route path="/mi-cuenta/vehiculos" element={<MisVehiculosPage />} />
        <Route path="/cotizar" element={<p>pantalla de cotizar</p>} />
      </Routes>,
      { roles: ['CLIENTE'], ruta: '/mi-cuenta/vehiculos' },
    );

  it('muestra cada auto con su placa, uso, dónde circula y cuántas veces se cotizó', async () => {
    dar([auto({ cotizaciones: 3, asegurado: true })]);
    render();

    expect(await screen.findByText('Toyota Corolla 2022')).toBeInTheDocument();
    expect(screen.getByText('Placa ABC-123 · Particular')).toBeInTheDocument();
    expect(screen.getByText('Miraflores, Provincia de Lima')).toBeInTheDocument();
    expect(screen.getByText(/Cotizado 3 veces · última vez el/)).toBeInTheDocument();
    expect(screen.getByText('Asegurado')).toBeInTheDocument();
  });

  it('una sola cotización se lee en singular y un auto sin placa lo dice', async () => {
    dar([auto({ placa: null, cotizaciones: 1 })]);
    render();

    expect(await screen.findByText(/Cotizado 1 vez · última vez/)).toBeInTheDocument();
    expect(screen.getByText('Sin placa · Particular')).toBeInTheDocument();
    expect(screen.queryByText('Asegurado')).not.toBeInTheDocument();
  });

  it('"Cotizar de nuevo" deja los datos del auto en el formulario, sin contacto, y abre cotizar', async () => {
    dar([auto()]);
    // Un trámite a medias de otro auto: se reemplaza porque la persona pidió cotizar este.
    useCotizarWizardStore.getState().guardarBorrador({ vehiculo: { marcaId: 'otra', modeloId: 'otro', anio: '2010' } });
    const user = userEvent.setup();
    render();

    await user.click(await screen.findByRole('button', { name: 'Cotizar de nuevo' }));

    expect(await screen.findByText('pantalla de cotizar')).toBeInTheDocument();
    const { borrador, paso, ultimaCotizacionId } = useCotizarWizardStore.getState();
    expect(borrador.vehiculo).toEqual({ marcaId: 'm1', modeloId: 'mo1', anio: '2022' });
    expect(borrador).toMatchObject({ placa: 'ABC-123', sinPlaca: false, uso: 'PARTICULAR' });
    expect(borrador.ubicacion.ubigeo).toBe('150122');
    expect(borrador.contacto.nombres).toBe('');
    expect(paso).toBe(1);
    expect(ultimaCotizacionId).toBeNull();
  });

  it('sin autos explica cuándo aparecerán y ofrece cotizar', async () => {
    dar([]);
    render();

    expect(await screen.findByText(/Aún no cotizaste ningún auto/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Cotizar ahora' })).toHaveAttribute('href', '/cotizar');
  });

  it('si falla la carga, muestra el mensaje del backend y permite reintentar', async () => {
    server.use(http.get(`${API}/vehiculos/mios`, () => HttpResponse.json({ statusCode: 500, message: 'Ocurrió un error en el servidor.' }, { status: 500 })));
    render();

    expect(await screen.findByText('Ocurrió un error en el servidor.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Reintentar/ })).toBeInTheDocument();
  });
});

describe('Atajo "¿Es uno de tus autos?" en cotizar', () => {
  function catalogo() {
    server.use(
      http.get(`${API}/catalogo/vehiculos/marcas`, () => HttpResponse.json([{ id: 'm1', nombre: 'Toyota' }])),
      http.get(`${API}/catalogo/vehiculos/marcas/m1/modelos`, () => HttpResponse.json([{ id: 'mo1', nombre: 'Corolla', tipo: 'SEDAN' }])),
      http.get(`${API}/catalogo/vehiculos/modelos/mo1/anios`, () => HttpResponse.json([2023, 2022])),
      http.get(`${API}/catalogo/ubigeos/departamentos`, () => HttpResponse.json([{ departamento: 'Lima' }])),
      http.get(`${API}/catalogo/ubigeos/provincias`, () => HttpResponse.json([{ provincia: 'Provincia de Lima' }])),
      http.get(`${API}/catalogo/ubigeos/distritos`, () => HttpResponse.json([{ ubigeo: '150122', distrito: 'Miraflores' }])),
    );
  }
  const render = (roles: Parameters<typeof renderConProviders>[1] extends infer O ? (O extends { roles?: infer R } ? R : never) : never) =>
    renderConProviders(
      <Routes>
        <Route path="/cotizar" element={<CotizarPage />} />
      </Routes>,
      { roles, ruta: '/cotizar' },
    );

  it('un toque rellena marca, modelo, año y placa', async () => {
    catalogo();
    dar([auto()]);
    const user = userEvent.setup();
    render(['CLIENTE']);

    await user.click(await screen.findByRole('button', { name: /Toyota Corolla 2022/ }, { timeout: 5000 }));

    await waitFor(() => expect(screen.getByLabelText(/^marca/i)).toHaveValue('m1'));
    await waitFor(() => expect(screen.getByLabelText(/^modelo/i)).toHaveValue('mo1'));
    await waitFor(() => expect(screen.getByLabelText(/^año/i)).toHaveValue('2022'));
    expect(screen.getByLabelText(/^placa/i)).toHaveValue('ABC-123');
  });

  it('ofrece como máximo tres autos', async () => {
    catalogo();
    dar([1, 2, 3, 4].map((n) => auto({ clave: `k${n}`, anio: 2020 + n, placa: `AB${n}-123` })));
    render(['CLIENTE']);

    await screen.findByRole('button', { name: /Toyota Corolla 2021/ }, { timeout: 5000 });
    expect(screen.getAllByRole('button', { name: /Toyota Corolla 20/ })).toHaveLength(3);
  });

  it('sin autos guardados no muestra el atajo', async () => {
    catalogo();
    dar([]);
    render(['CLIENTE']);

    await screen.findByRole('option', { name: 'Toyota' }, { timeout: 5000 });
    expect(screen.queryByText('¿Es uno de tus autos?')).not.toBeInTheDocument();
  });

  it('quien no tiene sesión no ve el atajo ni se llama a la API de vehículos', async () => {
    catalogo();
    let llamadas = 0;
    server.use(
      http.get(`${API}/vehiculos/mios`, () => {
        llamadas += 1;
        return HttpResponse.json([auto()]);
      }),
    );
    render([]);

    await screen.findByRole('option', { name: 'Toyota' }, { timeout: 5000 });
    expect(screen.queryByText('¿Es uno de tus autos?')).not.toBeInTheDocument();
    expect(llamadas).toBe(0);
  });

  it('si la consulta falla, el formulario sigue funcionando sin el atajo', async () => {
    catalogo();
    server.use(http.get(`${API}/vehiculos/mios`, () => HttpResponse.json({ statusCode: 500, message: 'Ocurrió un error en el servidor.' }, { status: 500 })));
    render(['CLIENTE']);

    await screen.findByRole('option', { name: 'Toyota' }, { timeout: 5000 });
    expect(screen.queryByText('¿Es uno de tus autos?')).not.toBeInTheDocument();
    expect(screen.queryByText('Ocurrió un error en el servidor.')).not.toBeInTheDocument();
  });
});

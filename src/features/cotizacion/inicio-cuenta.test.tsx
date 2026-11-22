import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '../../test/msw/server';
import { API } from '../../test/msw/handlers';
import { renderConProviders } from '../../test/render';
import type { PolizaResumen } from '../../shared/types/api';
import { InicioCuentaPage } from './pages/InicioCuentaPage';

const poliza = (extra: Partial<PolizaResumen> = {}): PolizaResumen =>
  ({
    id: 'p1',
    numero: 'LAP-2026-A1B2C3D4',
    fechaEmision: '2026-11-12T15:00:00-05:00',
    aseguradora: 'La Positiva',
    plan: 'Full',
    vehiculo: { marca: 'Toyota', modelo: 'Corolla', anio: 2022, placa: 'ABC-123' },
    sumaAsegurada: '15000.00',
    primaFinal: '619.20',
    pago: { modo: 'UNICO', montoTotal: '619.20', numeroCuotas: null },
    pdfDisponible: true,
    contenidoPlan: {},
    ...extra,
  }) as PolizaResumen;

const cotizacion = (id: string, estado: 'REGISTRADA' | 'CONVERTIDA' | 'NO_CONCRETADA', modelo = 'CR-V') => ({
  id,
  fecha: '2026-11-12T15:00:00-05:00',
  estado,
  vehiculo: { marca: 'Honda', modelo, anio: 2022 },
  primaMensualDesde: '36.59',
});

const dar = (polizas: unknown, cotizaciones: unknown) =>
  server.use(
    http.get(`${API}/polizas/mias`, () => HttpResponse.json(polizas as object)),
    http.get(`${API}/cotizaciones/mias`, () => HttpResponse.json(cotizaciones as object)),
  );

const render = () =>
  renderConProviders(<InicioCuentaPage />, { roles: ['CLIENTE'], ruta: '/mi-cuenta', auth: { nombre: 'Ana María Pérez' } });

describe('Inicio de Mi cuenta', () => {
  it('saluda por el primer nombre y cuenta pólizas y cotizaciones por terminar (las convertidas no cuentan)', async () => {
    dar(
      [poliza(), poliza({ id: 'p2', numero: 'LAP-2026-ZZZZZZZZ' })],
      [cotizacion('c1', 'REGISTRADA'), cotizacion('c2', 'NO_CONCRETADA', 'HR-V'), cotizacion('c3', 'CONVERTIDA', 'Civic')],
    );
    render();

    expect(await screen.findByText('Hola, Ana. Esto es lo que tienes con nosotros.')).toBeInTheDocument();
    const polizas = await screen.findByRole('link', { name: /Pólizas activas/ });
    await within(polizas).findByText('2');
    expect(polizas).toHaveAttribute('href', '/mi-cuenta/polizas');
    const cots = screen.getByRole('link', { name: /Cotizaciones por terminar/ });
    await within(cots).findByText('2');
    expect(await screen.findByText('Honda CR-V 2022')).toBeInTheDocument();
    expect(screen.getByText('Honda HR-V 2022')).toBeInTheDocument();
    expect(screen.queryByText('Honda Civic 2022')).not.toBeInTheDocument();
  });

  it('muestra cada póliza con su número, forma de pago y descarga, y cada cotización pendiente con "Continuar"', async () => {
    dar([poliza({ pago: { modo: 'CUOTAS', montoTotal: '650.16', numeroCuotas: 12 } })], [cotizacion('c1', 'REGISTRADA')]);
    render();

    expect(await screen.findByText('Plan Full')).toBeInTheDocument();
    expect(screen.getByText('Toyota Corolla 2022 · ABC-123')).toBeInTheDocument();
    expect(screen.getByText('LAP-2026-A1B2C3D4')).toBeInTheDocument();
    expect(screen.getByText('En 12 cuotas')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Descargar mi póliza (PDF)' })).toBeInTheDocument();
    expect(await screen.findByRole('link', { name: 'Continuar' })).toHaveAttribute('href', '/cotizacion/c1');
    expect(screen.getByRole('link', { name: 'Cotizar ahora' })).toHaveAttribute('href', '/cotizar');
  });

  it('muestra solo las primeras tres de cada lista', async () => {
    dar(
      [1, 2, 3, 4].map((n) => poliza({ id: `p${n}`, numero: `LAP-2026-0000000${n}` })),
      [1, 2, 3, 4].map((n) => cotizacion(`c${n}`, 'REGISTRADA', `Modelo ${n}`)),
    );
    render();

    expect(await screen.findByText('LAP-2026-00000003')).toBeInTheDocument();
    expect(screen.queryByText('LAP-2026-00000004')).not.toBeInTheDocument();
    expect(await screen.findByText('Honda Modelo 3 2022')).toBeInTheDocument();
    expect(screen.queryByText('Honda Modelo 4 2022')).not.toBeInTheDocument();
  });

  it('sin pólizas ni cotizaciones invita a cotizar y no pinta secciones vacías', async () => {
    dar([], []);
    render();

    expect(await screen.findByText('Aún no tienes pólizas ni cotizaciones.')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Tus pólizas' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Sigue donde te quedaste' })).not.toBeInTheDocument();
  });

  it('si falla un bloque lo dice y deja reintentar, sin tapar el otro', async () => {
    server.use(
      http.get(`${API}/polizas/mias`, () => HttpResponse.json({ statusCode: 500, message: 'Ocurrió un error en el servidor.' }, { status: 500 })),
      http.get(`${API}/cotizaciones/mias`, () => HttpResponse.json([cotizacion('c1', 'REGISTRADA')])),
    );
    render();

    expect(await screen.findByText('Ocurrió un error en el servidor.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Reintentar/ })).toBeInTheDocument();
    expect(await screen.findByText('Honda CR-V 2022')).toBeInTheDocument();
  });
});

import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { server } from '../../../test/msw/server';
import { API } from '../../../test/msw/handlers';
import { renderConProviders } from '../../../test/render';
import type { SolicitudMia } from '../../../shared/types/api';
import { MisAsesoriasPage } from './MisAsesoriasPage';

const solicitud = (extra: Partial<SolicitudMia> = {}): SolicitudMia => ({
  id: 's1',
  motivo: 'DUDA',
  estado: 'PENDIENTE',
  canal: 'WHATSAPP',
  origen: 'CLIENTE',
  fechaCreacion: '2026-11-20T10:00:00-05:00',
  conAsesor: false,
  cotizacion: { id: 'c1', fecha: '2026-11-19T10:00:00-05:00', estado: 'REGISTRADA', vehiculo: 'Toyota Corolla 2022' },
  descuentoAceptado: null,
  ...extra,
});

const dar = (filas: SolicitudMia[]) => server.use(http.get(`${API}/asesorias/mias`, () => HttpResponse.json(filas)));
const render = () => renderConProviders(<MisAsesoriasPage />, { roles: ['CLIENTE'], ruta: '/mi-cuenta/asesorias' });

describe('Mis asesorías', () => {
  it('una solicitud pendiente dice qué pasó y qué sigue, por el canal elegido', async () => {
    dar([solicitud()]);
    render();

    expect(await screen.findByText('Una duda sobre tu seguro')).toBeInTheDocument();
    expect(screen.getByText(/Toyota Corolla 2022 · pedida el/)).toBeInTheDocument();
    expect(screen.getByText('Pendiente')).toBeInTheDocument();
    expect(screen.getByText('Recibimos tu solicitud. Un asesor la tomará pronto y te contactará por WhatsApp.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver mi cotización' })).toHaveAttribute('href', '/cotizacion/c1');
  });

  it('en atención avisa que un asesor la está viendo, sin decir su nombre', async () => {
    dar([solicitud({ estado: 'EN_ATENCION', conAsesor: true, canal: 'LLAMADA' })]);
    render();

    expect(await screen.findByText('En atención')).toBeInTheDocument();
    expect(screen.getByText('Un asesor está atendiendo tu caso. Te contactará por una llamada.')).toBeInTheDocument();
  });

  it('cerrada con descuento muestra el porcentaje vigente', async () => {
    dar([solicitud({ estado: 'CERRADA', conAsesor: true, motivo: 'DESCUENTO', descuentoAceptado: { tipo: 'NEGOCIADO', porcentaje: '8.00' } })]);
    render();

    expect(await screen.findByText('Cerrada')).toBeInTheDocument();
    expect(screen.getByText('Un descuento')).toBeInTheDocument();
    expect(screen.getByText('Tu caso se atendió y quedó un descuento para tu compra.')).toBeInTheDocument();
    expect(screen.getByText(/Descuento para tu compra: 8 %/)).toBeInTheDocument();
  });

  it('cerrada sin descuento no promete ninguno', async () => {
    dar([solicitud({ estado: 'CERRADA', conAsesor: true })]);
    render();

    expect(await screen.findByText('Tu caso ya se atendió.')).toBeInTheDocument();
    expect(screen.queryByText(/Descuento para tu compra/)).not.toBeInTheDocument();
  });

  it('un caso que abrió el sistema se explica con palabras del cliente', async () => {
    dar([solicitud({ motivo: 'INSPECCION', origen: 'SISTEMA' }), solicitud({ id: 's2', motivo: 'NO_ASEGURABLE', origen: 'SISTEMA' })]);
    render();

    expect(await screen.findByText('Revisión de tu vehículo')).toBeInTheDocument();
    expect(screen.getByText('Revisión de tu caso')).toBeInTheDocument();
    expect(screen.queryByText(/inspección|no asegurable/i)).not.toBeInTheDocument();
  });

  it('lista varias, en el orden que manda el backend', async () => {
    dar([solicitud({ id: 'a', motivo: 'DESCUENTO' }), solicitud({ id: 'b', motivo: 'NEGOCIACION' })]);
    render();

    const items = await screen.findAllByRole('listitem');
    expect(within(items[0]!).getByText('Un descuento')).toBeInTheDocument();
    expect(within(items[1]!).getByText('Conversar el precio')).toBeInTheDocument();
  });

  it('sin solicitudes explica cuándo aparecerán y ofrece ir a las cotizaciones', async () => {
    dar([]);
    render();

    expect(await screen.findByText(/Aún no hablaste con un asesor/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver mis cotizaciones' })).toHaveAttribute('href', '/mi-cuenta/cotizaciones');
  });

  it('si falla la carga, muestra el mensaje del backend y permite reintentar', async () => {
    server.use(http.get(`${API}/asesorias/mias`, () => HttpResponse.json({ statusCode: 500, message: 'Ocurrió un error en el servidor.' }, { status: 500 })));
    render();

    expect(await screen.findByText('Ocurrió un error en el servidor.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Reintentar/ })).toBeInTheDocument();
  });
});

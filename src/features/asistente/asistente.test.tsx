import { beforeEach, describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { Route, Routes, useLocation } from 'react-router-dom';
import { PublicLayout } from '../../app-shell/PublicLayout';
import { CotizarPage } from '../cotizacion/pages/CotizarPage';
import { server } from '../../test/msw/server';
import { API, catalogoCamposMock } from '../../test/msw/handlers';
import { renderConProviders } from '../../test/render';
import { useCotizacionTokenStore } from '../../shared/stores/useCotizacionTokenStore';
import type { RespuestaAsistente } from '../../shared/types/api';
import { useCotizarWizardStore } from '../cotizacion/store/useCotizarWizardStore';
import { armarHistorial } from './lib/historial';
import { useAsistenteStore } from './store/useAsistenteStore';

const ID = '7f1a2b3c-4d5e-4f60-8a7b-9c0d1e2f3a4b';
const LEYENDA = 'Asistente automático: sus respuestas son orientativas y no reemplazan el condicionado de la aseguradora.';

beforeEach(() => {
  // Los estados viven en módulos (zustand): se limpian para que una prueba no contamine a la siguiente.
  useAsistenteStore.setState({ abierto: false, mensajes: [], vehiculo: null });
  useCotizarWizardStore.getState().reiniciar();
  useCotizacionTokenStore.getState().limpiar();
});

const respuesta = (parcial: Partial<RespuestaAsistente> = {}): RespuestaAsistente => ({
  respuesta: 'Te recomiendo Rímac Plata.',
  planesRecomendados: [],
  acciones: [],
  leyenda: LEYENDA,
  ...parcial,
});

function Ubicacion() {
  return <p data-testid="ruta">{useLocation().pathname}</p>;
}

function renderSitio(ruta = '/', formularioReal = false) {
  return renderConProviders(
    <>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<p>portada</p>} />
          <Route path="/cotizar" element={formularioReal ? <CotizarPage /> : <p>formulario de cotizar</p>} />
          <Route path="/cotizacion/:id" element={<p>comparativo</p>} />
          <Route path="/cotizacion/:id/prueba" element={<p>prueba de choque</p>} />
        </Route>
      </Routes>
      <Ubicacion />
    </>,
    { ruta },
  );
}

async function abrirChat(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: /abrir el asistente virtual/i }));
  return screen.findByRole('dialog', { name: /asistente de segurosimple/i });
}

describe('armarHistorial', () => {
  it('empieza siempre por un mensaje de la persona y manda solo rol y texto', () => {
    const h = armarHistorial([
      { rol: 'asistente', texto: 'foto', planes: [] } as never,
      { rol: 'usuario', texto: 'hola' },
      { rol: 'asistente', texto: 'qué tal', acciones: ['COTIZAR'] } as never,
      { rol: 'usuario', texto: 'un plan' },
    ]);
    expect(h).toEqual([
      { rol: 'usuario', texto: 'hola' },
      { rol: 'asistente', texto: 'qué tal' },
      { rol: 'usuario', texto: 'un plan' },
    ]);
  });

  it('se queda con los últimos 12 y devuelve vacío si la persona no ha escrito', () => {
    const largo = Array.from({ length: 20 }, (_, i) => ({ rol: i % 2 === 0 ? 'usuario' : 'asistente', texto: `m${i}` }) as const);
    const h = armarHistorial(largo);
    expect(h).toHaveLength(12);
    expect(h[0]).toEqual({ rol: 'usuario', texto: 'm8' });
    expect(armarHistorial([{ rol: 'asistente', texto: 'hola' }])).toEqual([]);
  });
});

describe('Asistente (chatbot)', () => {
  it('muestra la burbuja en el sitio público y abre la ventana con el saludo y la leyenda', async () => {
    const user = userEvent.setup();
    renderSitio();
    const ventana = await abrirChat(user);
    expect(within(ventana).getByText(/soy el asistente de segurosimple/i)).toBeInTheDocument();
    expect(within(ventana).getByText(LEYENDA)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /abrir el asistente virtual/i })).not.toBeInTheDocument();
    await user.click(within(ventana).getByRole('button', { name: /cerrar el asistente/i }));
    expect(screen.getByRole('button', { name: /abrir el asistente virtual/i })).toBeInTheDocument();
  });

  it('manda la conversación, pinta la respuesta con la tarjeta del plan y sus botones', async () => {
    let cuerpo: unknown;
    server.use(
      http.post(`${API}/asistente/mensajes`, async ({ request }) => {
        cuerpo = await request.json();
        return HttpResponse.json(
          respuesta({
            respuesta: 'Para el robo de autopartes te sirve este plan.',
            planesRecomendados: [
              { planId: 'p1', aseguradora: 'Rímac', plan: 'Plata', resumen: 'Protección esencial', motivo: 'Cubre autopartes sin ser el más caro.' },
            ],
            acciones: ['COTIZAR', 'HABLAR_ASESOR'],
          }),
        );
      }),
    );
    const user = userEvent.setup();
    renderSitio();
    const ventana = await abrirChat(user);
    await user.type(within(ventana).getByRole('textbox', { name: /tu mensaje/i }), 'Me preocupa el robo de autopartes');
    await user.click(within(ventana).getByRole('button', { name: 'Enviar' }));

    expect(await within(ventana).findByText(/te sirve este plan/i)).toBeInTheDocument();
    expect(within(ventana).getByText('Plata')).toBeInTheDocument();
    expect(within(ventana).getByText(/cubre autopartes sin ser el más caro/i)).toBeInTheDocument();
    expect(within(ventana).getByRole('button', { name: 'Cotizar ahora' })).toBeInTheDocument();
    expect(within(ventana).getByRole('button', { name: /hablar con un asesor/i })).toBeInTheDocument();
    // Sin cotización no hay precios ni enlace a una cotización.
    expect(within(ventana).queryByRole('link', { name: /ver en mi cotización/i })).not.toBeInTheDocument();
    expect(cuerpo).toEqual({ mensajes: [{ rol: 'usuario', texto: 'Me preocupa el robo de autopartes' }] });
  });

  it('con una sugerencia rápida envía ese texto', async () => {
    server.use(http.post(`${API}/asistente/mensajes`, () => HttpResponse.json(respuesta({ respuesta: 'Claro, cuéntame más.' }))));
    const user = userEvent.setup();
    renderSitio();
    const ventana = await abrirChat(user);
    await user.click(within(ventana).getByRole('button', { name: 'Recomiéndame un plan' }));
    expect(await within(ventana).findByText('Claro, cuéntame más.')).toBeInTheDocument();
    expect(within(ventana).getByText('Recomiéndame un plan')).toBeInTheDocument();
  });

  it('con una cotización a la vista usa su ruta con el token y muestra los precios que dio el backend', async () => {
    useCotizacionTokenStore.getState().guardar(ID, 'token-de-la-cotizacion');
    let token: string | null = null;
    let cuerpo: Record<string, unknown> = {};
    server.use(
      http.post(`${API}/cotizaciones/${ID}/asistente/mensajes`, async ({ request }) => {
        token = request.headers.get('X-Cotizacion-Token');
        cuerpo = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json(
          respuesta({
            planesRecomendados: [
              {
                planId: 'p1',
                aseguradora: 'Rímac',
                plan: 'Plata',
                resumen: null,
                motivo: 'El más barato que cubre robo.',
                primaCotizadaId: 'pc1',
                sumaAsegurada: '14400.00',
                primaAnual: '439.13',
                primaMensual: '36.59',
              },
            ],
            acciones: ['PRUEBA_CHOQUE', 'HABLAR_ASESOR'],
          }),
        );
      }),
    );
    const user = userEvent.setup();
    renderSitio(`/cotizacion/${ID}`);
    const ventana = await abrirChat(user);
    // Con cotización el auto ya es el de ella: no se ofrece la foto.
    expect(within(ventana).queryByRole('button', { name: /enviar una foto de mi auto/i })).not.toBeInTheDocument();
    await user.type(within(ventana).getByRole('textbox', { name: /tu mensaje/i }), 'Cuál me conviene');
    await user.click(within(ventana).getByRole('button', { name: 'Enviar' }));

    await within(ventana).findByText('Plata');
    expect(token).toBe('token-de-la-cotizacion');
    expect(cuerpo).not.toHaveProperty('vehiculo');
    expect(within(ventana).getByLabelText(/36 dólares con 59 centavos al mes/i)).toBeInTheDocument();
    expect(within(ventana).getByText(/al año/i)).toBeInTheDocument();
    expect(within(ventana).getByRole('link', { name: /ver en mi cotización/i })).toHaveAttribute('href', `/cotizacion/${ID}`);

    await user.click(within(ventana).getByRole('button', { name: 'Pon a prueba estos planes' }));
    expect(screen.getByTestId('ruta')).toHaveTextContent(`/cotizacion/${ID}/prueba`);
    expect(screen.queryByRole('dialog', { name: /asistente de segurosimple/i })).not.toBeInTheDocument();
  });

  it('si el servicio falla muestra el mensaje del backend y "Reintentar" vuelve a pedir la respuesta', async () => {
    let intentos = 0;
    server.use(
      http.post(`${API}/asistente/mensajes`, () => {
        intentos += 1;
        return intentos === 1
          ? HttpResponse.json({ statusCode: 503, message: 'El asistente no está disponible por ahora' }, { status: 503 })
          : HttpResponse.json(respuesta({ respuesta: 'Ya estoy de vuelta.' }));
      }),
    );
    const user = userEvent.setup();
    renderSitio();
    const ventana = await abrirChat(user);
    await user.type(within(ventana).getByRole('textbox', { name: /tu mensaje/i }), 'Hola');
    await user.click(within(ventana).getByRole('button', { name: 'Enviar' }));
    expect(await within(ventana).findByRole('alert')).toHaveTextContent('El asistente no está disponible por ahora');
    await user.click(within(ventana).getByRole('button', { name: 'Reintentar' }));
    expect(await within(ventana).findByText('Ya estoy de vuelta.')).toBeInTheDocument();
    expect(within(ventana).queryByRole('alert')).not.toBeInTheDocument();
    // El mensaje de la persona no se duplicó al reintentar.
    expect(within(ventana).getAllByText('Hola')).toHaveLength(1);
  });

  describe('foto del auto en el chat', () => {
    const foto = () => new File(['x'], 'auto.jpg', { type: 'image/jpeg' });

    it('reconoce el auto, lo recuerda para la siguiente pregunta y "Cotizar con estos datos" rellena el formulario sin año', async () => {
      let cuerpo: Record<string, unknown> = {};
      server.use(
        http.post(`${API}/catalogo/vehiculos/reconocer`, () =>
          HttpResponse.json({
            reconocido: true,
            marca: { id: 'm1', nombre: 'Toyota' },
            modelo: { id: 'mo1', nombre: 'Hilux' },
            aniosProbables: [2015, 2014],
            confianza: 0.9,
          }),
        ),
        http.post(`${API}/asistente/mensajes`, async ({ request }) => {
          cuerpo = (await request.json()) as Record<string, unknown>;
          return HttpResponse.json(respuesta({ respuesta: 'Para una pickup te sugiero este plan.' }));
        }),
      );
      const user = userEvent.setup();
      renderSitio();
      const ventana = await abrirChat(user);
      await user.upload(within(ventana).getByLabelText(/foto de tu auto/i), foto());

      expect(await within(ventana).findByText(/parece un toyota hilux/i)).toBeInTheDocument();
      expect(within(ventana).getByText(/podría ser 2015, 2014/i)).toBeInTheDocument();
      expect(useAsistenteStore.getState().vehiculo).toMatchObject({ marcaId: 'm1', modeloId: 'mo1' });

      await user.type(within(ventana).getByRole('textbox', { name: /tu mensaje/i }), 'Lo uso para trabajar');
      await user.click(within(ventana).getByRole('button', { name: 'Enviar' }));
      await within(ventana).findByText(/te sugiero este plan/i);
      expect(cuerpo['vehiculo']).toEqual({ marca: 'Toyota', modelo: 'Hilux' });
      // La conversación abre con un mensaje de la persona (el de la foto), no con el del asistente.
      expect((cuerpo['mensajes'] as { rol: string }[])[0]?.rol).toBe('usuario');

      await user.click(within(ventana).getAllByRole('button', { name: 'Cotizar con estos datos' })[0]!);
      expect(screen.getByTestId('ruta')).toHaveTextContent('/cotizar');
      const { borrador, paso } = useCotizarWizardStore.getState();
      expect(borrador.vehiculo).toEqual({ marcaId: 'm1', modeloId: 'mo1', anio: '' }); // RN-44: el año lo elige la persona
      expect(paso).toBe(1);
    });

    it('si ya estás en el formulario de cotizar, "Cotizar con estos datos" lo vuelve a leer y marca el auto', async () => {
      server.use(
        http.get(`${API}/catalogo/campos`, () => HttpResponse.json(catalogoCamposMock)),
        http.get(`${API}/catalogo/vehiculos/marcas`, () => HttpResponse.json([{ id: 'm1', nombre: 'Toyota' }])),
        http.get(`${API}/catalogo/vehiculos/marcas/m1/modelos`, () => HttpResponse.json([{ id: 'mo1', nombre: 'Hilux', tipo: 'PICKUP' }])),
        http.get(`${API}/catalogo/vehiculos/modelos/mo1/anios`, () => HttpResponse.json([2015, 2014])),
        http.post(`${API}/catalogo/vehiculos/reconocer`, () =>
          HttpResponse.json({
            reconocido: true,
            marca: { id: 'm1', nombre: 'Toyota' },
            modelo: { id: 'mo1', nombre: 'Hilux' },
            aniosProbables: [2015],
            confianza: 0.9,
          }),
        ),
      );
      const user = userEvent.setup();
      renderSitio('/cotizar', true);
      await screen.findByRole('option', { name: 'Toyota' }, { timeout: 5000 });
      expect(screen.getByLabelText(/^marca/i)).toHaveValue('');
      const ventana = await abrirChat(user);
      await user.upload(within(ventana).getByLabelText(/foto de tu auto/i), foto());
      await within(ventana).findByText(/parece un toyota hilux/i);
      await user.click(within(ventana).getAllByRole('button', { name: 'Cotizar con estos datos' })[0]!);
      await waitFor(() => expect(screen.getByLabelText(/^marca/i)).toHaveValue('m1'), { timeout: 5000 });
      await waitFor(() => expect(screen.getByLabelText(/^modelo/i)).toHaveValue('mo1'), { timeout: 5000 });
      expect(screen.getByLabelText(/^año/i)).toHaveValue(''); // RN-44
    }, 20_000);

    it('si no reconoce el auto, lo dice y ofrece cotizar a mano', async () => {
      server.use(
        http.post(`${API}/catalogo/vehiculos/reconocer`, () => HttpResponse.json({ reconocido: false, aniosProbables: [], confianza: 0 })),
      );
      const user = userEvent.setup();
      renderSitio();
      const ventana = await abrirChat(user);
      await user.upload(within(ventana).getByLabelText(/foto de tu auto/i), foto());
      expect(await within(ventana).findByText(/no pude reconocer tu auto/i)).toBeInTheDocument();
      expect(useAsistenteStore.getState().vehiculo).toBeNull();
      expect(within(ventana).getByRole('button', { name: 'Cotizar ahora' })).toBeInTheDocument();
    });

    it('si el reconocimiento no está disponible muestra el mensaje y no rompe el chat', async () => {
      server.use(
        http.post(`${API}/catalogo/vehiculos/reconocer`, () =>
          HttpResponse.json({ statusCode: 503, message: 'El reconocimiento por foto no está disponible por ahora' }, { status: 503 }),
        ),
      );
      const user = userEvent.setup();
      renderSitio();
      const ventana = await abrirChat(user);
      await user.upload(within(ventana).getByLabelText(/foto de tu auto/i), foto());
      expect(await within(ventana).findByText(/no está disponible por ahora/i)).toBeInTheDocument();
      expect(within(ventana).getByRole('textbox', { name: /tu mensaje/i })).toBeEnabled();
    });
  });

  it('"Hablar con un asesor" sin cotización abre el cuadro con el teléfono', async () => {
    server.use(http.post(`${API}/asistente/mensajes`, () => HttpResponse.json(respuesta({ acciones: ['HABLAR_ASESOR'] }))));
    const user = userEvent.setup();
    renderSitio();
    const ventana = await abrirChat(user);
    await user.click(within(ventana).getByRole('button', { name: 'Recomiéndame un plan' }));
    await user.click(await within(ventana).findByRole('button', { name: /hablar con un asesor/i }));
    expect(await screen.findByRole('dialog', { name: /habla con un asesor/i })).toBeInTheDocument();
  });

  it('"Nueva conversación" borra los mensajes y el auto de la foto', async () => {
    server.use(http.post(`${API}/asistente/mensajes`, () => HttpResponse.json(respuesta({ respuesta: 'Hola de nuevo.' }))));
    useAsistenteStore.getState().fijarVehiculo({ marcaId: 'm1', modeloId: 'mo1', marca: 'Toyota', modelo: 'Hilux' });
    const user = userEvent.setup();
    renderSitio();
    const ventana = await abrirChat(user);
    await user.click(within(ventana).getByRole('button', { name: 'Quiero algo económico' }));
    await within(ventana).findByText('Hola de nuevo.');
    await user.click(within(ventana).getByRole('button', { name: /nueva conversación/i }));
    await waitFor(() => expect(within(ventana).queryByText('Hola de nuevo.')).not.toBeInTheDocument());
    expect(useAsistenteStore.getState().vehiculo).toBeNull();
    expect(within(ventana).getByRole('button', { name: 'Recomiéndame un plan' })).toBeInTheDocument();
  });
});

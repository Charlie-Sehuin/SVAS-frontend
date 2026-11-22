import { describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '../../test/msw/server';
import { API } from '../../test/msw/handlers';
import { renderConProviders } from '../../test/render';
import { Toaster } from '../../shared/ui/toaster';
import { PerfilCuentaPage } from './pages/PerfilCuentaPage';

const FICHA = {
  nombres: 'Maria',
  apellidos: 'Paredes',
  telefono: '985412305',
  email: 'maria@correo.com',
  canal: 'WHATSAPP' as const,
};

const dar = (contacto: typeof FICHA | null) =>
  server.use(http.get(`${API}/usuarios/me/contacto`, () => HttpResponse.json({ contacto })));

const render = () =>
  renderConProviders(
    <>
      <PerfilCuentaPage />
      <Toaster />
    </>,
    { roles: ['CLIENTE'], ruta: '/mi-cuenta/perfil' },
  );

describe('Mis datos', () => {
  it('muestra nombre y correo como texto (no se editan) y el celular y canal para cambiar', async () => {
    dar(FICHA);
    render();

    expect(await screen.findByText('Maria Paredes')).toBeInTheDocument();
    expect(screen.getByText('maria@correo.com')).toBeInTheDocument();
    expect(screen.getByText(/no se cambia desde aquí/)).toBeInTheDocument();
    expect(screen.getByLabelText(/celular/i)).toHaveValue('985412305');
    expect(screen.getByRole('radio', { name: /whatsapp/i })).toBeChecked();
    expect(screen.queryByLabelText(/correo/i)).not.toBeInTheDocument();
  });

  it('"Guardar cambios" está apagado hasta que algo cambia', async () => {
    dar(FICHA);
    const user = userEvent.setup();
    render();

    const guardar = await screen.findByRole('button', { name: /guardar cambios/i });
    expect(guardar).toBeDisabled();
    await user.click(screen.getByRole('radio', { name: /llamada/i }));
    expect(guardar).toBeEnabled();
    await user.click(screen.getByRole('radio', { name: /whatsapp/i }));
    expect(guardar).toBeDisabled();
  });

  it('manda solo lo que cambió y avisa que se guardó', async () => {
    dar(FICHA);
    let cuerpo: unknown = null;
    server.use(
      http.patch(`${API}/usuarios/me/contacto`, async ({ request }) => {
        cuerpo = await request.json();
        return HttpResponse.json({ contacto: { ...FICHA, telefono: '911222333' } });
      }),
    );
    const user = userEvent.setup();
    render();

    const celular = await screen.findByLabelText(/celular/i);
    await user.clear(celular);
    await user.type(celular, '911 222-333');
    await user.click(screen.getByRole('button', { name: /guardar cambios/i }));

    expect(await screen.findByText('Datos actualizados')).toBeInTheDocument();
    expect(cuerpo).toEqual({ telefono: '911222333' });
    expect(screen.getByLabelText(/celular/i)).toHaveValue('911222333');
    expect(screen.getByRole('button', { name: /guardar cambios/i })).toBeDisabled();
  });

  it('cambiar el canal manda solo el canal', async () => {
    dar(FICHA);
    let cuerpo: unknown = null;
    server.use(
      http.patch(`${API}/usuarios/me/contacto`, async ({ request }) => {
        cuerpo = await request.json();
        return HttpResponse.json({ contacto: { ...FICHA, canal: 'LLAMADA' } });
      }),
    );
    const user = userEvent.setup();
    render();

    await user.click(await screen.findByRole('radio', { name: /llamada/i }));
    await user.click(screen.getByRole('button', { name: /guardar cambios/i }));

    await waitFor(() => expect(cuerpo).toEqual({ canal: 'LLAMADA' }));
    expect(await screen.findByText('Datos actualizados')).toBeInTheDocument();
  });

  it('valida el celular sin llamar al backend', async () => {
    dar(FICHA);
    let llamadas = 0;
    server.use(
      http.patch(`${API}/usuarios/me/contacto`, () => {
        llamadas += 1;
        return HttpResponse.json({ contacto: FICHA });
      }),
    );
    const user = userEvent.setup();
    render();

    const celular = await screen.findByLabelText(/celular/i);
    await user.clear(celular);
    await user.type(celular, '811222333');
    await user.click(screen.getByRole('button', { name: /guardar cambios/i }));

    expect(await screen.findByText('Ingresa un celular de 9 dígitos que empiece con 9')).toBeInTheDocument();
    expect(llamadas).toBe(0);
  });

  it('un error de validación del backend sale bajo el campo', async () => {
    dar(FICHA);
    server.use(
      http.patch(`${API}/usuarios/me/contacto`, () =>
        HttpResponse.json(
          { statusCode: 400, message: 'Hay datos que corregir', errors: [{ campo: 'telefono', mensaje: 'Ingresa un celular peruano de 9 dígitos que empiece con 9' }] },
          { status: 400 },
        ),
      ),
    );
    const user = userEvent.setup();
    render();

    const celular = await screen.findByLabelText(/celular/i);
    await user.clear(celular);
    await user.type(celular, '911222333');
    await user.click(screen.getByRole('button', { name: /guardar cambios/i }));

    expect(await screen.findByText('Ingresa un celular peruano de 9 dígitos que empiece con 9')).toBeInTheDocument();
    expect(screen.queryByText('Datos actualizados')).not.toBeInTheDocument();
  });

  it('un fallo del servidor se muestra tal cual y no marca como guardado', async () => {
    dar(FICHA);
    server.use(
      http.patch(`${API}/usuarios/me/contacto`, () =>
        HttpResponse.json({ statusCode: 500, message: 'Ocurrió un error en el servidor.' }, { status: 500 }),
      ),
    );
    const user = userEvent.setup();
    render();

    await user.click(await screen.findByRole('radio', { name: /llamada/i }));
    await user.click(screen.getByRole('button', { name: /guardar cambios/i }));

    expect(await screen.findByText('Ocurrió un error en el servidor.')).toBeInTheDocument();
    expect(screen.queryByText('Datos actualizados')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /guardar cambios/i })).toBeEnabled();
  });

  it('sin ficha (aún no cotizó) invita a cotizar y no ofrece editar', async () => {
    dar(null);
    render();

    expect(await screen.findByText(/se guardan cuando cotizas tu primer seguro/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Cotizar ahora' })).toHaveAttribute('href', '/cotizar');
    expect(screen.queryByLabelText(/celular/i)).not.toBeInTheDocument();
  });

  it('si falla la carga, muestra el mensaje del backend y permite reintentar', async () => {
    server.use(
      http.get(`${API}/usuarios/me/contacto`, () =>
        HttpResponse.json({ statusCode: 500, message: 'Ocurrió un error en el servidor.' }, { status: 500 }),
      ),
    );
    render();

    expect(await screen.findByText('Ocurrió un error en el servidor.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reintentar/i })).toBeInTheDocument();
  });
});

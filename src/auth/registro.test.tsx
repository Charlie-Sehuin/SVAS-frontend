import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { Route, Routes } from 'react-router-dom';
import { server } from '../test/msw/server';
import { API } from '../test/msw/handlers';
import { renderConProviders } from '../test/render';
import { useContactoPrevioStore } from '../shared/stores/useContactoPrevioStore';
import { useCotizacionTokenStore } from '../shared/stores/useCotizacionTokenStore';
import { CompraPage } from '../features/compra/pages/CompraPage';
import type { AuthContextValue } from './AuthProvider';
import { RegistroMinimoDialog } from './RegistroMinimoDialog';

const nuevoSignIn = () => vi.fn<AuthContextValue['signIn']>();

const ID = '7f1a2b3c-4d5e-4f60-8a7b-9c0d1e2f3a4b';
const CONTRASENA = 'Casa-Verde-Lluvia-26';

beforeEach(() => {
  useContactoPrevioStore.getState().limpiar();
  useCotizacionTokenStore.getState().limpiar();
});

const prellenar = () =>
  useContactoPrevioStore.getState().guardar({ nombres: 'Ana', apellidos: 'Ríos', telefono: '987654321', email: 'ana@example.com' });

const usuarioCreado = { id: 'u1', email: 'ana@example.com', rol: 'CLIENTE', nombreCompleto: 'Ana Ríos', activo: true };

function renderDialog(opciones: { cotizacionId?: string; signIn?: ReturnType<typeof nuevoSignIn> } = {}) {
  const onRegistrado = vi.fn();
  const onOpenChange = vi.fn();
  const signIn = opciones.signIn ?? nuevoSignIn().mockResolvedValue({ roles: ['CLIENTE'] });
  renderConProviders(
    <RegistroMinimoDialog open onOpenChange={onOpenChange} cotizacionId={opciones.cotizacionId} onRegistrado={onRegistrado} />,
    { auth: { signIn } },
  );
  return { onRegistrado, onOpenChange, signIn };
}

async function enviarConContrasena(user: ReturnType<typeof userEvent.setup>, contrasena = CONTRASENA) {
  await user.type(screen.getByLabelText(/^contraseña/i), contrasena);
  await user.click(screen.getByRole('button', { name: /crear mi cuenta/i }));
}

describe('Registro mínimo dentro del embudo (CU-02)', () => {
  it('viene prellenado con el contacto de la cotización, crea la cuenta con el token y luego inicia sesión', async () => {
    prellenar();
    useCotizacionTokenStore.getState().guardar(ID, 'tok-123');
    let cuerpo: unknown;
    let cabecera: string | null = null;
    server.use(
      http.post(`${API}/auth/registro`, async ({ request }) => {
        cuerpo = await request.json();
        cabecera = request.headers.get('X-Cotizacion-Token');
        return HttpResponse.json(usuarioCreado, { status: 201 });
      }),
    );
    const user = userEvent.setup();
    const { onRegistrado, signIn } = renderDialog({ cotizacionId: ID });

    // Ya escribió su contacto al cotizar: solo falta la contraseña.
    expect(screen.getByLabelText(/^nombres/i)).toHaveValue('Ana');
    expect(screen.getByLabelText(/^apellidos/i)).toHaveValue('Ríos');
    expect(screen.getByLabelText(/^celular/i)).toHaveValue('987654321');
    expect(screen.getByLabelText(/^correo electrónico/i)).toHaveValue('ana@example.com');
    await enviarConContrasena(user);

    await waitFor(() => expect(onRegistrado).toHaveBeenCalled());
    expect(cuerpo).toEqual({
      nombres: 'Ana',
      apellidos: 'Ríos',
      email: 'ana@example.com',
      password: CONTRASENA,
      telefono: '987654321',
      cotizacionId: ID,
    });
    expect(cabecera).toBe('tok-123'); // la URL no es de una cotización: el token se manda a mano
    expect(signIn).toHaveBeenCalledWith('ana@example.com', CONTRASENA);
    expect(useContactoPrevioStore.getState().contacto).toBeNull(); // ya no hace falta guardarlo
  });

  it('valida la contraseña (mínimo 8) antes de llamar al backend', async () => {
    prellenar();
    let llamadas = 0;
    server.use(
      http.post(`${API}/auth/registro`, () => {
        llamadas += 1;
        return HttpResponse.json(usuarioCreado, { status: 201 });
      }),
    );
    const user = userEvent.setup();
    renderDialog();

    await enviarConContrasena(user, 'corta');

    expect(await screen.findByText('Usa al menos 8 caracteres')).toBeInTheDocument();
    expect(llamadas).toBe(0);
  });

  it('si el correo ya tiene cuenta, lo dice y ofrece iniciar sesión (sin iniciar sesión por su cuenta)', async () => {
    prellenar();
    server.use(
      http.post(`${API}/auth/registro`, () =>
        HttpResponse.json({ statusCode: 409, message: 'Ya existe una cuenta con ese email' }, { status: 409 }),
      ),
    );
    const user = userEvent.setup();
    const { signIn, onRegistrado } = renderDialog();

    await enviarConContrasena(user);

    expect(await screen.findByText('Ya existe una cuenta con ese email')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /inicia sesión/i })).toHaveAttribute('href', '/login');
    expect(signIn).not.toHaveBeenCalled();
    expect(onRegistrado).not.toHaveBeenCalled();
  });

  it('asigna al campo el error que devuelve el backend (RF-03)', async () => {
    prellenar();
    server.use(
      http.post(`${API}/auth/registro`, () =>
        HttpResponse.json(
          {
            statusCode: 400,
            message: 'Ingresa un celular peruano de 9 dígitos que empiece con 9',
            errors: [{ campo: 'telefono', mensaje: 'Ingresa un celular peruano de 9 dígitos que empiece con 9' }],
          },
          { status: 400 },
        ),
      ),
    );
    const user = userEvent.setup();
    renderDialog();

    await enviarConContrasena(user);

    expect(await screen.findByText('Ingresa un celular peruano de 9 dígitos que empiece con 9')).toBeInTheDocument();
  });

  it('una contraseña que el backend considera débil se muestra como mensaje, no se pierde', async () => {
    prellenar();
    server.use(
      http.post(`${API}/auth/registro`, () =>
        HttpResponse.json({ statusCode: 400, message: 'La contraseña es muy débil. Usa una más larga o más variada.' }, { status: 400 }),
      ),
    );
    const user = userEvent.setup();
    renderDialog();

    await enviarConContrasena(user);

    expect(await screen.findByRole('alert')).toHaveTextContent('La contraseña es muy débil');
  });

  it('si la cuenta se creó pero no se pudo iniciar sesión, lo explica y manda a iniciar sesión (no a registrarse otra vez)', async () => {
    prellenar();
    server.use(http.post(`${API}/auth/registro`, () => HttpResponse.json(usuarioCreado, { status: 201 })));
    const user = userEvent.setup();
    const signIn = nuevoSignIn().mockRejectedValue(new Error('x'));
    const { onRegistrado } = renderDialog({ signIn });

    await enviarConContrasena(user);

    expect(await screen.findByText(/tu cuenta se creó, pero no pudimos iniciar sesión/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /ir a iniciar sesión/i })).toHaveAttribute('href', '/login');
    expect(screen.getByRole('button', { name: /crear mi cuenta/i })).toBeDisabled();
    expect(onRegistrado).not.toHaveBeenCalled();
  });

  it('sin el token de la cotización crea la cuenta igual, pero sin vincularla (el backend lo exige)', async () => {
    prellenar();
    let cuerpo: Record<string, unknown> = {};
    let cabecera: string | null = 'sin-llamar';
    server.use(
      http.post(`${API}/auth/registro`, async ({ request }) => {
        cuerpo = (await request.json()) as Record<string, unknown>;
        cabecera = request.headers.get('X-Cotizacion-Token');
        return HttpResponse.json(usuarioCreado, { status: 201 });
      }),
    );
    const user = userEvent.setup();
    const { onRegistrado } = renderDialog({ cotizacionId: ID });

    await enviarConContrasena(user);

    await waitFor(() => expect(onRegistrado).toHaveBeenCalled());
    expect(cuerpo).not.toHaveProperty('cotizacionId');
    expect(cabecera).toBeNull();
  });
});

describe('Pantalla de compra: el cliente nuevo no queda sin salida', () => {
  const renderCompra = (opciones: Parameters<typeof renderConProviders>[1] = {}) =>
    renderConProviders(
      <Routes>
        <Route path="/compra/:cotizacionId" element={<CompraPage />} />
      </Routes>,
      { ruta: '/compra/cot-1?prima=p1', ...opciones },
    );

  it('sin sesión abre el registro (no manda a un login) y deja a mano "Ya tengo cuenta"', async () => {
    const user = userEvent.setup();
    renderCompra();

    expect(await screen.findByRole('dialog', { name: /crea tu cuenta para comprar/i })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /ahora no/i }));

    expect(screen.getByRole('heading', { level: 1, name: /crea tu cuenta para comprar/i })).toBeInTheDocument();
    // Quien ya tiene cuenta inicia sesión y vuelve a esta misma compra (con su prima elegida).
    expect(screen.getByRole('link', { name: /ya tengo cuenta/i })).toHaveAttribute('href', '/login');
    expect(screen.getByRole('link', { name: /volver a mi cotización/i })).toHaveAttribute('href', '/cotizacion/cot-1');
    await user.click(screen.getByRole('button', { name: /crear mi cuenta/i }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });

  it('un cliente con sesión ya no ve el registro', async () => {
    // Con la cuenta lista se entra directo al asistente de compra (Ola 3), sin diálogo de registro.
    server.use(
      http.get(`${API}/compras/resumen`, () =>
        HttpResponse.json({
          cotizacionId: 'cot-1',
          primaCotizadaId: 'p1',
          ordenId: null,
          aseguradora: 'Rímac',
          plan: 'Oro',
          sumaAsegurada: '15000.00',
          primaAnual: '640.40',
          descuento: null,
          primaFinal: '640.40',
          pago: { UNICO: { total: '640.40' }, CUOTAS: null, maxCuotas: 1 },
        }),
      ),
      http.get(`${API}/compras/cot-1/campos-faltantes`, () => HttpResponse.json({ campos: [] })),
    );
    renderCompra({ roles: ['CLIENTE'] });

    expect(await screen.findByRole('heading', { name: /revisa tu compra/i })).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('un asesor o administrador no compra', async () => {
    renderCompra({ roles: ['ASESOR'] });

    expect(await screen.findByText('No tienes acceso a esta pantalla')).toBeInTheDocument();
  });
});

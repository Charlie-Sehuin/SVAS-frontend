import { describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '../../test/msw/server';
import { API, usuarioAdminMock } from '../../test/msw/handlers';
import { renderConProviders } from '../../test/render';
import { DesgloseCalculo } from '../../shared/ui/domain/DesgloseCalculo';
import type { DetalleCalculoTarifa } from '../../shared/types/api';
import { UsuariosPage } from './pages/UsuariosPage';
import { AseguradorasPlanesPage } from './pages/AseguradorasPlanesPage';
import { CamposRequeridosPage } from './pages/CamposRequeridosPage';
import { ParametrosPage } from './pages/ParametrosPage';
import { BitacoraPage } from './pages/BitacoraPage';
import { TarifasPesosPage } from './pages/TarifasPesosPage';

const ADMIN = { roles: ['ADMINISTRADOR' as const] };

const ASEG_RIMAC = { id: '11111111-1111-4111-8111-111111111111', nombre: 'Rímac', activa: true, codigoEstrategia: 'RIMAC' };
const PLAN_ORO = { id: '22222222-2222-4222-8222-222222222222', aseguradoraId: ASEG_RIMAC.id, nombre: 'Oro', descripcion: null, activo: false };

/** Espera a que carguen las aseguradoras y elige Rímac (evita elegir antes de que exista la opción). */
async function elegirAseguradora(user: ReturnType<typeof userEvent.setup>) {
  await screen.findByRole('option', { name: 'Rímac' });
  await user.selectOptions(screen.getByRole('combobox', { name: /aseguradora/i }), ASEG_RIMAC.id);
}

const error400 = (message: string, errors?: { campo: string; mensaje: string }[]) =>
  HttpResponse.json({ statusCode: 400, message, errors, correlationId: 'corr-test' }, { status: 400 });

describe('Usuarios y roles', () => {
  const usuarios = {
    items: [
      { id: 'a', email: 'admin@segurosimple.test', rol: 'ADMINISTRADOR', nombreCompleto: 'Ana Admin', activo: true },
      { id: 'u1', email: 'luis@segurosimple.test', rol: 'ASESOR', nombreCompleto: 'Luis Asesor', activo: true },
    ],
    total: 2,
    pagina: 1,
    tamano: 20,
  };

  it('lista usuarios y no deja al administrador desactivarse a sí mismo', async () => {
    server.use(
      http.get(`${API}/admin/usuarios`, () => HttpResponse.json(usuarios)),
      http.get(`${API}/usuarios/me`, () => HttpResponse.json({ ...usuarioAdminMock, id: 'a' })),
    );
    renderConProviders(<UsuariosPage />, ADMIN);

    expect(await screen.findByText('Luis Asesor')).toBeInTheDocument();
    expect(await screen.findByText('(tú)')).toBeInTheDocument();
    // Solo la fila de Luis tiene botón para desactivar.
    expect(screen.getAllByRole('button', { name: /^desactivar$/i })).toHaveLength(1);
  });

  it('crea un usuario y muestra la contraseña temporal una sola vez', async () => {
    let cuerpo: unknown;
    server.use(
      http.get(`${API}/admin/usuarios`, () => HttpResponse.json(usuarios)),
      http.get(`${API}/usuarios/me`, () => HttpResponse.json({ ...usuarioAdminMock, id: 'a' })),
      http.post(`${API}/admin/usuarios`, async ({ request }) => {
        cuerpo = await request.json();
        return HttpResponse.json(
          {
            usuario: { id: 'n', email: 'sofia@segurosimple.test', rol: 'ASESOR', nombreCompleto: 'Sofía Nueva', activo: true },
            contrasenaTemporal: 'Temp-Pass-12345',
          },
          { status: 201 },
        );
      }),
    );
    const user = userEvent.setup();
    renderConProviders(<UsuariosPage />, ADMIN);

    await user.click(await screen.findByRole('button', { name: /crear usuario/i }));
    const dialogo = await screen.findByRole('dialog');
    await user.type(within(dialogo).getByLabelText(/nombre completo/i), 'Sofía Nueva');
    await user.type(within(dialogo).getByLabelText(/correo/i), 'sofia@segurosimple.test');
    await user.click(within(dialogo).getByRole('button', { name: /^crear usuario$/i }));

    expect(await screen.findByText('Temp-Pass-12345')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(/una sola vez/i);
    expect(cuerpo).toEqual({ email: 'sofia@segurosimple.test', nombreCompleto: 'Sofía Nueva', rol: 'ASESOR' });
  });

  it('valida el correo antes de llamar al backend', async () => {
    let llamadas = 0;
    server.use(
      http.get(`${API}/admin/usuarios`, () => HttpResponse.json(usuarios)),
      http.get(`${API}/usuarios/me`, () => HttpResponse.json({ ...usuarioAdminMock, id: 'a' })),
      http.post(`${API}/admin/usuarios`, () => {
        llamadas += 1;
        return HttpResponse.json({}, { status: 201 });
      }),
    );
    const user = userEvent.setup();
    renderConProviders(<UsuariosPage />, ADMIN);

    await user.click(await screen.findByRole('button', { name: /crear usuario/i }));
    const dialogo = await screen.findByRole('dialog');
    await user.type(within(dialogo).getByLabelText(/nombre completo/i), 'Sofía Nueva');
    await user.type(within(dialogo).getByLabelText(/correo/i), 'no-es-un-correo');
    await user.click(within(dialogo).getByRole('button', { name: /^crear usuario$/i }));

    expect(await within(dialogo).findByText('Ese correo no parece válido')).toBeInTheDocument();
    expect(llamadas).toBe(0);
  });

  it('pide confirmación y desactiva con PATCH', async () => {
    let cuerpo: unknown;
    server.use(
      http.get(`${API}/admin/usuarios`, () => HttpResponse.json(usuarios)),
      http.get(`${API}/usuarios/me`, () => HttpResponse.json({ ...usuarioAdminMock, id: 'a' })),
      http.patch(`${API}/admin/usuarios/u1/estado`, async ({ request }) => {
        cuerpo = await request.json();
        return HttpResponse.json({ ...usuarios.items[1], activo: false });
      }),
    );
    const user = userEvent.setup();
    renderConProviders(<UsuariosPage />, ADMIN);

    await user.click(await screen.findByRole('button', { name: /^desactivar$/i }));
    const dialogo = await screen.findByRole('dialog');
    expect(dialogo).toHaveTextContent('Luis Asesor');
    await user.click(within(dialogo).getByRole('button', { name: /^desactivar$/i }));

    await waitFor(() => expect(cuerpo).toEqual({ activo: false }));
  });
});

describe('Aseguradoras y planes', () => {
  it('si activar un plan falla por contenido incompleto, muestra el mensaje con enlace al editor', async () => {
    server.use(
      http.get(`${API}/admin/aseguradoras`, () => HttpResponse.json([ASEG_RIMAC])),
      http.get(`${API}/admin/planes`, () => HttpResponse.json([PLAN_ORO])),
      http.patch(`${API}/admin/planes/${PLAN_ORO.id}`, () => error400('No puedes activar este plan: faltan 3 coberturas por definir.')),
    );
    const user = userEvent.setup();
    renderConProviders(<AseguradorasPlanesPage />, ADMIN);

    await user.click(await screen.findByRole('switch', { name: /activar plan oro/i }));

    const alerta = await screen.findByRole('alert');
    expect(alerta).toHaveTextContent('faltan 3 coberturas por definir');
    expect(within(alerta).getByRole('link', { name: /completar el contenido/i })).toHaveAttribute(
      'href',
      `/app/admin/planes/${PLAN_ORO.id}/contenido`,
    );
  });
});

describe('Campos requeridos', () => {
  it('no deja guardar una lista sin opciones (RN-17) y no llama al backend', async () => {
    let llamadas = 0;
    server.use(
      http.get(`${API}/admin/aseguradoras`, () => HttpResponse.json([ASEG_RIMAC])),
      http.get(`${API}/admin/campos`, () => HttpResponse.json([])),
      http.post(`${API}/admin/campos`, () => {
        llamadas += 1;
        return HttpResponse.json({}, { status: 201 });
      }),
    );
    const user = userEvent.setup();
    renderConProviders(<CamposRequeridosPage />, ADMIN);

    await elegirAseguradora(user);
    await user.click(screen.getByRole('button', { name: /nuevo campo/i }));
    const dialogo = await screen.findByRole('dialog');
    await user.type(within(dialogo).getByLabelText(/nombre del campo/i), 'color');
    await user.selectOptions(within(dialogo).getByLabelText(/^tipo/i), 'LISTA');
    await user.click(within(dialogo).getByRole('button', { name: /crear campo/i }));

    expect(await within(dialogo).findByText('Una lista necesita al menos una opción.')).toBeInTheDocument();
    expect(llamadas).toBe(0);
  });

  it('envía las opciones, una por línea, sin vacíos ni repetidos', async () => {
    let cuerpo: Record<string, unknown> = {};
    server.use(
      http.get(`${API}/admin/aseguradoras`, () => HttpResponse.json([ASEG_RIMAC])),
      http.get(`${API}/admin/campos`, () => HttpResponse.json([])),
      http.post(`${API}/admin/campos`, async ({ request }) => {
        cuerpo = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ id: 'c1', ...cuerpo, activo: true }, { status: 201 });
      }),
    );
    const user = userEvent.setup();
    renderConProviders(<CamposRequeridosPage />, ADMIN);

    await elegirAseguradora(user);
    await user.click(screen.getByRole('button', { name: /nuevo campo/i }));
    const dialogo = await screen.findByRole('dialog');
    await user.type(within(dialogo).getByLabelText(/nombre del campo/i), 'color');
    await user.selectOptions(within(dialogo).getByLabelText(/^tipo/i), 'LISTA');
    await user.type(await within(dialogo).findByLabelText(/opciones permitidas/i), 'Rojo{Enter}Azul{Enter}{Enter}Rojo');
    await user.click(within(dialogo).getByRole('button', { name: /crear campo/i }));

    await waitFor(() => expect(cuerpo.valores).toEqual(['Rojo', 'Azul']));
    expect(cuerpo).toMatchObject({ aseguradoraId: ASEG_RIMAC.id, nombre: 'color', tipo: 'LISTA', obligatorio: true, origenValores: 'ESTATICO' });
  });
});

describe('Parámetros comerciales', () => {
  const parametros = {
    descuentoPrimeraCompra: '5.00',
    descuentoMaximo: '10.00',
    maxIntentos: 4,
    diasSeguimiento: 7,
    maxCuotas: 12,
    vigenciaEnlaceDias: 7,
    horasAbandono: 24,
    moneda: 'USD',
    tipoCambioReferencial: '3.7500',
  };

  it('no deja que el descuento de primera compra supere al máximo (RN-07, RN-08)', async () => {
    let llamadas = 0;
    server.use(
      http.get(`${API}/admin/parametros`, () => HttpResponse.json(parametros)),
      http.put(`${API}/admin/parametros`, () => {
        llamadas += 1;
        return HttpResponse.json(parametros);
      }),
    );
    const user = userEvent.setup();
    renderConProviders(<ParametrosPage />, ADMIN);

    const campo = await screen.findByLabelText(/descuento de primera compra/i);
    await waitFor(() => expect(campo).toHaveValue('5.00'));
    await user.clear(campo);
    await user.type(campo, '20');
    await user.click(screen.getByRole('button', { name: /guardar cambios/i }));

    expect(await screen.findByText('No puede superar el descuento máximo')).toBeInTheDocument();
    expect(llamadas).toBe(0);
  });

  it('guarda números (no strings) y acepta coma decimal', async () => {
    let cuerpo: Record<string, unknown> = {};
    server.use(
      http.get(`${API}/admin/parametros`, () => HttpResponse.json(parametros)),
      http.put(`${API}/admin/parametros`, async ({ request }) => {
        cuerpo = (await request.json()) as Record<string, unknown>;
        return HttpResponse.json({ ...parametros, descuentoPrimeraCompra: '6.50' });
      }),
    );
    const user = userEvent.setup();
    renderConProviders(<ParametrosPage />, ADMIN);

    const campo = await screen.findByLabelText(/descuento de primera compra/i);
    await waitFor(() => expect(campo).toHaveValue('5.00'));
    await user.clear(campo);
    await user.type(campo, '6,5');
    await user.click(screen.getByRole('button', { name: /guardar cambios/i }));

    await waitFor(() => expect(cuerpo.descuentoPrimeraCompra).toBe(6.5));
    expect(cuerpo).toMatchObject({ descuentoMaximo: 10, maxIntentos: 4, maxCuotas: 12, moneda: 'USD', tipoCambioReferencial: 3.75 });
  });
});

describe('Bitácora', () => {
  it('muestra el antes y el después al abrir un registro', async () => {
    server.use(
      http.get(`${API}/admin/bitacora`, () =>
        HttpResponse.json({
          items: [
            {
              id: 'b1',
              usuarioId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
              accion: 'EDITAR_PLAN',
              entidad: 'plan',
              entidadId: 'p1',
              detalle: { antes: { activo: false }, despues: { activo: true } },
              fecha: '2026-11-12T15:30:00-05:00',
            },
          ],
          total: 1,
          pagina: 1,
          tamano: 25,
        }),
      ),
    );
    const user = userEvent.setup();
    renderConProviders(<BitacoraPage />, ADMIN);

    expect(await screen.findByText('EDITAR_PLAN')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /ver detalle de editar_plan/i }));
    expect(screen.getByText('Antes')).toBeInTheDocument();
    expect(screen.getByText('Después')).toBeInTheDocument();
    expect(screen.getAllByText(/"activo"/)).toHaveLength(2);
  });
});

describe('Tarifas · pesos', () => {
  const pesos = [
    { clave: 'm1', nombre: 'Toyota', peso: '1.000' },
    { clave: 'm2', nombre: 'Kia', peso: '0.950' },
  ];

  it('valida el rango 0,500–3,000 y envía solo las filas cambiadas', async () => {
    let cuerpo: { aseguradoraId: string; filas: { clave: string; peso: number }[] } | undefined;
    server.use(
      http.get(`${API}/admin/aseguradoras`, () => HttpResponse.json([ASEG_RIMAC])),
      http.get(`${API}/admin/tarifas/pesos/marca`, () => HttpResponse.json(pesos)),
      http.put(`${API}/admin/tarifas/pesos/marca`, async ({ request }) => {
        cuerpo = (await request.json()) as typeof cuerpo;
        return HttpResponse.json({ recibidas: 1, cambiadas: 1, total: 2 });
      }),
    );
    const user = userEvent.setup();
    renderConProviders(<TarifasPesosPage />, ADMIN);

    await elegirAseguradora(user);
    const toyota = await screen.findByLabelText('Peso de Toyota');
    const guardar = screen.getByRole('button', { name: /^guardar/i });
    expect(guardar).toBeDisabled();

    // Fuera de rango: error y no se puede guardar.
    await user.clear(toyota);
    await user.type(toyota, '3.5');
    expect(await screen.findByText('Entre 0.500 y 3.000')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^guardar/i })).toBeDisabled();

    // Válido: se habilita y envía solo esa fila.
    await user.clear(toyota);
    await user.type(toyota, '1,25');
    await user.click(screen.getByRole('button', { name: /guardar \(1\)/i }));

    await waitFor(() => expect(cuerpo).toBeDefined());
    expect(cuerpo).toEqual({ aseguradoraId: ASEG_RIMAC.id, filas: [{ clave: 'm1', peso: 1.25 }] });
  });
});

describe('DesgloseCalculo', () => {
  it('muestra tasa base, pesos, parámetros y los pasos propios de la fórmula', () => {
    const detalle: DetalleCalculoTarifa = {
      estrategia: 'PACIFICO',
      sumaAsegurada: '15000.00',
      rango: { minima: '12000.00', maxima: '16800.00' },
      tasaBase: '0.0420',
      parametros: { cargo_fijo_anual: 25 },
      pesos: { marca: '1.000', modelo: '0.950', anio: '1.100', ubigeo: '1.000' },
      ubigeoPorDefecto: true,
      tasa: '0.0439',
      cargoFijo: '25.00',
      primaAnual: '683.50',
      totalEnCuotas: '683.50',
    };
    renderConProviders(<DesgloseCalculo detalle={detalle} />);

    expect(screen.getByText('Cómo se calculó')).toBeInTheDocument();
    expect(screen.getByText('USD 15,000.00')).toBeInTheDocument();
    expect(screen.getByText('0.0420')).toBeInTheDocument();
    expect(screen.getByText('Cargo fijo anual')).toBeInTheDocument();
    expect(screen.getByText('Distrito (ubigeo)')).toBeInTheDocument();
    expect(screen.getByText(/se usó 1.000/i)).toBeInTheDocument();
    expect(screen.getByText('Pasos de la fórmula')).toBeInTheDocument();
    expect(screen.getAllByText('USD 683.50')).toHaveLength(2);
  });
});

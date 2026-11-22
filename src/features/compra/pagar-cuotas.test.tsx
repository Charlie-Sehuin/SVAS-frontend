import { describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '../../test/msw/server';
import { API } from '../../test/msw/handlers';
import { renderConProviders } from '../../test/render';
import { Toaster } from '../../shared/ui/toaster';
import type { CuotaResumen, PolizaResumen } from '../../shared/types/api';
import { CampanaAvisos } from '../../app-shell/CampanaAvisos';
import { MisPolizasPage } from './pages/MisPolizasPage';

const ORDEN = 'b1b2b3b4-c1c2-4d1d-8e1e-f1f2f3f4f5f6';
const POLIZA = 'c1c2c3c4-d1d2-4e1e-8f1f-a1a2a3a4a5a6';

/** Cuotas de 54.18: la 1 pagada; las pendientes con sus días y su acumulado, como los manda el backend. */
function cuotasMock(dias: number[]): CuotaResumen[] {
  let acumulado = 0;
  return [
    { numero: 1, monto: '54.18', fechaVencimiento: '2026-11-12', estado: 'CONFIRMADO', diasParaVencer: null, montoAcumulado: null },
    ...dias.map((d, i) => {
      acumulado += 54.18;
      return {
        numero: i + 2,
        monto: '54.18',
        fechaVencimiento: '2026-12-12',
        estado: 'PENDIENTE' as const,
        diasParaVencer: d,
        montoAcumulado: acumulado.toFixed(2),
      };
    }),
  ];
}

const poliza = (cuotas: CuotaResumen[]): PolizaResumen =>
  ({
    id: POLIZA,
    ordenId: ORDEN,
    numero: 'LAP-2026-A1B2C3D4',
    fechaEmision: '2026-11-12T15:00:00-05:00',
    aseguradora: 'La Positiva',
    plan: 'Full',
    vehiculo: { marca: 'Toyota', modelo: 'Corolla', anio: 2022, placa: 'ABC-123' },
    sumaAsegurada: '15000.00',
    primaFinal: '619.20',
    pago: { modo: 'CUOTAS', montoTotal: '650.16', numeroCuotas: cuotas.length, cuotas },
    pdfDisponible: true,
    contenidoPlan: { planId: 'plan-1', aseguradora: 'La Positiva', plan: 'Full', resumen: 'Cobertura completa', descripcion: null, idealPara: null, coberturas: [], exclusiones: [], requisitos: [], congeladoEn: '2026-11-12T15:00:00-05:00' },
  }) as unknown as PolizaResumen;

const dar = (p: PolizaResumen) => server.use(http.get(`${API}/polizas/mias`, () => HttpResponse.json([p])));

const renderPolizas = () =>
  renderConProviders(
    <>
      <MisPolizasPage />
      <Toaster />
    </>,
    { roles: ['CLIENTE'], ruta: '/mi-cuenta/polizas' },
  );

/** Respuesta del backend al pagar: las `n` siguientes quedan pagadas. */
const respuestaPago = (cuotas: CuotaResumen[], n: number) => {
  const pendientes = cuotas.filter((c) => c.estado === 'PENDIENTE');
  const pagadas = pendientes.slice(0, n).map((c) => c.numero);
  return {
    pago: {
      referencia: 'SIM-1',
      montoPagado: pendientes[n - 1]!.montoAcumulado,
      cuotasPagadas: pagadas,
      cuotasPendientes: pendientes.length - n,
      cuotas,
    },
  };
};

describe('Cuotas en Mis pólizas', () => {
  it('muestra la siguiente cuota con cuándo vence y cuántas quedan, y un cronograma con estado en texto', async () => {
    dar(poliza(cuotasMock([-3, 27, 58])));
    const user = userEvent.setup();
    renderPolizas();

    expect(await screen.findByText('Tus cuotas')).toBeInTheDocument();
    expect(screen.getByText('Te quedan 3 por pagar')).toBeInTheDocument();
    expect(screen.getByText(/Siguiente: cuota 2/)).toBeInTheDocument();
    expect(screen.getByText(/venció hace 3 días/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /ver cronograma/i }));
    const cronograma = screen.getByRole('list', { name: 'Cronograma de cuotas' });
    expect(within(cronograma).getByText('Vencida ·')).toBeInTheDocument();
    expect(within(cronograma).getByText('Pagada')).toBeInTheDocument();
    expect(within(cronograma).getAllByText('Pendiente')).toHaveLength(3);
  });

  it('con todo pagado dice "Todo pagado" y no ofrece pagar', async () => {
    dar(poliza(cuotasMock([])));
    renderPolizas();

    expect(await screen.findByText('Todo pagado')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Pagar cuotas' })).not.toBeInTheDocument();
  });

  it('una póliza pagada al contado no muestra cuotas', async () => {
    dar({ ...poliza([]), pago: { modo: 'UNICO', montoTotal: '619.20', numeroCuotas: null, cuotas: [] } } as PolizaResumen);
    renderPolizas();

    expect(await screen.findByText('Plan Full')).toBeInTheDocument();
    expect(screen.queryByText('Tus cuotas')).not.toBeInTheDocument();
  });
});

describe('Pagar cuotas', () => {
  it('por defecto paga solo la siguiente, con el monto que dice el backend, y avisa que es simulado', async () => {
    const cuotas = cuotasMock([5, 35, 66]);
    dar(poliza(cuotas));
    let cuerpo: unknown = null;
    let clave: string | null = null;
    server.use(
      http.post(`${API}/compras/${ORDEN}/cuotas/pago`, async ({ request }) => {
        cuerpo = await request.json();
        clave = request.headers.get('idempotency-key');
        return HttpResponse.json(respuestaPago(cuotas, 1), { status: 201 });
      }),
    );
    const user = userEvent.setup();
    renderPolizas();

    await user.click(await screen.findByRole('button', { name: 'Pagar cuotas' }));
    const dialogo = await screen.findByRole('dialog');
    expect(within(dialogo).getByText('Vas a pagar la cuota 2')).toBeInTheDocument();
    expect(within(dialogo).getByText('El pago es simulado: no se cobra dinero real.')).toBeInTheDocument();
    await user.click(within(dialogo).getByRole('button', { name: /^Pagar/ }));

    await waitFor(() => expect(cuerpo).toEqual({ cantidad: 1 }));
    expect(clave).toMatch(/^[A-Za-z0-9_.:-]{8,100}$/);
    expect(await screen.findByText('Pago registrado')).toBeInTheDocument();
    expect(screen.getByText('Pagaste la cuota 2.')).toBeInTheDocument();
  });

  it('un grupo de cuotas muestra el rango y el acumulado del backend, sin sumar en el navegador', async () => {
    const cuotas = cuotasMock([5, 35, 66, 96]);
    dar(poliza(cuotas));
    let cuerpo: unknown = null;
    server.use(
      http.post(`${API}/compras/${ORDEN}/cuotas/pago`, async ({ request }) => {
        cuerpo = await request.json();
        return HttpResponse.json(respuestaPago(cuotas, 3), { status: 201 });
      }),
    );
    const user = userEvent.setup();
    renderPolizas();

    await user.click(await screen.findByRole('button', { name: 'Pagar cuotas' }));
    const dialogo = await screen.findByRole('dialog');
    await user.click(within(dialogo).getByRole('radio', { name: /un grupo de cuotas/i }));
    await user.selectOptions(within(dialogo).getByLabelText('¿Cuántas cuotas?'), '3');

    expect(within(dialogo).getByText('Vas a pagar las cuotas 2 a 4')).toBeInTheDocument();
    // 3 cuotas = el acumulado de la tercera pendiente que mandó el backend (162.54), no una suma del navegador.
    expect(within(dialogo).getAllByLabelText('162 dólares con 54 centavos').length).toBeGreaterThan(0);
    await user.click(within(dialogo).getByRole('button', { name: /^Pagar/ }));

    await waitFor(() => expect(cuerpo).toEqual({ cantidad: 3 }));
    expect(await screen.findByText('Pagaste las cuotas 2 a 4.')).toBeInTheDocument();
  });

  it('pagar todas de golpe manda la cantidad de pendientes', async () => {
    const cuotas = cuotasMock([5, 35]);
    dar(poliza(cuotas));
    let cuerpo: unknown = null;
    server.use(
      http.post(`${API}/compras/${ORDEN}/cuotas/pago`, async ({ request }) => {
        cuerpo = await request.json();
        return HttpResponse.json(respuestaPago(cuotas, 2), { status: 201 });
      }),
    );
    const user = userEvent.setup();
    renderPolizas();

    await user.click(await screen.findByRole('button', { name: 'Pagar cuotas' }));
    const dialogo = await screen.findByRole('dialog');
    await user.click(within(dialogo).getByRole('radio', { name: /todas las que quedan \(2\)/i }));
    expect(within(dialogo).getByText('Vas a pagar las cuotas 2 a 3')).toBeInTheDocument();
    await user.click(within(dialogo).getByRole('button', { name: /^Pagar/ }));

    await waitFor(() => expect(cuerpo).toEqual({ cantidad: 2 }));
  });

  it('con una sola cuota pendiente solo ofrece "la siguiente"; con dos, también "todas"; el grupo, desde tres', async () => {
    dar(poliza(cuotasMock([5])));
    const user = userEvent.setup();
    const { unmount } = renderPolizas();
    await user.click(await screen.findByRole('button', { name: 'Pagar cuotas' }));
    let d = await screen.findByRole('dialog');
    expect(within(d).getAllByRole('radio')).toHaveLength(1);
    unmount();

    dar(poliza(cuotasMock([5, 35])));
    renderPolizas();
    await user.click(await screen.findByRole('button', { name: 'Pagar cuotas' }));
    d = await screen.findByRole('dialog');
    expect(within(d).getAllByRole('radio').map((r) => (r as HTMLInputElement).value)).toEqual(['SIGUIENTE', 'TODAS']);
  });

  it('avisa que una cuota vencida se paga sin recargo', async () => {
    dar(poliza(cuotasMock([-4, 26])));
    const user = userEvent.setup();
    renderPolizas();

    await user.click(await screen.findByRole('button', { name: 'Pagar cuotas' }));
    expect(await screen.findByText('Incluye cuotas vencidas: no tienen recargo.')).toBeInTheDocument();
  });

  it('si el pago es rechazado muestra el mensaje del backend y el siguiente intento usa otra clave', async () => {
    dar(poliza(cuotasMock([5, 35])));
    const claves: string[] = [];
    server.use(
      http.post(`${API}/compras/${ORDEN}/cuotas/pago`, ({ request }) => {
        claves.push(request.headers.get('idempotency-key') ?? '');
        return HttpResponse.json({ statusCode: 400, message: 'El pago fue rechazado. Revisa los datos de tu medio de pago o intenta con otro.' }, { status: 400 });
      }),
    );
    const user = userEvent.setup();
    renderPolizas();

    await user.click(await screen.findByRole('button', { name: 'Pagar cuotas' }));
    const dialogo = await screen.findByRole('dialog');
    await user.click(within(dialogo).getByRole('button', { name: /^Pagar/ }));
    expect(await within(dialogo).findByText('Tu pago no pudo procesarse')).toBeInTheDocument();
    expect(within(dialogo).getByText(/El pago fue rechazado/)).toBeInTheDocument();

    await user.click(within(dialogo).getByRole('button', { name: /^Pagar/ }));
    await waitFor(() => expect(claves).toHaveLength(2));
    expect(claves[0]).not.toBe(claves[1]);
    expect(screen.queryByText('Pago registrado')).not.toBeInTheDocument();
  });

  it('si falla el servidor conserva la misma clave para reintentar sin riesgo de cobrar dos veces', async () => {
    dar(poliza(cuotasMock([5, 35])));
    const claves: string[] = [];
    server.use(
      http.post(`${API}/compras/${ORDEN}/cuotas/pago`, ({ request }) => {
        claves.push(request.headers.get('idempotency-key') ?? '');
        return HttpResponse.json({ statusCode: 500, message: 'Ocurrió un error en el servidor.' }, { status: 500 });
      }),
    );
    const user = userEvent.setup();
    renderPolizas();

    await user.click(await screen.findByRole('button', { name: 'Pagar cuotas' }));
    const dialogo = await screen.findByRole('dialog');
    await user.click(within(dialogo).getByRole('button', { name: /^Pagar/ }));
    await waitFor(() => expect(claves).toHaveLength(1));
    await screen.findByText('Ocurrió un error en el servidor.');
    await user.click(within(dialogo).getByRole('button', { name: /^Pagar/ }));
    await waitFor(() => expect(claves).toHaveLength(2));
    expect(claves[0]).toBe(claves[1]);
  });

  it('cambiar lo que se paga renueva la clave (es otro pago)', async () => {
    dar(poliza(cuotasMock([5, 35, 66])));
    const claves: string[] = [];
    server.use(
      http.post(`${API}/compras/${ORDEN}/cuotas/pago`, ({ request }) => {
        claves.push(request.headers.get('idempotency-key') ?? '');
        return HttpResponse.json({ statusCode: 500, message: 'Ocurrió un error en el servidor.' }, { status: 500 });
      }),
    );
    const user = userEvent.setup();
    renderPolizas();

    await user.click(await screen.findByRole('button', { name: 'Pagar cuotas' }));
    const dialogo = await screen.findByRole('dialog');
    await user.click(within(dialogo).getByRole('button', { name: /^Pagar/ }));
    await waitFor(() => expect(claves).toHaveLength(1));
    await user.click(within(dialogo).getByRole('radio', { name: /todas las que quedan/i }));
    await user.click(within(dialogo).getByRole('button', { name: /^Pagar/ }));
    await waitFor(() => expect(claves).toHaveLength(2));
    expect(claves[0]).not.toBe(claves[1]);
  });
});

describe('Campanita de avisos', () => {
  const renderCampana = () => renderConProviders(<CampanaAvisos variante="claro" />, { roles: ['CLIENTE'] });

  it('muestra cuántos avisos hay y, al abrirla, qué cuota y cuándo vence, con un enlace a la póliza', async () => {
    dar(poliza(cuotasMock([-3, 27])));
    const user = userEvent.setup();
    renderCampana();

    const boton = await screen.findByRole('button', { name: 'Avisos: 1 pendiente' });
    await user.click(boton);

    expect(await screen.findByText('Avisos de tus cuotas')).toBeInTheDocument();
    expect(screen.getByText('Vencida')).toBeInTheDocument();
    expect(screen.getByText('Cuota 2 de tu póliza LAP-2026-A1B2C3D4')).toBeInTheDocument();
    expect(screen.getByText(/venció hace 3 días/)).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /Cuota 2 de tu póliza/ })).toHaveAttribute('href', `/mi-cuenta/polizas#poliza-${POLIZA}`);
  });

  it('una cuota que vence en pocos días se rotula "Por vencer"', async () => {
    dar(poliza(cuotasMock([3, 33])));
    const user = userEvent.setup();
    renderCampana();

    await user.click(await screen.findByRole('button', { name: 'Avisos: 1 pendiente' }));
    expect(await screen.findByText('Por vencer')).toBeInTheDocument();
    expect(screen.getByText(/vence en 3 días/)).toBeInTheDocument();
  });

  it('sin avisos dice que estás al día', async () => {
    dar(poliza(cuotasMock([40, 70])));
    const user = userEvent.setup();
    renderCampana();

    await user.click(await screen.findByRole('button', { name: 'Avisos: no tienes pendientes' }));
    expect(await screen.findByText('Estás al día: no tienes cuotas vencidas ni por vencer.')).toBeInTheDocument();
  });

  it('no aparece para quien no es cliente ni para anónimos', () => {
    const { container } = renderConProviders(<CampanaAvisos variante="claro" />, { roles: ['ASESOR'] });
    expect(container).toBeEmptyDOMElement();
    const anonimo = renderConProviders(<CampanaAvisos variante="claro" />);
    expect(anonimo.container).toBeEmptyDOMElement();
  });
});

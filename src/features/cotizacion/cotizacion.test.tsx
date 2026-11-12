import { beforeEach, describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { delay, http, HttpResponse } from 'msw';
import { Route, Routes } from 'react-router-dom';
import { server } from '../../test/msw/server';
import { API } from '../../test/msw/handlers';
import { renderConProviders } from '../../test/render';
import { useCotizacionTokenStore } from '../../shared/stores/useCotizacionTokenStore';
import type { Cotizacion, PrimaCotizada } from '../../shared/types/api';
import { ComparativoPage } from './pages/ComparativoPage';
import { CotizarPage } from './pages/CotizarPage';
import { MisCotizacionesPage } from './pages/MisCotizacionesPage';
import { useCotizarWizardStore } from './store/useCotizarWizardStore';

type Usuario = ReturnType<typeof userEvent.setup>;

beforeEach(() => {
  // El borrador y el token viven en módulos (zustand): se limpian para que una prueba no contamine a la siguiente.
  useCotizarWizardStore.getState().reiniciar();
  useCotizacionTokenStore.getState().limpiar();
});

/* ───────────────────────── Asistente de cotizar ───────────────────────── */

const ID = '7f1a2b3c-4d5e-4f60-8a7b-9c0d1e2f3a4b';

function catalogoGeografico() {
  server.use(
    http.get(`${API}/catalogo/vehiculos/marcas`, () => HttpResponse.json([{ id: 'm1', nombre: 'Toyota' }])),
    http.get(`${API}/catalogo/vehiculos/marcas/m1/modelos`, () => HttpResponse.json([{ id: 'mo1', nombre: 'Corolla', tipo: 'SEDAN' }])),
    http.get(`${API}/catalogo/vehiculos/modelos/mo1/anios`, () => HttpResponse.json([2023, 2022])),
    http.get(`${API}/catalogo/ubigeos/departamentos`, () => HttpResponse.json([{ departamento: 'Lima' }])),
    http.get(`${API}/catalogo/ubigeos/provincias`, () => HttpResponse.json([{ provincia: 'Provincia de Lima' }])),
    http.get(`${API}/catalogo/ubigeos/distritos`, () => HttpResponse.json([{ ubigeo: '150122', distrito: 'Miraflores' }])),
  );
}

const cotizacionCreada = (): Cotizacion => ({
  id: ID,
  estado: 'REGISTRADA',
  fecha: '2026-11-12T15:00:00-05:00',
  opciones: ['COMPRA_INMEDIATA', 'ASESORIA'],
  motivoDerivacion: null,
  vehiculo: { uso: 'PARTICULAR', marca: 'Toyota', modelo: 'Corolla', tipo: 'SEDAN', anio: 2022, ubigeo: '150122' },
  primas: [],
});

function renderWizard() {
  return renderConProviders(
    <Routes>
      <Route path="/cotizar" element={<CotizarPage />} />
      <Route path="/cotizacion/:id" element={<p>destino del comparativo</p>} />
    </Routes>,
    { ruta: '/cotizar' },
  );
}

async function completarPaso1(user: Usuario, extra?: { placa?: string; clase?: string }) {
  await screen.findByRole('option', { name: 'Toyota' });
  await user.selectOptions(screen.getByLabelText(/^marca/i), 'm1');
  await screen.findByRole('option', { name: 'Corolla' });
  await user.selectOptions(screen.getByLabelText(/^modelo/i), 'mo1');
  await screen.findByRole('option', { name: '2022' });
  await user.selectOptions(screen.getByLabelText(/^año/i), '2022');
  if (extra?.placa) await user.type(screen.getByLabelText(/^placa/i), extra.placa);
  if (extra?.clase) await user.selectOptions(screen.getByLabelText(/^clase/i), extra.clase);
  await user.click(screen.getByRole('button', { name: /^continuar/i }));
}

async function completarPaso2(user: Usuario) {
  await screen.findByRole('heading', { name: '¿Dónde usas tu auto?' });
  await screen.findByRole('option', { name: 'Lima' });
  await user.selectOptions(screen.getByLabelText(/^departamento/i), 'Lima');
  await screen.findByRole('option', { name: 'Provincia de Lima' });
  await user.selectOptions(screen.getByLabelText(/^provincia/i), 'Provincia de Lima');
  await screen.findByRole('option', { name: 'Miraflores' });
  await user.selectOptions(screen.getByLabelText(/^distrito/i), '150122');
  await user.click(screen.getByRole('button', { name: /^continuar/i }));
}

async function completarPaso3(user: Usuario) {
  await screen.findByRole('heading', { name: '¿Dónde te enviamos tus cotizaciones?' });
  await user.type(screen.getByLabelText(/^nombres/i), 'Ana');
  await user.type(screen.getByLabelText(/^apellidos/i), 'Ríos');
  await user.type(screen.getByLabelText(/^celular/i), '987 654 321');
  await user.type(screen.getByLabelText(/^correo electrónico/i), 'Ana@Example.com');
  await user.click(screen.getByLabelText(/whatsapp/i));
  await user.click(screen.getByRole('checkbox', { name: /he leído y acepto/i }));
}

describe('Asistente de cotizar', () => {
  it('valida cada paso antes de avanzar y dice qué aseguradoras piden el distrito (RF-03)', async () => {
    catalogoGeografico();
    const user = userEvent.setup();
    renderWizard();

    await user.click(await screen.findByRole('button', { name: /^continuar/i }));
    expect(await screen.findByText('Elige la marca')).toBeInTheDocument();
    expect(screen.getByText('Elige el modelo')).toBeInTheDocument();
    expect(screen.getByText('Elige el año')).toBeInTheDocument();
    expect(screen.getByText(/paso 1 de 3/i)).toBeInTheDocument();

    await completarPaso1(user);
    await screen.findByRole('heading', { name: '¿Dónde usas tu auto?' });
    await user.click(screen.getByRole('button', { name: /^continuar/i }));
    expect(await screen.findByText('Pacífico, La Positiva necesitan el distrito para cotizarte')).toBeInTheDocument();
  });

  it('envía el cuerpo exacto de POST /cotizaciones, guarda el token y va al comparativo', async () => {
    catalogoGeografico();
    let cuerpo: unknown;
    server.use(
      http.post(`${API}/cotizaciones`, async ({ request }) => {
        cuerpo = await request.json();
        return HttpResponse.json(
          {
            cotizacion: cotizacionCreada(),
            tokenAcceso: 'tok-123',
            warning: { code: 'ASEGURADORA_SIN_COTIZACION', message: 'Qualitas no pudo cotizar este vehículo; te mostramos las demás.' },
          },
          { status: 201 },
        );
      }),
    );
    const user = userEvent.setup();
    renderWizard();

    await completarPaso1(user);
    await completarPaso2(user);
    await completarPaso3(user);
    await user.click(screen.getByRole('button', { name: /ver mis cotizaciones/i }));

    expect(await screen.findByText('destino del comparativo')).toBeInTheDocument();
    // Sin placa ni clase: no se mandan. Teléfono sin espacios, correo en minúsculas, año como número.
    expect(cuerpo).toEqual({
      vehiculo: { uso: 'PARTICULAR', marcaId: 'm1', modeloId: 'mo1', anio: 2022 },
      ubicacion: { ubigeo: '150122' },
      contacto: { nombres: 'Ana', apellidos: 'Ríos', telefono: '987654321', email: 'ana@example.com', canalPreferido: 'WHATSAPP' },
    });
    expect(useCotizacionTokenStore.getState().obtener(ID)).toBe('tok-123');
    expect(useCotizarWizardStore.getState().borrador.vehiculo.marcaId).toBe(''); // el borrador se limpia al terminar
  });

  it('manda la placa en mayúsculas y la clase elegida del catálogo', async () => {
    catalogoGeografico();
    let cuerpo: { vehiculo?: Record<string, unknown> } = {};
    server.use(
      http.post(`${API}/cotizaciones`, async ({ request }) => {
        cuerpo = (await request.json()) as typeof cuerpo;
        return HttpResponse.json({ cotizacion: cotizacionCreada(), tokenAcceso: 'tok' }, { status: 201 });
      }),
    );
    const user = userEvent.setup();
    renderWizard();

    await completarPaso1(user, { placa: 'abc123', clase: 'Camioneta' });
    await completarPaso2(user);
    await completarPaso3(user);
    await user.click(screen.getByRole('button', { name: /ver mis cotizaciones/i }));

    await screen.findByText('destino del comparativo');
    expect(cuerpo.vehiculo).toMatchObject({ placa: 'ABC123', clase: 'Camioneta' });
  });

  it('"No tengo placa" vacía y deshabilita el campo', async () => {
    catalogoGeografico();
    const user = userEvent.setup();
    renderWizard();

    const placa = await screen.findByLabelText(/^placa/i);
    await user.type(placa, 'abc123');
    expect(placa).toHaveValue('ABC123');
    await user.click(screen.getByRole('switch', { name: /no tengo placa/i }));
    expect(placa).toBeDisabled();
    expect(placa).toHaveValue('');
  });

  it('rechaza una placa mal escrita antes de llamar al backend', async () => {
    catalogoGeografico();
    const user = userEvent.setup();
    renderWizard();

    await completarPaso1(user, { placa: 'AB' });
    expect(await screen.findByText('Ingresa la placa con el formato ABC-123')).toBeInTheDocument();
    expect(screen.getByText(/paso 1 de 3/i)).toBeInTheDocument();
  });

  it('si el backend rechaza un campo de un paso anterior, vuelve a ese paso y lo marca (RF-03)', async () => {
    catalogoGeografico();
    server.use(
      http.post(`${API}/cotizaciones`, () =>
        HttpResponse.json(
          {
            statusCode: 400,
            message: 'Elige un distrito de la lista',
            errors: [{ campo: 'ubicacion.ubigeo', mensaje: 'Elige un distrito de la lista' }],
          },
          { status: 400 },
        ),
      ),
    );
    const user = userEvent.setup();
    renderWizard();

    await completarPaso1(user);
    await completarPaso2(user);
    await completarPaso3(user);
    await user.click(screen.getByRole('button', { name: /ver mis cotizaciones/i }));

    expect(await screen.findByRole('heading', { name: '¿Dónde usas tu auto?' })).toBeInTheDocument();
    expect(await screen.findByText('Elige un distrito de la lista')).toBeInTheDocument();
  });

  it('fuera de nicho (422) muestra el mensaje con una vía de contacto y no avanza (RN-05)', async () => {
    catalogoGeografico();
    server.use(
      http.post(`${API}/cotizaciones`, () =>
        HttpResponse.json(
          { statusCode: 422, message: 'Atendemos hasta 2 vehículos de uso particular por persona.', correlationId: 'c-1' },
          { status: 422 },
        ),
      ),
    );
    const user = userEvent.setup();
    renderWizard();

    await completarPaso1(user);
    await completarPaso2(user);
    await completarPaso3(user);
    await user.click(screen.getByRole('button', { name: /ver mis cotizaciones/i }));

    const alerta = await screen.findByRole('alert');
    expect(alerta).toHaveTextContent('Atendemos hasta 2 vehículos de uso particular por persona.');
    expect(alerta.querySelector('a')).toHaveAttribute('href', 'tel:+5116803770');
    expect(screen.queryByText('destino del comparativo')).not.toBeInTheDocument();
  });

  it('guarda el borrador en sessionStorage y conserva el paso al volver', async () => {
    catalogoGeografico();
    const user = userEvent.setup();
    const { unmount } = renderWizard();

    await completarPaso1(user);
    await screen.findByRole('heading', { name: '¿Dónde usas tu auto?' });
    expect(sessionStorage.getItem('svas.cotizar-wizard')).toContain('"marcaId":"m1"');

    unmount();
    renderWizard();
    expect(await screen.findByRole('heading', { name: '¿Dónde usas tu auto?' })).toBeInTheDocument();
  });
});

/* ───────────────────────── Comparativo ───────────────────────── */

const RIMAC = { aseguradoraId: 'a-rimac', aseguradora: 'Rímac' };
const base = { resumen: null, disponible: true, motivoNoDisponible: null } as const;

const primas = (): PrimaCotizada[] => [
  {
    ...base,
    ...RIMAC,
    id: 'p1',
    planId: 'pl1',
    plan: 'Plata',
    resumen: 'Protección esencial para el uso diario',
    sumaAsegurada: '14400.00',
    rangoSuma: { minima: '12000.00', maxima: '16800.00' },
    prima: '439.13',
    primaMensual: '36.59',
  },
  {
    ...base,
    ...RIMAC,
    id: 'p2',
    planId: 'pl2',
    plan: 'Oro',
    sumaAsegurada: '14400.00',
    rangoSuma: { minima: '12000.00', maxima: '16800.00' },
    prima: '614.78',
    primaMensual: '51.23',
  },
  {
    ...base,
    aseguradoraId: 'a-mapfre',
    aseguradora: 'Mapfre',
    id: 'p3',
    planId: 'pl3',
    plan: 'Esencial',
    sumaAsegurada: '14500.00',
    rangoSuma: { minima: '12100.00', maxima: '16900.00' },
    prima: '634.08',
    primaMensual: '52.84',
  },
  {
    aseguradoraId: 'a-qualitas',
    aseguradora: 'Qualitas',
    id: 'p4',
    planId: 'pl4',
    plan: 'Plus',
    resumen: null,
    disponible: false,
    sumaAsegurada: null,
    rangoSuma: null,
    prima: null,
    primaMensual: null,
    motivoNoDisponible: 'SIN_RANGO',
  },
];

const resumen = (o: Partial<Cotizacion> = {}) => ({
  cotizacion: {
    id: 'cot-1',
    estado: 'REGISTRADA',
    fecha: '2026-11-12T15:00:00-05:00',
    opciones: ['COMPRA_INMEDIATA', 'ASESORIA'],
    motivoDerivacion: null,
    vehiculo: { uso: 'PARTICULAR', marca: 'Honda', modelo: 'CR-V', tipo: 'SUV', anio: 2022, ubigeo: '150104', distrito: 'Barranco' },
    primas: primas(),
    ...o,
  },
});

const servirResumen = (o: Partial<Cotizacion> = {}) =>
  server.use(http.get(`${API}/cotizaciones/cot-1/resumen`, () => HttpResponse.json(resumen(o))));

const URL_SUMA = `${API}/cotizaciones/cot-1/aseguradoras/a-rimac/suma-asegurada`;
const URL_SUMA_MAPFRE = `${API}/cotizaciones/cot-1/aseguradoras/a-mapfre/suma-asegurada`;

function renderComparativo() {
  return renderConProviders(
    <Routes>
      <Route path="/cotizacion/:id" element={<ComparativoPage />} />
    </Routes>,
    { ruta: '/cotizacion/cot-1' },
  );
}

const campoSuma = () => screen.getByLabelText('Tu suma asegurada, en dólares');
const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe('Comparativo de planes', () => {
  it('un bloque por aseguradora, la cuota mensual como protagonista y la que no cotiza en gris al final', async () => {
    servirResumen();
    renderComparativo();

    expect(await screen.findByRole('heading', { level: 1, name: /Honda CR-V 2022/ })).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual(['Rímac', 'Mapfre', 'Qualitas']);
    // Por defecto ordenado por precio mensual: Plata (36.59) antes que Oro (51.23).
    expect(screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual(['Plan Plata', 'Plan Oro', 'Plan Esencial']);

    expect(screen.getByLabelText('36 dólares con 59 centavos al mes')).toBeInTheDocument();
    expect(screen.getByLabelText('439 dólares con 13 centavos al año')).toBeInTheDocument(); // la anual, secundaria
    expect(screen.getByText('Protección esencial para el uso diario')).toBeInTheDocument();
    expect(screen.getByText(/no cotiza este vehículo; te mostramos las demás/i)).toBeInTheDocument();

    const comprar = screen.getAllByRole('link', { name: /comprar este plan/i });
    expect(comprar).toHaveLength(3);
    expect(comprar[0]).toHaveAttribute('href', '/compra/cot-1?prima=p1');
  });

  it('con derivación a un asesor (RN-03) se oculta comprar y queda solo "Hablar con un asesor"', async () => {
    servirResumen({ opciones: ['ASESORIA'], motivoDerivacion: 'INSPECCION' });
    renderComparativo();

    expect(await screen.findByText(/este uso requiere una inspección/i)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /comprar este plan/i })).not.toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /hablar con un asesor/i }).length).toBeGreaterThan(0);
  });

  it('una cotización ya convertida en póliza no ofrece comprar y bloquea la suma', async () => {
    servirResumen({ estado: 'CONVERTIDA' });
    renderComparativo();

    expect(await screen.findByText(/ya se convirtió en póliza/i)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /comprar este plan/i })).not.toBeInTheDocument();
    expect(campoSuma()).toBeDisabled();
  });

  it('cambia el orden por aseguradora y filtra por una aseguradora', async () => {
    servirResumen();
    const user = userEvent.setup();
    renderComparativo();

    await screen.findByRole('heading', { level: 1, name: /Honda/ });
    await user.selectOptions(screen.getByLabelText(/ordenar por/i), 'aseguradora');
    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual(['Mapfre', 'Rímac', 'Qualitas']);

    await user.selectOptions(screen.getByLabelText(/^aseguradora$/i), 'a-mapfre');
    expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual(['Mapfre']);
  });

  it('si no se encuentra la cotización, muestra el mensaje del backend y ofrece cotizar de nuevo', async () => {
    server.use(
      http.get(`${API}/cotizaciones/cot-1/resumen`, () =>
        HttpResponse.json({ statusCode: 404, message: 'No encontramos tu cotización' }, { status: 404 }),
      ),
    );
    renderComparativo();

    expect(await screen.findByText('No encontramos tu cotización')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /cotizar de nuevo/i })).toHaveAttribute('href', '/cotizar');
  });
});

describe('Barra única de suma asegurada (RN-37)', () => {
  it('hay UNA sola barra para toda la cotización y empieza sin elegir', async () => {
    servirResumen();
    renderComparativo();

    await screen.findByRole('heading', { level: 1, name: /Honda/ });
    expect(screen.getAllByRole('slider')).toHaveLength(1);
    expect(campoSuma()).toHaveValue('');
    expect(screen.getByText(/cada aseguradora propone su punto medio/i)).toBeInTheDocument();
  });

  it('pide el recálculo a CADA aseguradora que cotizó (no a la que no cotiza) y pinta las primas que devuelve', async () => {
    servirResumen();
    const pedidos: Record<string, unknown> = {};
    server.use(
      http.patch(URL_SUMA, async ({ request }) => {
        pedidos.rimac = await request.json();
        await delay(150);
        return HttpResponse.json({
          primas: [
            { ...primas()[0], sumaAsegurada: '15000.00', prima: '457.43', primaMensual: '38.12' },
            { ...primas()[1], sumaAsegurada: '15000.00', prima: '640.40', primaMensual: '53.37' },
          ],
        });
      }),
      http.patch(URL_SUMA_MAPFRE, async ({ request }) => {
        pedidos.mapfre = await request.json();
        return HttpResponse.json({ primas: [{ ...primas()[2], sumaAsegurada: '15000.00', prima: '540.00', primaMensual: '45.00' }] });
      }),
    );
    const user = userEvent.setup();
    renderComparativo();

    await screen.findByRole('heading', { level: 1, name: /Honda/ });
    await user.type(campoSuma(), '15000');

    // Mientras llega la respuesta no se muestra un monto calculado aquí: hay un esqueleto.
    expect((await screen.findAllByRole('status', { name: /recalculando el precio/i })).length).toBeGreaterThan(0);
    expect(await screen.findByLabelText('38 dólares con 12 centavos al mes', {}, { timeout: 3000 })).toBeInTheDocument();
    expect(screen.getByLabelText('53 dólares con 37 centavos al mes')).toBeInTheDocument();
    expect(screen.getByLabelText('45 dólares al mes')).toBeInTheDocument();
    // Una petición por aseguradora con cotización, con la suma como texto; Qualitas no cotizó y no recibe ninguna.
    expect(pedidos).toEqual({ rimac: { sumaAsegurada: '15000.00' }, mapfre: { sumaAsegurada: '15000.00' } });
    expect(await screen.findByText(/usamos esta suma en todas las aseguradoras/i)).toBeInTheDocument();
    expect(screen.getAllByRole('slider')).toHaveLength(1);
  });

  it('si la suma se sale del rango de una aseguradora, le pide su máximo y se lo avisa a la persona', async () => {
    servirResumen();
    const pedidos: Record<string, string> = {};
    server.use(
      http.patch(URL_SUMA, async ({ request }) => {
        const { sumaAsegurada } = (await request.json()) as { sumaAsegurada: string };
        pedidos.rimac = sumaAsegurada;
        return HttpResponse.json({ primas: primas().slice(0, 2).map((p) => ({ ...p, sumaAsegurada })) });
      }),
      http.patch(URL_SUMA_MAPFRE, async ({ request }) => {
        const { sumaAsegurada } = (await request.json()) as { sumaAsegurada: string };
        pedidos.mapfre = sumaAsegurada;
        return HttpResponse.json({ primas: [{ ...primas()[2], sumaAsegurada }] });
      }),
    );
    const user = userEvent.setup();
    renderComparativo();

    await screen.findByRole('heading', { level: 1, name: /Honda/ });
    // 16,850 cabe en Mapfre (hasta 16,900) pero se pasa del máximo de Rímac (16,800).
    await user.type(campoSuma(), '16850');

    expect(await screen.findByText('Usamos USD 16,800, el máximo que permite Rímac.', {}, { timeout: 3000 })).toBeInTheDocument();
    expect(pedidos).toEqual({ rimac: '16800.00', mapfre: '16850.00' });
    expect(screen.queryByText(/el máximo que permite Mapfre/)).not.toBeInTheDocument();
  });

  it('un valor fuera del rango de la barra muestra el mensaje y NO llama al backend', async () => {
    servirResumen();
    let llamadas = 0;
    const contar = () => {
      llamadas += 1;
      return HttpResponse.json({ primas: [] });
    };
    server.use(http.patch(URL_SUMA, contar), http.patch(URL_SUMA_MAPFRE, contar));
    const user = userEvent.setup();
    renderComparativo();

    await screen.findByRole('heading', { level: 1, name: /Honda/ });
    await user.type(campoSuma(), '30000');

    // La barra va del mínimo más bajo (Rímac, 12,000) al máximo más alto (Mapfre, 16,900).
    expect(await screen.findByText('La suma asegurada debe estar entre USD 12,000 y USD 16,900.')).toBeInTheDocument();
    await esperar(800);
    expect(llamadas).toBe(0);
  });

  it('si el backend rechaza la suma (400), la barra vuelve a "sin elegir" y no reintenta sin fin', async () => {
    servirResumen();
    const llamadas = { rimac: 0, mapfre: 0 };
    const rechazar = (clave: 'rimac' | 'mapfre') => () => {
      llamadas[clave] += 1;
      return HttpResponse.json({ statusCode: 400, message: 'La suma asegurada no es válida' }, { status: 400 });
    };
    server.use(http.patch(URL_SUMA, rechazar('rimac')), http.patch(URL_SUMA_MAPFRE, rechazar('mapfre')));
    const user = userEvent.setup();
    renderComparativo();

    await screen.findByRole('heading', { level: 1, name: /Honda/ });
    await user.type(campoSuma(), '15000');

    await waitFor(() => expect(llamadas).toEqual({ rimac: 1, mapfre: 1 }), { timeout: 3000 });
    await waitFor(() => expect(campoSuma()).toHaveValue(''));
    await esperar(1200);
    expect(llamadas).toEqual({ rimac: 1, mapfre: 1 });
  });

  it('si ya hay una compra en curso (409), la barra se bloquea y lo explica', async () => {
    servirResumen();
    const compraEnCurso = () =>
      HttpResponse.json({ statusCode: 409, message: 'Ya iniciaste tu compra: la suma asegurada ya no se puede cambiar.' }, { status: 409 });
    server.use(http.patch(URL_SUMA, compraEnCurso), http.patch(URL_SUMA_MAPFRE, compraEnCurso));
    const user = userEvent.setup();
    renderComparativo();

    await screen.findByRole('heading', { level: 1, name: /Honda/ });
    await user.type(campoSuma(), '15000');

    expect(await screen.findByText(/ya iniciaste tu compra/i, {}, { timeout: 3000 })).toBeInTheDocument();
    await waitFor(() => expect(campoSuma()).toBeDisabled());
  });

  it('recuerda la suma elegida si se vuelve a abrir la cotización en la misma pestaña', async () => {
    sessionStorage.setItem('svas.suma-elegida.cot-1', '15000');
    servirResumen();
    renderComparativo();

    await screen.findByRole('heading', { level: 1, name: /Honda/ });
    expect(campoSuma()).toHaveValue('15000');
  });
});

/* ───────────────────────── Mis cotizaciones ───────────────────────── */

describe('Mis cotizaciones', () => {
  it('lista las cotizaciones del cliente con su estado y la cuota más baja', async () => {
    server.use(
      http.get(`${API}/cotizaciones/mias`, () =>
        HttpResponse.json([
          { id: 'c1', fecha: '2026-11-12T15:00:00-05:00', estado: 'REGISTRADA', vehiculo: { marca: 'Honda', modelo: 'CR-V', anio: 2022 }, primaMensualDesde: '36.59' },
          { id: 'c2', fecha: '2026-11-01T10:00:00-05:00', estado: 'CONVERTIDA', vehiculo: { marca: 'Toyota', modelo: 'Corolla', anio: 2020 }, primaMensualDesde: null },
        ]),
      ),
    );
    renderConProviders(<MisCotizacionesPage />, { roles: ['CLIENTE'] });

    expect(await screen.findByText('Honda CR-V 2022')).toBeInTheDocument();
    expect(screen.getByText('Convertida')).toBeInTheDocument();
    expect(screen.getByLabelText('36 dólares con 59 centavos al mes')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Continuar' })).toHaveAttribute('href', '/cotizacion/c1');
    expect(screen.getByRole('link', { name: 'Ver' })).toHaveAttribute('href', '/cotizacion/c2');
  });

  it('sin cotizaciones invita a cotizar', async () => {
    server.use(http.get(`${API}/cotizaciones/mias`, () => HttpResponse.json([])));
    renderConProviders(<MisCotizacionesPage />, { roles: ['CLIENTE'] });

    expect(await screen.findByText('Aún no tienes cotizaciones.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /cotizar ahora/i })).toHaveAttribute('href', '/cotizar');
  });
});

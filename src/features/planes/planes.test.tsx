import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { Route, Routes, useLocation } from 'react-router-dom';
import { server } from '../../test/msw/server';
import { API } from '../../test/msw/handlers';
import { renderConProviders } from '../../test/render';
import { Toaster } from '../../shared/ui/toaster';
import type { ComparacionPlanes, ContenidoPlan, Cotizacion } from '../../shared/types/api';
import { ComparativoPage } from '../cotizacion/pages/ComparativoPage';
import { CompararPlanesPage } from './pages/CompararPlanesPage';
import { useCompararPlanesStore } from './store/useCompararPlanesStore';

const COT = '7f1a2b3c-4d5e-4f60-8a7b-9c0d1e2f3a4b';
const PLANES = [
  { id: 'p1', planId: '11111111-1111-4111-8111-111111111111', aseguradora: 'Rímac', plan: 'Oro' },
  { id: 'p2', planId: '22222222-2222-4222-8222-222222222222', aseguradora: 'Pacífico', plan: 'Premium' },
  { id: 'p3', planId: '33333333-3333-4333-8333-333333333333', aseguradora: 'Mapfre', plan: 'Total' },
  { id: 'p4', planId: '44444444-4444-4444-8444-444444444444', aseguradora: 'Qualitas', plan: 'Plus' },
];

const prima = (p: (typeof PLANES)[number], resumen: string | null = `Resumen ${p.plan}`) => ({
  id: p.id,
  aseguradoraId: `aseg-${p.aseguradora}`,
  aseguradora: p.aseguradora,
  planId: p.planId,
  plan: p.plan,
  resumen,
  disponible: true,
  sumaAsegurada: '15000.00',
  rangoSuma: { minima: '12000.00', maxima: '16800.00' },
  prima: '560.00',
  primaMensual: '48.00',
  motivoNoDisponible: null,
});

const cotizacion = (primas = PLANES.map((p) => prima(p))): Cotizacion => ({
  id: COT,
  estado: 'REGISTRADA',
  fecha: '2026-11-12T15:00:00-05:00',
  opciones: ['COMPRA_INMEDIATA', 'ASESORIA'],
  motivoDerivacion: null,
  vehiculo: { uso: 'PARTICULAR', marca: 'Toyota', modelo: 'Corolla', tipo: 'SEDAN', anio: 2022, ubigeo: '150122' },
  primas,
});

const LEYENDA = 'Contenido ilustrativo; no es el condicionado de la aseguradora.';

const contenido = (p: (typeof PLANES)[number]): ContenidoPlan => ({
  planId: p.planId,
  aseguradora: p.aseguradora,
  plan: p.plan,
  resumen: `Resumen ${p.plan}`,
  descripcion: 'Descripción larga',
  idealPara: 'Quien no quiere preocuparse',
  coberturas: [
    { codigo: 'DANO_CHOQUE', nombre: 'Daño propio por choque', categoria: 'DANOS_PROPIOS', incluida: true, detalle: null, limiteMonto: null },
    { codigo: 'RC_TERCEROS', nombre: 'Responsabilidad civil', categoria: 'RESPONSABILIDAD', incluida: true, detalle: 'Hasta USD 200,000', limiteMonto: '200000.00' },
    { codigo: 'LUNAS', nombre: 'Rotura de lunas', categoria: 'ADICIONAL', incluida: false, detalle: null, limiteMonto: null },
  ],
  exclusiones: ['Conducir con alcohol sobre el límite legal'],
  requisitos: [{ tipo: 'CONDUCTOR', texto: 'Conductor habitual con licencia vigente', obligatorio: true }],
  actualizadoEn: '2026-11-01T10:00:00-05:00',
  leyenda: LEYENDA,
});

const comparacion = (): ComparacionPlanes => ({
  planes: [
    { planId: PLANES[0]!.planId, aseguradora: 'Rímac', plan: 'Oro', resumen: 'Resumen Oro' },
    { planId: PLANES[1]!.planId, aseguradora: 'Pacífico', plan: 'Premium', resumen: 'Resumen Premium' },
  ],
  filas: [
    { codigo: 'LUNAS', nombre: 'Rotura de lunas', categoria: 'ADICIONAL', valores: [{ incluida: false, detalle: null }, { incluida: true, detalle: null }] },
    {
      codigo: 'RC_TERCEROS',
      nombre: 'Responsabilidad civil frente a terceros',
      categoria: 'RESPONSABILIDAD',
      valores: [
        { incluida: true, detalle: 'Hasta USD 100,000' },
        { incluida: true, detalle: 'Hasta USD 200,000' },
      ],
    },
  ],
  leyenda: LEYENDA,
});

function Destino() {
  const { pathname, search } = useLocation();
  return <p>destino {pathname + search}</p>;
}

function renderComparativo() {
  return renderConProviders(
    <>
      <Routes>
        <Route path="/cotizacion/:id" element={<ComparativoPage />} />
        <Route path="/comparar" element={<Destino />} />
      </Routes>
      <Toaster />
    </>,
    { ruta: `/cotizacion/${COT}` },
  );
}

function mockCotizacion(c = cotizacion()) {
  server.use(http.get(`${API}/cotizaciones/${COT}/resumen`, () => HttpResponse.json({ cotizacion: c })));
}

beforeEach(() => useCompararPlanesStore.getState().limpiar());
afterEach(() => vi.restoreAllMocks());

/** La tarjeta de un plan, para buscar sus botones sin confundirlos con los de otros planes. */
const tarjeta = (plan: string) => screen.getByRole('heading', { name: `Plan ${plan}` }).closest('div')!.parentElement!;

/* ───────────────────────── Ver detalle ───────────────────────── */

describe('Detalle del plan', () => {
  it('abre el detalle con "Qué cubre" y dice en texto si cada cobertura está incluida', async () => {
    mockCotizacion();
    server.use(http.get(`${API}/planes/${PLANES[0]!.planId}/contenido`, () => HttpResponse.json(contenido(PLANES[0]!))));
    const user = userEvent.setup();
    renderComparativo();

    await user.click(within(await waitForTarjeta('Oro')).getByRole('button', { name: 'Ver detalle' }));
    const panel = await screen.findByRole('dialog');
    expect(await within(panel).findByText('Daño propio por choque')).toBeInTheDocument();
    expect(within(panel).getByText('Hasta USD 200,000')).toBeInTheDocument();
    expect(within(panel).getAllByText('Incluida')).toHaveLength(2);
    // Lo que no está incluido no aparece en "Qué cubre".
    expect(within(panel).queryByText('Rotura de lunas')).not.toBeInTheDocument();
    expect(within(panel).getByText(LEYENDA)).toBeInTheDocument();
  });

  it('"Qué no cubre" junta las coberturas no incluidas y las exclusiones; "Requisitos" informa', async () => {
    mockCotizacion();
    server.use(http.get(`${API}/planes/${PLANES[0]!.planId}/contenido`, () => HttpResponse.json(contenido(PLANES[0]!))));
    const user = userEvent.setup();
    renderComparativo();

    await user.click(within(await waitForTarjeta('Oro')).getByRole('button', { name: 'Ver detalle' }));
    const panel = await screen.findByRole('dialog');
    await within(panel).findByText('Daño propio por choque');

    await user.click(within(panel).getByRole('tab', { name: 'Qué no cubre' }));
    expect(within(panel).getByText('Rotura de lunas')).toBeInTheDocument();
    expect(within(panel).getByText('No incluida')).toBeInTheDocument();
    expect(within(panel).getByText('Conducir con alcohol sobre el límite legal')).toBeInTheDocument();

    await user.click(within(panel).getByRole('tab', { name: 'Requisitos' }));
    expect(within(panel).getByText('Conductor habitual con licencia vigente')).toBeInTheDocument();
  });

  it('las flechas del teclado cambian de pestaña', async () => {
    mockCotizacion();
    server.use(http.get(`${API}/planes/${PLANES[0]!.planId}/contenido`, () => HttpResponse.json(contenido(PLANES[0]!))));
    const user = userEvent.setup();
    renderComparativo();

    await user.click(within(await waitForTarjeta('Oro')).getByRole('button', { name: 'Ver detalle' }));
    const panel = await screen.findByRole('dialog');
    const cubre = within(panel).getByRole('tab', { name: 'Qué cubre' });
    cubre.focus();
    await user.keyboard('{ArrowRight}');
    expect(within(panel).getByRole('tab', { name: 'Qué no cubre' })).toHaveAttribute('aria-selected', 'true');
    await user.keyboard('{ArrowLeft}');
    expect(cubre).toHaveAttribute('aria-selected', 'true');
  });

  it('si el contenido no está disponible muestra el mensaje del backend y deja reintentar', async () => {
    mockCotizacion();
    server.use(
      http.get(`${API}/planes/${PLANES[0]!.planId}/contenido`, () =>
        HttpResponse.json({ statusCode: 404, message: 'El contenido de este plan no está disponible' }, { status: 404 }),
      ),
    );
    const user = userEvent.setup();
    renderComparativo();
    await user.click(within(await waitForTarjeta('Oro')).getByRole('button', { name: 'Ver detalle' }));
    const panel = await screen.findByRole('dialog');
    expect(await within(panel).findByText('El contenido de este plan no está disponible')).toBeInTheDocument();
    expect(within(panel).getByRole('button', { name: /reintentar/i })).toBeInTheDocument();
  });

  it('un plan sin contenido publicado no ofrece "Ver detalle" ni "Comparar"', async () => {
    mockCotizacion(cotizacion([prima(PLANES[0]!, null), prima(PLANES[1]!)]));
    renderComparativo();
    const sinContenido = await waitForTarjeta('Oro');
    expect(within(sinContenido).queryByRole('button', { name: 'Ver detalle' })).not.toBeInTheDocument();
    expect(within(sinContenido).queryByRole('checkbox')).not.toBeInTheDocument();
    expect(within(tarjeta('Premium')).getByRole('button', { name: 'Ver detalle' })).toBeInTheDocument();
  });
});

async function waitForTarjeta(plan: string) {
  await screen.findByRole('heading', { name: `Plan ${plan}` });
  return tarjeta(plan);
}

/* ───────────────────────── Comparar ───────────────────────── */

describe('Marcar planes para comparar', () => {
  it('con un plan marcado avisa que faltan; con dos habilita "Comparar planes" y abre la dirección compartible', async () => {
    mockCotizacion();
    const user = userEvent.setup();
    renderComparativo();

    await user.click(within(await waitForTarjeta('Oro')).getByRole('checkbox', { name: /comparar/i }));
    const barra = screen.getByRole('region', { name: 'Comparar planes' });
    expect(within(barra).getByText('Comparar (1 de 3)')).toBeInTheDocument();
    expect(within(barra).getByText('Elige al menos 2 planes para comparar.')).toBeInTheDocument();
    expect(within(barra).getByRole('button', { name: 'Comparar planes' })).toBeDisabled();

    await user.click(within(tarjeta('Premium')).getByRole('checkbox', { name: /comparar/i }));
    const boton = within(barra).getByRole('button', { name: 'Comparar planes' });
    expect(boton).toBeEnabled();
    await user.click(boton);
    expect(await screen.findByText(`destino /comparar?ids=${PLANES[0]!.planId},${PLANES[1]!.planId}`)).toBeInTheDocument();
  });

  it('con 3 marcados deshabilita el cuarto con el texto "Máximo 3 planes" y se puede quitar uno', async () => {
    mockCotizacion();
    const user = userEvent.setup();
    renderComparativo();

    for (const plan of ['Oro', 'Premium', 'Total']) {
      await user.click(within(await waitForTarjeta(plan)).getByRole('checkbox', { name: /comparar/i }));
    }
    const cuarta = within(tarjeta('Plus'));
    expect(cuarta.getByRole('checkbox', { name: /comparar/i })).toBeDisabled();
    expect(cuarta.getByText('Máximo 3 planes')).toBeInTheDocument();

    await user.click(within(screen.getByRole('region', { name: 'Comparar planes' })).getByRole('button', { name: 'Quitar Rímac · Oro de la comparación' }));
    expect(within(screen.getByRole('region', { name: 'Comparar planes' })).getByText('Comparar (2 de 3)')).toBeInTheDocument();
    expect(cuarta.getByRole('checkbox', { name: /comparar/i })).toBeEnabled();
  });
});

/* ───────────────────────── Página /comparar ───────────────────────── */

function renderComparar(ids: string) {
  return renderConProviders(
    <>
      <Routes>
        <Route path="/comparar" element={<CompararPlanesPage />} />
      </Routes>
      <Toaster />
    </>,
    { ruta: `/comparar${ids}` },
  );
}

describe('CompararPlanesPage', () => {
  it('muestra la matriz con ✓/✗ en texto, cuántas coberturas incluye cada plan y la leyenda', async () => {
    let pedido = '';
    server.use(
      http.get(`${API}/planes/comparar`, ({ request }) => {
        pedido = new URL(request.url).searchParams.get('ids') ?? '';
        return HttpResponse.json(comparacion());
      }),
    );
    renderComparar(`?ids=${PLANES[0]!.planId},${PLANES[1]!.planId}`);

    const tabla = await screen.findByRole('table', { name: /qué cubre cada plan/i });
    expect(pedido).toBe(`${PLANES[0]!.planId},${PLANES[1]!.planId}`);
    const lunas = within(tabla).getByRole('row', { name: /rotura de lunas/i });
    expect(within(lunas).getByText('No incluida')).toBeInTheDocument();
    expect(within(lunas).getByText('Incluida')).toBeInTheDocument();
    expect(within(tabla).getByText('Hasta USD 100,000')).toBeInTheDocument();
    expect(within(tabla).getByText('Hasta USD 200,000')).toBeInTheDocument();

    // Rímac Oro cubre 1 de 2 coberturas de la matriz; Pacífico Premium, 2 de 2.
    expect(screen.getByText('Total que cubre: 1 de 2')).toBeInTheDocument();
    expect(screen.getByText('Total que cubre: 2 de 2')).toBeInTheDocument();
    expect(screen.getByText(LEYENDA)).toBeInTheDocument();
  });

  it('copia el enlace al compartir', async () => {
    server.use(http.get(`${API}/planes/comparar`, () => HttpResponse.json(comparacion())));
    // `userEvent.setup()` instala su propio portapapeles de prueba: se vigila DESPUÉS de crearlo.
    const user = userEvent.setup();
    const escribir = vi.spyOn(navigator.clipboard, 'writeText');
    renderComparar(`?ids=${PLANES[0]!.planId},${PLANES[1]!.planId}`);

    await user.click(await screen.findByRole('button', { name: /compartir comparación/i }));
    await waitFor(() => expect(escribir).toHaveBeenCalledOnce());
    expect(await screen.findByText('Copiamos el enlace para que lo compartas')).toBeInTheDocument();
  });

  it('con menos de 2 planes no pide nada y explica qué hacer', async () => {
    renderComparar(`?ids=${PLANES[0]!.planId}`);
    expect(await screen.findByText('Elige al menos 2 planes para compararlos.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Cotizar un vehículo' })).toBeInTheDocument();
  });

  it('muestra el mensaje del backend si hay demasiados planes o el plan no existe', async () => {
    server.use(
      http.get(`${API}/planes/comparar`, () => HttpResponse.json({ statusCode: 400, message: 'Puedes comparar hasta 3 planes' }, { status: 400 })),
    );
    renderComparar(`?ids=${PLANES.map((p) => p.planId).join(',')}`);
    expect(await screen.findByText('Puedes comparar hasta 3 planes')).toBeInTheDocument();
  });
});

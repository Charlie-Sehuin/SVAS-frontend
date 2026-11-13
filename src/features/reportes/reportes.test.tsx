import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '../../test/msw/server';
import { API } from '../../test/msw/handlers';
import { renderConProviders } from '../../test/render';
import { Toaster } from '../../shared/ui/toaster';
import type { Rol } from '../../shared/types/enums';
import type {
  EmbudoRetencion,
  ReporteDescuentos,
  ReporteImpactoPruebaChoque,
  ReporteMiDesempeno,
  ReporteRetencion,
  ReporteVentas,
} from '../../shared/types/api';
import { DashboardPage } from '../dashboard/DashboardPage';
import { MiDesempenoPage } from './pages/MiDesempenoPage';
import { ReporteDescuentosPage } from './pages/ReporteDescuentosPage';
import { ReporteImpactoPruebaChoquePage } from './pages/ReporteImpactoPruebaChoquePage';
import { ReporteRetencionPage } from './pages/ReporteRetencionPage';
import { ReporteVentasPage } from './pages/ReporteVentasPage';
import { atajos, errorDePeriodo } from './lib/periodo';

const ADMIN: { roles: Rol[] } = { roles: ['ADMINISTRADOR'] };
const ASESOR: { roles: Rol[] } = { roles: ['ASESOR'] };

afterEach(() => vi.restoreAllMocks());

/* ───────────────────────── Periodo (lógica pura) ───────────────────────── */

describe('periodo del reporte', () => {
  it('acepta lo vacío (mes en curso) y un periodo válido', () => {
    expect(errorDePeriodo({})).toBeNull();
    expect(errorDePeriodo({ desde: '2026-11-01' })).toBeNull();
    expect(errorDePeriodo({ desde: '2026-11-01', hasta: '2026-11-12' })).toBeNull();
  });

  it('rechaza formato, fechas inexistentes, desde posterior a hasta y más de un año (mismas reglas del backend)', () => {
    expect(errorDePeriodo({ desde: '12/11/2026' })).toBe('Las fechas deben tener el formato AAAA-MM-DD');
    expect(errorDePeriodo({ desde: '2026-02-30' })).toBe('Las fechas deben tener el formato AAAA-MM-DD');
    expect(errorDePeriodo({ desde: '2026-11-12', hasta: '2026-11-01' })).toBe('La fecha "desde" no puede ser posterior a "hasta"');
    expect(errorDePeriodo({ desde: '2025-01-01', hasta: '2026-11-01' })).toBe('El periodo no puede superar un año');
    expect(errorDePeriodo({ desde: '2025-11-12', hasta: '2026-11-12' })).toBeNull(); // 365 días: cabe
  });

  it('los atajos salen de un día fijo: este mes (sin fechas), mes pasado, últimos 30 días y este año', () => {
    const [mes, pasado, treinta, anio] = atajos(new Date(2026, 10, 12)); // 12 de noviembre de 2026
    expect(mes!.periodo).toBeUndefined();
    expect(pasado!.periodo).toEqual({ desde: '2026-10-01', hasta: '2026-10-31' });
    expect(treinta!.periodo).toEqual({ desde: '2026-10-14', hasta: '2026-11-12' });
    expect(anio!.periodo).toEqual({ desde: '2026-01-01', hasta: '2026-11-12' });
  });
});

/* ───────────────────────── Ventas ───────────────────────── */

const ventas = (extra: Partial<ReporteVentas> = {}): ReporteVentas => ({
  desde: '2026-11-01',
  hasta: '2026-11-12',
  agrupar: 'canal',
  totales: { polizas: 3, enCuotas: 1, primaAnual: '2000.00', descuentos: '100.00', primaFinal: '1900.00', cobrado: '1500.00', ticketPromedio: '633.33' },
  grupos: [
    { clave: 'AUTONOMO', etiqueta: 'AUTONOMO', polizas: 2, enCuotas: 1, primaAnual: '1400.00', primaFinal: '1300.00', cobrado: '900.00', ticketPromedio: '650.00', participacion: '68.42' },
    { clave: 'ASESORIA', etiqueta: 'ASESORIA', polizas: 1, enCuotas: 0, primaAnual: '600.00', primaFinal: '600.00', cobrado: '600.00', ticketPromedio: '600.00', participacion: '31.58' },
  ],
  ...extra,
});

function mockVentas(r: ReporteVentas = ventas()) {
  const pedidos: string[] = [];
  server.use(
    http.get(`${API}/admin/reportes/ventas`, ({ request }) => {
      pedidos.push(new URL(request.url).search);
      return HttpResponse.json(r);
    }),
  );
  return pedidos;
}

describe('ReporteVentasPage', () => {
  it('muestra los totales, las barras y la tabla con los canales en lenguaje llano y el periodo usado en texto', async () => {
    mockVentas();
    renderConProviders(<ReporteVentasPage />, ADMIN);

    expect(await screen.findByText('Pólizas emitidas')).toBeInTheDocument();
    expect(screen.getByText('1 compra en cuotas')).toBeInTheDocument();
    // La prima final total sale en la tarjeta y en la tabla, tal como la entregó el backend.
    expect(screen.getAllByLabelText(/1.?900 dólares/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Mostrando del 1 de noviembre de 2026 al 12 de noviembre de 2026/)).toBeInTheDocument();

    const tabla = screen.getByRole('table', { name: 'Ventas por grupo' });
    expect(within(tabla).getByText('Compra autónoma')).toBeInTheDocument();
    expect(within(tabla).getByText('Con asesoría')).toBeInTheDocument();
    expect(within(tabla).getByText('68,42 %')).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Prima final por grupo' })).toBeInTheDocument();
  });

  it('sin fechas pide el mes en curso (sin parámetros) y agrupa por canal', async () => {
    const pedidos = mockVentas();
    renderConProviders(<ReporteVentasPage />, ADMIN);
    await screen.findByText('Pólizas emitidas');
    expect(pedidos[0]).toBe('?agrupar=canal');
  });

  it('cambiar la agrupación vuelve a pedir el reporte por aseguradora', async () => {
    const pedidos = mockVentas();
    const user = userEvent.setup();
    renderConProviders(<ReporteVentasPage />, ADMIN);
    await screen.findByText('Pólizas emitidas');
    await user.click(screen.getByRole('button', { name: 'Por aseguradora' }));
    await waitFor(() => expect(pedidos.at(-1)).toBe('?agrupar=aseguradora'));
    expect(screen.getByRole('button', { name: 'Por aseguradora' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('un atajo manda las fechas; un periodo inválido se explica sin llamar al backend', async () => {
    const pedidos = mockVentas();
    const user = userEvent.setup();
    renderConProviders(<ReporteVentasPage />, ADMIN);
    await screen.findByText('Pólizas emitidas');

    await user.click(screen.getByRole('button', { name: 'Mes pasado' }));
    await waitFor(() => expect(pedidos.at(-1)).toMatch(/^\?desde=\d{4}-\d{2}-01&hasta=\d{4}-\d{2}-(28|29|30|31)&agrupar=canal$/));

    const llamadas = pedidos.length;
    await user.clear(screen.getByLabelText('Desde'));
    await user.type(screen.getByLabelText('Desde'), '2026-11-20');
    await user.clear(screen.getByLabelText('Hasta'));
    await user.type(screen.getByLabelText('Hasta'), '2026-11-01');
    await user.click(screen.getByRole('button', { name: 'Aplicar fechas' }));
    expect(await screen.findByText('La fecha "desde" no puede ser posterior a "hasta"')).toBeInTheDocument();
    expect(pedidos).toHaveLength(llamadas);
  });

  it('un periodo inválido escrito a mano en la dirección no se pide al backend', async () => {
    const pedidos = mockVentas();
    renderConProviders(<ReporteVentasPage />, { ...ADMIN, ruta: '/app/reportes/ventas?desde=2026-02-30' });
    expect(await screen.findByText('Las fechas deben tener el formato AAAA-MM-DD')).toBeInTheDocument();
    expect(pedidos).toHaveLength(0);
  });

  it('sin ventas en el periodo lo dice y no dibuja gráficos vacíos; sin ticket dice "Sin datos"', async () => {
    mockVentas(ventas({ totales: { polizas: 0, enCuotas: 0, primaAnual: '0.00', descuentos: '0.00', primaFinal: '0.00', cobrado: '0.00', ticketPromedio: null }, grupos: [] }));
    renderConProviders(<ReporteVentasPage />, ADMIN);
    expect(await screen.findByText('No hubo ventas en este periodo.')).toBeInTheDocument();
    expect(screen.getByText('Sin datos')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('descarga el PDF del mismo reporte con el periodo y la agrupación en pantalla', async () => {
    mockVentas();
    let consulta = '';
    server.use(
      http.get(`${API}/admin/reportes/ventas`, ({ request }) => {
        const url = new URL(request.url);
        if (url.searchParams.get('formato') !== 'pdf') return HttpResponse.json(ventas());
        consulta = url.search;
        return new HttpResponse(new Uint8Array([37, 80, 68, 70]), {
          headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename="ventas-2026-11-01-a-2026-11-12.pdf"' },
        });
      }),
    );
    const crear = vi.fn(() => 'blob:prueba');
    Object.assign(URL, { createObjectURL: crear, revokeObjectURL: vi.fn() });
    const clic = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const user = userEvent.setup();
    renderConProviders(<ReporteVentasPage />, { ...ADMIN, ruta: '/app/reportes/ventas?desde=2026-11-01&hasta=2026-11-12&agrupar=plan' });

    await user.click(await screen.findByRole('button', { name: /descargar pdf/i }));
    await waitFor(() => expect(clic).toHaveBeenCalled());
    expect(consulta).toBe('?desde=2026-11-01&hasta=2026-11-12&agrupar=plan&formato=pdf');
    expect(crear).toHaveBeenCalledOnce();
  });

  it('muestra el mensaje del backend si falla y permite reintentar', async () => {
    server.use(http.get(`${API}/admin/reportes/ventas`, () => HttpResponse.json({ statusCode: 400, message: 'El periodo no puede superar un año' }, { status: 400 })));
    renderConProviders(
      <>
        <ReporteVentasPage />
        <Toaster />
      </>,
      ADMIN,
    );
    expect(await screen.findByText('El periodo no puede superar un año')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reintentar/i })).toBeInTheDocument();
  });
});

/* ───────────────────────── Retención ───────────────────────── */

const embudo = (extra: Partial<EmbudoRetencion> = {}): EmbudoRetencion => ({
  abiertos: 10,
  conIntentos: 8,
  contactados: 5,
  aceptaron: 3,
  enlaceUsado: 2,
  convertidos: 2,
  descartados: 4,
  enSeguimiento: 4,
  tasaConversion: '20.00',
  diasPromedioConversion: '2.5',
  descartadosPorMotivo: { PRECIO: 2, YA_CONTRATO: 1, NO_RESPONDE: 1, SIN_INTERES: 0, OTRO: 0 },
  intentos: {
    total: 20,
    porResultado: { CONTACTADO: 6, NO_RESPONDE: 10, RECHAZA: 1, ACEPTA: 3 },
    porCanal: { LLAMADA: 8, WHATSAPP: 12 },
  },
  ...extra,
});

describe('ReporteRetencionPage', () => {
  it('muestra el embudo, la tasa que calculó el backend, los días con coma y los desgloses', async () => {
    const r: ReporteRetencion = { desde: '2026-11-01', hasta: '2026-11-12', ...embudo() };
    server.use(http.get(`${API}/admin/reportes/retencion`, () => HttpResponse.json(r)));
    renderConProviders(<ReporteRetencionPage />, ADMIN);

    expect(await screen.findByText('Tasa de conversión')).toBeInTheDocument();
    expect(screen.getByText('20 %')).toBeInTheDocument();
    expect(screen.getByText('2,5 días')).toBeInTheDocument();
    const embudoLista = screen.getByRole('list', { name: 'Embudo de retención' });
    expect(within(embudoLista).getByText('Aceptaron')).toBeInTheDocument();
    expect(within(embudoLista).getByText('10 seguimientos')).toBeInTheDocument();
    expect(screen.getByText('Descartados: 4')).toBeInTheDocument();
    expect(screen.getByText('Ya contrató otro seguro')).toBeInTheDocument();
    expect(screen.getByText('Intentos por resultado (20)')).toBeInTheDocument();
    expect(screen.getByText('WhatsApp')).toBeInTheDocument();
  });

  it('sin base para la tasa dice "Sin datos" y nunca 0 %', async () => {
    const r: ReporteRetencion = { desde: '2026-11-01', hasta: '2026-11-12', ...embudo({ abiertos: 0, convertidos: 0, tasaConversion: null, diasPromedioConversion: null }) };
    server.use(http.get(`${API}/admin/reportes/retencion`, () => HttpResponse.json(r)));
    renderConProviders(<ReporteRetencionPage />, ADMIN);
    expect(await screen.findByText('No hubo seguimientos en este periodo.')).toBeInTheDocument();
    expect(screen.getAllByText('Sin datos').length).toBe(2);
    expect(screen.queryByText('0 %')).not.toBeInTheDocument();
  });
});

/* ───────────────────────── Descuentos ───────────────────────── */

describe('ReporteDescuentosPage', () => {
  const base: ReporteDescuentos = {
    desde: '2026-11-01',
    hasta: '2026-11-12',
    negociados: { otorgados: 5, aceptados: 3, convertidos: 2, tasaConversion: '40.00', porcentajePromedio: '7.50', porcentajeMaximo: '10.00', montoDescontado: '85.50' },
    porAsesor: [{ asesorId: 'a1', asesor: 'Luis Asesor', otorgados: 5, aceptados: 3, convertidos: 2, tasaConversion: '40.00', porcentajePromedio: '7.50', porcentajeMaximo: '10.00', montoDescontado: '85.50' }],
    primeraCompra: { aplicados: 4, montoDescontado: '120.00' },
  };

  it('muestra los negociados, el de primera compra y la tabla por asesor', async () => {
    server.use(http.get(`${API}/admin/reportes/descuentos`, () => HttpResponse.json(base)));
    renderConProviders(<ReporteDescuentosPage />, ADMIN);
    expect(await screen.findByText('Descuentos negociados')).toBeInTheDocument();
    expect(screen.getByText('Conversión: 40 %')).toBeInTheDocument();
    expect(screen.getByText('Máximo otorgado: 10 %')).toBeInTheDocument();
    expect(screen.getByText(/Se aplicó en/)).toHaveTextContent('4 compras');
    const tabla = screen.getByRole('table', { name: 'Descuentos negociados por asesor' });
    expect(within(tabla).getByText('Luis Asesor')).toBeInTheDocument();
  });

  it('sin descuentos negociados dice "Sin datos" en el promedio y que ningún asesor negoció', async () => {
    const vacio: ReporteDescuentos = {
      ...base,
      negociados: { otorgados: 0, aceptados: 0, convertidos: 0, tasaConversion: null, porcentajePromedio: null, porcentajeMaximo: null, montoDescontado: '0.00' },
      porAsesor: [],
      primeraCompra: { aplicados: 1, montoDescontado: '30.00' },
    };
    server.use(http.get(`${API}/admin/reportes/descuentos`, () => HttpResponse.json(vacio)));
    renderConProviders(<ReporteDescuentosPage />, ADMIN);
    expect(await screen.findByText('Ningún asesor negoció descuentos en este periodo.')).toBeInTheDocument();
    expect(screen.getAllByText('Sin datos').length).toBeGreaterThan(0);
    expect(screen.getByText(/Se aplicó en/)).toHaveTextContent('1 compra');
  });
});

/* ───────────────────────── ★ Impacto de la Prueba de Choque ───────────────────────── */

describe('ReporteImpactoPruebaChoquePage', () => {
  const base: ReporteImpactoPruebaChoque = {
    desde: '2026-11-01',
    hasta: '2026-11-12',
    cotizaciones: 20,
    conSimulacion: 8,
    porcentajeConSimulacion: '40.00',
    conversion: {
      conSimulacion: { cotizaciones: 8, compras: 3, tasa: '37.50' },
      sinSimulacion: { cotizaciones: 12, compras: 2, tasa: '16.67' },
    },
    comprasTrasSimular: { compras: 3, planDistintoAlMasBarato: 2, porcentajeDistinto: '66.67', eligieronElPrimero: 1, porcentajePrimero: '33.33' },
    preocupaciones: [
      {
        segmento: 'PARTICULAR',
        zona: 'ALTA',
        simulaciones: 5,
        masElegido: { codigo: 'ROBO_AUTOPARTES', nombre: 'Robo de autopartes', veces: 3 },
        escenarios: [
          { codigo: 'ROBO_AUTOPARTES', nombre: 'Robo de autopartes', veces: 3 },
          { codigo: 'CHOQUE_LEVE', nombre: 'Choque leve', veces: 2 },
        ],
      },
    ],
    conversionMensajeRn35: { conRn35: { mensajes: 4, compras: 2, tasa: '50.00' }, sinRn35: { mensajes: 5, compras: 1, tasa: '20.00' } },
  };

  it('compara la conversión con y sin la prueba, qué plan eligen y qué les preocupa, y aclara que no prueba causa', async () => {
    server.use(http.get(`${API}/admin/reportes/prueba-choque`, () => HttpResponse.json(base)));
    renderConProviders(<ReporteImpactoPruebaChoquePage />, ADMIN);

    expect(await screen.findByText('Usaron la Prueba de Choque')).toBeInTheDocument();
    expect(screen.getByText('40 % de las cotizaciones')).toBeInTheDocument();
    const barras = screen.getByRole('list', { name: 'Conversión con y sin Prueba de Choque' });
    expect(within(barras).getByText('37,5 %')).toBeInTheDocument();
    expect(within(barras).getByText('16,67 %')).toBeInTheDocument();
    expect(within(barras).getByText('3 compras de 8 cotizaciones')).toBeInTheDocument();
    expect(screen.getByText(/Es una comparación, no una prueba de causa/)).toBeInTheDocument();

    expect(screen.getByText(/eligieron un plan distinto al más barato \(66,67 %\)/)).toBeInTheDocument();
    expect(screen.getByText(/eligieron el primero del ranking por costo real \(33,33 %\)/)).toBeInTheDocument();

    const tabla = screen.getByRole('table', { name: /preocupaciones elegidas/i });
    expect(within(tabla).getByText('Particular')).toBeInTheDocument();
    expect(within(tabla).getByText('Alta')).toBeInTheDocument();
    expect(within(tabla).getByText('Robo de autopartes (3)')).toBeInTheDocument();
    expect(within(tabla).getByText('Choque leve: 2')).toBeInTheDocument();

    const rn35 = screen.getByRole('list', { name: 'Conversión del mensaje final' });
    expect(within(rn35).getByText('Con la frase de contraste')).toBeInTheDocument();
    expect(within(rn35).getByText('50 %')).toBeInTheDocument();
  });

  it('sin datos: no inventa porcentajes ni gráficos; lo dice en texto', async () => {
    const vacio: ReporteImpactoPruebaChoque = {
      ...base,
      cotizaciones: 0,
      conSimulacion: 0,
      porcentajeConSimulacion: null,
      conversion: { conSimulacion: { cotizaciones: 0, compras: 0, tasa: null }, sinSimulacion: { cotizaciones: 0, compras: 0, tasa: null } },
      comprasTrasSimular: { compras: 0, planDistintoAlMasBarato: 0, porcentajeDistinto: null, eligieronElPrimero: 0, porcentajePrimero: null },
      preocupaciones: [],
      conversionMensajeRn35: null,
    };
    server.use(http.get(`${API}/admin/reportes/prueba-choque`, () => HttpResponse.json(vacio)));
    renderConProviders(<ReporteImpactoPruebaChoquePage />, ADMIN);
    expect(await screen.findByText('Nadie compró después de simular en este periodo.')).toBeInTheDocument();
    expect(screen.getByText('Todavía no hay simulaciones con preocupaciones en este periodo.')).toBeInTheDocument();
    expect(screen.getByText('Todavía no hay mensajes finales enviados en este periodo.')).toBeInTheDocument();
    expect(screen.getAllByText(/Sin datos/).length).toBeGreaterThan(0);
  });
});

/* ───────────────────────── Mi desempeño ───────────────────────── */

describe('MiDesempenoPage', () => {
  const mi: ReporteMiDesempeno = {
    desde: '2026-11-01',
    hasta: '2026-11-12',
    asesorias: { atendidas: 6, cerradas: 4, enAtencion: 2, porMotivo: { DUDA: 3, NEGOCIACION: 2, DESCUENTO: 1, INSPECCION: 0, NO_ASEGURABLE: 0 } },
    retencion: embudo(),
    descuentos: { otorgados: 3, aceptados: 2, convertidos: 1, tasaConversion: '33.33', porcentajePromedio: '6.00' },
    ventasAtribuidas: { polizas: 2, porAsesoria: 1, porTelemarketing: 1, primaFinal: '1200.00' },
  };

  it('el asesor ve sus asesorías, sus ventas, sus descuentos y su embudo', async () => {
    server.use(http.get(`${API}/asesor/reportes/mi-desempeno`, () => HttpResponse.json(mi)));
    renderConProviders(<MiDesempenoPage />, ASESOR);
    expect(await screen.findByText('Asesorías')).toBeInTheDocument();
    expect(screen.getByText('Atendidas')).toBeInTheDocument();
    expect(screen.getByText('1 por asesoría · 1 por telemarketing')).toBeInTheDocument();
    expect(screen.getByText('Conversión: 33,33 %')).toBeInTheDocument();
    expect(screen.getByText('Tus seguimientos')).toBeInTheDocument();
    expect(screen.getByRole('list', { name: 'Embudo de retención' })).toBeInTheDocument();
  });

  it('el administrador no tiene este reporte: se le explica sin pedirlo', async () => {
    let pedido = false;
    server.use(
      http.get(`${API}/asesor/reportes/mi-desempeno`, () => {
        pedido = true;
        return HttpResponse.json(mi);
      }),
    );
    renderConProviders(<MiDesempenoPage />, ADMIN);
    expect(await screen.findByText('No tienes acceso a esta pantalla')).toBeInTheDocument();
    expect(pedido).toBe(false);
  });
});

/* ───────────────────────── Dashboard ───────────────────────── */

const solicitud = (id: string, estado: 'PENDIENTE' | 'EN_ATENCION', asignadoAMi = false) => ({
  id,
  motivo: 'DUDA',
  estado,
  canal: 'WHATSAPP',
  origen: 'CLIENTE',
  fechaCreacion: new Date(Date.now() - 3_600_000).toISOString(),
  asignadoAMi,
  cotizacion: { id: 'c1', fecha: new Date().toISOString(), estado: 'REGISTRADA', vehiculo: 'Toyota Corolla 2022' },
  cliente: { nombre: 'Ana Ríos', telefono: '*****4321', email: 'a***@example.com', canalPreferido: 'WHATSAPP', numeroDocumento: null },
});

describe('DashboardPage', () => {
  it('administrador: ventas del mes por canal, lo que requiere atención y el estado del catálogo', async () => {
    server.use(
      http.get(`${API}/admin/reportes/ventas`, () => HttpResponse.json(ventas())),
      http.get(`${API}/asesorias/cola`, () => HttpResponse.json([solicitud('s1', 'PENDIENTE'), solicitud('s2', 'PENDIENTE'), solicitud('s3', 'EN_ATENCION')])),
      http.get(`${API}/seguimientos`, () => HttpResponse.json([{ id: 'g1' }])),
      http.get(`${API}/admin/contenido-planes/completitud`, () => HttpResponse.json({ completo: false, planesActivosIncompletos: 2, items: [] })),
      http.get(`${API}/admin/panel`, () =>
        HttpResponse.json({ aseguradoras: { activas: 5, total: 5 }, planes: { activos: 10, total: 10 }, campos: { activos: 6, total: 6 }, ultimosCambios: [] }),
      ),
    );
    renderConProviders(<DashboardPage />, ADMIN);

    expect(await screen.findByText('Pólizas del mes')).toBeInTheDocument();
    const barras = screen.getByRole('list', { name: 'Prima final por canal' });
    expect(within(barras).getByText('Compra autónoma')).toBeInTheDocument();
    expect(await screen.findByText('2 solicitudes de asesoría pendientes')).toBeInTheDocument();
    expect(screen.getByText('1 seguimiento abierto')).toBeInTheDocument();
    expect(await screen.findByText('2 planes activos con el contenido incompleto')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver la completitud' })).toHaveAttribute('href', '/app/admin/contenido/completitud');
    expect(await screen.findByText('Aseguradoras activas')).toBeInTheDocument();
  });

  it('asesor: su cola, sus casos en atención, sus seguimientos y su mes', async () => {
    const mi: ReporteMiDesempeno = {
      desde: '2026-11-01',
      hasta: '2026-11-12',
      asesorias: { atendidas: 6, cerradas: 4, enAtencion: 2, porMotivo: { DUDA: 0, NEGOCIACION: 0, DESCUENTO: 0, INSPECCION: 0, NO_ASEGURABLE: 0 } },
      retencion: embudo(),
      descuentos: { otorgados: 3, aceptados: 2, convertidos: 1, tasaConversion: '33.33', porcentajePromedio: '6.00' },
      ventasAtribuidas: { polizas: 2, porAsesoria: 1, porTelemarketing: 1, primaFinal: '1200.00' },
    };
    server.use(
      http.get(`${API}/asesor/reportes/mi-desempeno`, () => HttpResponse.json(mi)),
      http.get(`${API}/asesorias/cola`, () => HttpResponse.json([solicitud('s1', 'PENDIENTE'), solicitud('s3', 'EN_ATENCION', true)])),
      http.get(`${API}/seguimientos`, () => HttpResponse.json([])),
    );
    renderConProviders(<DashboardPage />, ASESOR);

    expect(await screen.findByText('1 solicitud pendiente')).toBeInTheDocument();
    expect(await screen.findByText('Tus casos en atención')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Atender' })).toHaveAttribute('href', '/app/asesorias/s3');
    expect(await screen.findByText('No hay seguimientos abiertos.')).toBeInTheDocument();
    expect(await screen.findByText('Asesorías atendidas')).toBeInTheDocument();
    expect(screen.getByText('Otorgados: 3')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver mi desempeño completo' })).toHaveAttribute('href', '/app/reportes/mi-desempeno');
  });
});

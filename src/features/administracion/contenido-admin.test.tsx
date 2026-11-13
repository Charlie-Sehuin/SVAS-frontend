import { describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { Route, Routes } from 'react-router-dom';
import { server } from '../../test/msw/server';
import { API } from '../../test/msw/handlers';
import { renderConProviders } from '../../test/render';
import { Toaster } from '../../shared/ui/toaster';
import type { CoberturaCatalogoAdmin, CompletitudPlan, ContenidoPlanAdmin } from '../../shared/types/api';
import { CoberturasCatalogoPage } from './pages/CoberturasCatalogoPage';
import { CompletitudContenidoPage } from './pages/CompletitudContenidoPage';
import { ContenidoPlanPage } from './pages/ContenidoPlanPage';

const ADMIN = { roles: ['ADMINISTRADOR' as const] };
const PLAN = '22222222-2222-4222-8222-222222222222';
const error400 = (message: string, errors?: { campo: string; mensaje: string }[]) =>
  HttpResponse.json({ statusCode: 400, message, ...(errors ? { errors } : {}), correlationId: 'corr-1' }, { status: 400 });

/* ───────────────────────── Contenido de un plan ───────────────────────── */

const vacio = (): ContenidoPlanAdmin => ({
  planId: PLAN,
  aseguradora: 'Rímac',
  plan: 'Oro',
  activo: false,
  resumen: null,
  descripcion: null,
  idealPara: null,
  coberturas: [
    { codigo: 'DANO_CHOQUE', nombre: 'Daño propio por choque', categoria: 'DANOS_PROPIOS', definida: false, incluida: null, detalle: null, limiteMonto: null },
    { codigo: 'RC_TERCEROS', nombre: 'Responsabilidad civil', categoria: 'RESPONSABILIDAD', definida: false, incluida: null, detalle: null, limiteMonto: null },
    { codigo: 'LUNAS', nombre: 'Rotura de lunas', categoria: 'ADICIONAL', definida: false, incluida: null, detalle: null, limiteMonto: null },
  ],
  exclusiones: [],
  requisitos: [],
  contenidoActualizadoEn: null,
  completitud: null,
  advertencias: [],
});

const completo = (extra: Partial<ContenidoPlanAdmin> = {}): ContenidoPlanAdmin => ({
  ...vacio(),
  resumen: 'Cobertura ampliada',
  descripcion: 'Todo lo de Plata más lunas',
  idealPara: 'Quien no quiere preocuparse',
  coberturas: [
    { codigo: 'DANO_CHOQUE', nombre: 'Daño propio por choque', categoria: 'DANOS_PROPIOS', definida: true, incluida: true, detalle: null, limiteMonto: null },
    { codigo: 'RC_TERCEROS', nombre: 'Responsabilidad civil', categoria: 'RESPONSABILIDAD', definida: true, incluida: true, detalle: 'Hasta USD 200,000', limiteMonto: '200000.00' },
    { codigo: 'LUNAS', nombre: 'Rotura de lunas', categoria: 'ADICIONAL', definida: true, incluida: false, detalle: null, limiteMonto: null },
  ],
  exclusiones: ['Conducir con alcohol sobre el límite legal'],
  requisitos: [{ tipo: 'CONDUCTOR', texto: 'Licencia vigente', obligatorio: true }],
  contenidoActualizadoEn: '2026-11-01T10:00:00-05:00',
  ...extra,
});

function renderPlan() {
  return renderConProviders(
    <>
      <Routes>
        <Route path="/app/admin/planes/:planId/contenido" element={<ContenidoPlanPage />} />
      </Routes>
      <Toaster />
    </>,
    { ...ADMIN, ruta: `/app/admin/planes/${PLAN}/contenido` },
  );
}
const mockPlan = (c: ContenidoPlanAdmin) => server.use(http.get(`${API}/admin/planes/${PLAN}/contenido`, () => HttpResponse.json(c)));

describe('ContenidoPlanPage', () => {
  it('un plan sin contenido muestra el avance en texto, las coberturas "Sin definir" y no deja guardar', async () => {
    mockPlan(vacio());
    renderPlan();
    expect(await screen.findByText('0 de 3 coberturas definidas')).toBeInTheDocument();
    expect(screen.getByText('Este plan todavía no tiene contenido.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^guardar/i })).toBeDisabled();
    expect(screen.getByText('Guardar se habilita cuando todo el contenido está completo.')).toBeInTheDocument();
    const pestanaCoberturas = screen.getByRole('tab', { name: /coberturas/i });
    expect(within(pestanaCoberturas).getByText('Faltan 3')).toBeInTheDocument();

    await userEvent.setup().click(pestanaCoberturas);
    expect(screen.getAllByText('Sin definir')).toHaveLength(3);
  });

  it('se completa pestaña por pestaña y entonces habilita Guardar; el PUT manda el contenido sin límite en lo no incluido', async () => {
    mockPlan(vacio());
    let cuerpo: unknown = null;
    server.use(
      http.put(`${API}/admin/planes/${PLAN}/contenido`, async ({ request }) => {
        cuerpo = await request.json();
        return HttpResponse.json({ ...completo(), cambio: {} });
      }),
    );
    const user = userEvent.setup();
    renderPlan();
    await screen.findByText('0 de 3 coberturas definidas');

    await user.type(screen.getByLabelText(/^resumen/i), 'Cobertura ampliada');
    // El panel de la pestaña también se llama "Descripción": se busca el cuadro de texto.
    await user.type(screen.getByRole('textbox', { name: /^descripción/i }), 'Todo lo de Plata más lunas');
    await user.type(screen.getByLabelText(/ideal para/i), 'Quien no quiere preocuparse');

    await user.click(screen.getByRole('tab', { name: /coberturas/i }));
    await user.click(within(screen.getByRole('group', { name: '¿El plan incluye Daño propio por choque?' })).getByRole('button', { name: 'Incluida' }));
    await user.click(within(screen.getByRole('group', { name: '¿El plan incluye Responsabilidad civil?' })).getByRole('button', { name: 'Incluida' }));
    await user.type(screen.getByLabelText('Detalle de Responsabilidad civil'), 'Hasta USD 200,000');
    await user.type(screen.getByLabelText('Límite de Responsabilidad civil'), '200000');
    await user.click(within(screen.getByRole('group', { name: '¿El plan incluye Rotura de lunas?' })).getByRole('button', { name: 'No incluida' }));
    expect(screen.getByText('3 de 3 coberturas definidas')).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: /exclusiones/i }));
    await user.click(screen.getByRole('button', { name: /agregar exclusión/i }));
    await user.type(screen.getByLabelText('Exclusión 1'), 'Conducir con alcohol sobre el límite legal');

    await user.click(screen.getByRole('tab', { name: /requisitos/i }));
    await user.click(screen.getByRole('button', { name: /agregar requisito/i }));
    await user.selectOptions(screen.getByLabelText('Tipo del requisito 1'), 'CONDUCTOR');
    await user.type(screen.getByLabelText('Texto del requisito 1'), 'Licencia vigente');

    const guardar = screen.getByRole('button', { name: /^guardar/i });
    expect(guardar).toBeEnabled();
    await user.click(guardar);
    expect(await screen.findByText('Contenido guardado')).toBeInTheDocument();
    expect(cuerpo).toEqual({
      resumen: 'Cobertura ampliada',
      descripcion: 'Todo lo de Plata más lunas',
      idealPara: 'Quien no quiere preocuparse',
      coberturas: [
        { codigo: 'DANO_CHOQUE', incluida: true, detalle: null, limiteMonto: null },
        { codigo: 'RC_TERCEROS', incluida: true, detalle: 'Hasta USD 200,000', limiteMonto: 200000 },
        { codigo: 'LUNAS', incluida: false, detalle: null, limiteMonto: null },
      ],
      exclusiones: ['Conducir con alcohol sobre el límite legal'],
      requisitos: [{ tipo: 'CONDUCTOR', texto: 'Licencia vigente', obligatorio: true }],
    });
  }, 20_000);

  it('marcar "No incluida" apaga el límite y lo vacía', async () => {
    mockPlan(completo());
    const user = userEvent.setup();
    renderPlan();
    await screen.findByText('3 de 3 coberturas definidas');
    await user.click(screen.getByRole('tab', { name: /coberturas/i }));
    const limite = screen.getByLabelText('Límite de Responsabilidad civil');
    expect(limite).toHaveValue('200000.00');
    await user.click(within(screen.getByRole('group', { name: '¿El plan incluye Responsabilidad civil?' })).getByRole('button', { name: 'No incluida' }));
    expect(limite).toBeDisabled();
    expect(limite).toHaveValue('');
  });

  it('valida el límite, las exclusiones vacías o repetidas y no deja guardar con errores', async () => {
    mockPlan(completo());
    const user = userEvent.setup();
    renderPlan();
    await screen.findByText('3 de 3 coberturas definidas');
    await user.click(screen.getByRole('tab', { name: /coberturas/i }));
    const limite = screen.getByLabelText('Límite de Responsabilidad civil');
    await user.clear(limite);
    await user.type(limite, '0');
    expect(await screen.findByText('Debe ser mayor que 0')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^guardar/i })).toBeDisabled();
    await user.clear(limite);
    await user.type(limite, '1500');

    await user.click(screen.getByRole('tab', { name: /exclusiones/i }));
    await user.click(screen.getByRole('button', { name: /agregar exclusión/i }));
    expect(await screen.findByText('Una exclusión no puede ir vacía')).toBeInTheDocument();
    await user.type(screen.getByLabelText('Exclusión 2'), 'Conducir con alcohol sobre el límite legal');
    expect(await screen.findByText('Hay exclusiones repetidas')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Quitar la exclusión 2' }));
    expect(screen.queryByText('Hay exclusiones repetidas')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^guardar/i })).toBeEnabled();
  });

  it('muestra las contradicciones con la Prueba de Choque (RN-43) como advertencias que no impiden guardar', async () => {
    mockPlan(
      completo({
        advertencias: [
          {
            codigo: 'LUNAS',
            nombre: 'Rotura de lunas',
            incluida: false,
            escenariosQueCubren: ['CHOQUE_FUERTE'],
            mensaje: '«Rotura de lunas» dice que no, pero la Prueba de Choque la cubre en CHOQUE_FUERTE. Corrige una de las dos.',
          },
        ],
      }),
    );
    renderPlan();
    const bloque = await screen.findByRole('region', { name: /advertencias de la prueba de choque/i });
    expect(within(bloque).getByText(/«Rotura de lunas» dice que no/)).toBeInTheDocument();
    expect(within(bloque).getByRole('link', { name: 'Ir a deducibles y topes' })).toHaveAttribute('href', '/app/admin/prueba-choque/coberturas');
  });

  it('al guardar, si el backend devuelve contradicciones, avisa en ámbar y deja la lista', async () => {
    mockPlan(completo());
    server.use(
      http.put(`${API}/admin/planes/${PLAN}/contenido`, () =>
        HttpResponse.json({
          ...completo({
            advertencias: [{ codigo: 'LUNAS', nombre: 'Rotura de lunas', incluida: true, escenariosQueCubren: [], mensaje: '«Rotura de lunas» dice que sí, pero la Prueba de Choque dice que no. Corrige una de las dos.' }],
          }),
          cambio: {},
          warning: { code: 'CONTENIDO_INCOHERENTE', message: '«Rotura de lunas» dice que sí, pero la Prueba de Choque dice que no. Corrige una de las dos.' },
        }),
      ),
    );
    const user = userEvent.setup();
    renderPlan();
    await screen.findByText('3 de 3 coberturas definidas');
    const resumen = screen.getByLabelText(/^resumen/i);
    await user.type(resumen, ' nuevo');
    await user.click(screen.getByRole('button', { name: /^guardar/i }));
    expect(await screen.findByText('Contenido guardado')).toBeInTheDocument();
    expect(await screen.findByRole('region', { name: /advertencias de la prueba de choque/i })).toBeInTheDocument();
  });

  it('si el backend rechaza el guardado, lista sus mensajes tal cual', async () => {
    mockPlan(completo());
    server.use(
      http.put(`${API}/admin/planes/${PLAN}/contenido`, () =>
        error400('Faltan coberturas por definir (sí o no): VUELCO', [
          { campo: 'coberturas', mensaje: 'Faltan coberturas por definir (sí o no): VUELCO' },
          { campo: 'exclusiones.0', mensaje: 'Hay exclusiones repetidas' },
        ]),
      ),
    );
    const user = userEvent.setup();
    renderPlan();
    await screen.findByText('3 de 3 coberturas definidas');
    await user.type(screen.getByLabelText(/^resumen/i), '!');
    await user.click(screen.getByRole('button', { name: /^guardar/i }));
    const alerta = await screen.findByText('No se pudo guardar');
    const bloque = alerta.closest('[role="alert"]') as HTMLElement;
    expect(within(bloque).getByText('Faltan coberturas por definir (sí o no): VUELCO')).toBeInTheDocument();
    expect(within(bloque).getByText('Hay exclusiones repetidas')).toBeInTheDocument();
  });

  it('descartar vuelve a lo guardado; los requisitos se pueden quitar; las flechas cambian de pestaña', async () => {
    mockPlan(completo());
    const user = userEvent.setup();
    renderPlan();
    await screen.findByText('3 de 3 coberturas definidas');
    const resumen = screen.getByLabelText(/^resumen/i);
    await user.type(resumen, ' extra');
    expect(resumen).toHaveValue('Cobertura ampliada extra');
    await user.click(screen.getByRole('button', { name: /descartar/i }));
    expect(screen.getByLabelText(/^resumen/i)).toHaveValue('Cobertura ampliada');

    const descripcion = screen.getByRole('tab', { name: 'Descripción' });
    descripcion.focus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: /coberturas/i })).toHaveAttribute('aria-selected', 'true');

    await user.click(screen.getByRole('tab', { name: /requisitos/i }));
    await user.click(screen.getByRole('button', { name: 'Quitar el requisito 1' }));
    expect(await screen.findByText('Indica al menos un requisito')).toBeInTheDocument();
  });

  it('muestra el mensaje del backend si el plan no existe', async () => {
    server.use(http.get(`${API}/admin/planes/${PLAN}/contenido`, () => HttpResponse.json({ statusCode: 404, message: 'El plan no existe' }, { status: 404 })));
    renderPlan();
    expect(await screen.findByText('El plan no existe')).toBeInTheDocument();
  });
});

/* ───────────────────────── Completitud ───────────────────────── */

const plan = (extra: Partial<CompletitudPlan> = {}): CompletitudPlan => ({
  planId: PLAN,
  aseguradora: 'Rímac',
  plan: 'Oro',
  activo: true,
  coberturasFaltantes: 0,
  tieneResumen: true,
  tieneDescripcion: true,
  tieneIdealPara: true,
  nRequisitos: 2,
  nExclusiones: 3,
  incoherenciasPruebaChoque: 0,
  completo: true,
  contenidoActualizadoEn: '2026-11-01T10:00:00-05:00',
  ...extra,
});

describe('CompletitudContenidoPage', () => {
  it('dice qué le falta a cada plan en texto, cuántos activos están incompletos y enlaza a completarlo', async () => {
    server.use(
      http.get(`${API}/admin/contenido-planes/completitud`, () =>
        HttpResponse.json({
          completo: false,
          planesActivosIncompletos: 1,
          items: [
            plan({ planId: 'a', plan: 'Plata', completo: false, coberturasFaltantes: 2, tieneResumen: false, nExclusiones: 0 }),
            plan({ planId: 'b', plan: 'Oro', incoherenciasPruebaChoque: 1 }),
            plan({ planId: 'c', plan: 'Básico', activo: false, completo: false, coberturasFaltantes: 1, contenidoActualizadoEn: null }),
          ],
        }),
      ),
    );
    renderConProviders(<CompletitudContenidoPage />, ADMIN);
    expect(await screen.findByText('1 plan activo tiene el contenido incompleto.')).toBeInTheDocument();

    const tabla = screen.getByRole('table', { name: /completitud del contenido/i });
    const filas = within(tabla).getAllByRole('row').slice(1);
    expect(within(filas[0]!).getByText('Incompleto')).toBeInTheDocument();
    expect(within(filas[0]!).getByText('Faltan 2 coberturas por definir')).toBeInTheDocument();
    expect(within(filas[0]!).getByText('Sin resumen')).toBeInTheDocument();
    expect(within(filas[0]!).getByText('Sin exclusiones')).toBeInTheDocument();
    expect(within(filas[0]!).getByRole('link', { name: 'Completar contenido' })).toHaveAttribute('href', '/app/admin/planes/a/contenido');
    // Completo pero contradice a la Prueba de Choque (RN-43): "Incoherente".
    expect(within(filas[1]!).getByText('Incoherente')).toBeInTheDocument();
    expect(within(filas[1]!).getByText('1 cobertura')).toBeInTheDocument();
    expect(within(filas[1]!).getByRole('link', { name: 'Editar contenido' })).toBeInTheDocument();
    // Un plan inactivo puede estar incompleto: se dice "Inactivo".
    expect(within(filas[2]!).getByText('Inactivo')).toBeInTheDocument();
    expect(within(filas[2]!).getByText('Nunca')).toBeInTheDocument();
  });

  it('si todos los activos están completos lo dice', async () => {
    server.use(http.get(`${API}/admin/contenido-planes/completitud`, () => HttpResponse.json({ completo: true, planesActivosIncompletos: 0, items: [plan()] })));
    renderConProviders(<CompletitudContenidoPage />, ADMIN);
    expect(await screen.findByText('Todos los planes activos tienen su contenido completo.')).toBeInTheDocument();
    expect(screen.getByText('Completo')).toBeInTheDocument();
  });

  it('muestra el mensaje del backend si no carga', async () => {
    server.use(http.get(`${API}/admin/contenido-planes/completitud`, () => HttpResponse.json({ statusCode: 500, message: 'Ocurrió un error en el servidor.' }, { status: 500 })));
    renderConProviders(<CompletitudContenidoPage />, ADMIN);
    expect(await screen.findByText('Ocurrió un error en el servidor.')).toBeInTheDocument();
  });
});

/* ───────────────────────── Catálogo de coberturas ───────────────────────── */

const cobertura = (extra: Partial<CoberturaCatalogoAdmin> = {}): CoberturaCatalogoAdmin => ({
  id: 'c1',
  codigo: 'LUNAS',
  nombre: 'Rotura de lunas',
  categoria: 'ADICIONAL',
  descripcion: 'Parabrisas, laterales y luneta',
  orden: 4,
  activa: true,
  escenarios: ['CHOQUE_FUERTE'],
  ...extra,
});

function mockCatalogo(filas: CoberturaCatalogoAdmin[]) {
  server.use(
    http.get(`${API}/admin/coberturas`, () => HttpResponse.json(filas)),
    http.get(`${API}/admin/prueba-choque/escenarios`, () =>
      HttpResponse.json([
        { id: 'e1', codigo: 'CHOQUE_FUERTE', nombre: 'Choque fuerte', descripcion: 'x', montoDanoReferencial: '3500.00', diasTaller: 12, orden: 2, activo: true, pendientes: null },
        { id: 'e2', codigo: 'ROBO_TOTAL', nombre: 'Robo total', descripcion: 'x', montoDanoReferencial: null, diasTaller: 30, orden: 4, activo: true, pendientes: null },
      ]),
    ),
  );
}

describe('CoberturasCatalogoPage', () => {
  it('lista el catálogo con su categoría, los escenarios ligados por nombre y su estado, y avisa del efecto en los planes', async () => {
    mockCatalogo([cobertura(), cobertura({ id: 'c2', codigo: 'VIEJA', nombre: 'Cobertura vieja', activa: false, escenarios: [] })]);
    renderConProviders(<CoberturasCatalogoPage />, ADMIN);
    const tabla = await screen.findByRole('table', { name: /catálogo de coberturas/i });
    const filas = within(tabla).getAllByRole('row').slice(1);
    expect(within(filas[0]!).getByText('Rotura de lunas')).toBeInTheDocument();
    expect(within(filas[0]!).getByText('Adicional')).toBeInTheDocument();
    expect(await within(filas[0]!).findByText('Choque fuerte')).toBeInTheDocument();
    expect(within(filas[0]!).getByText('Activa')).toBeInTheDocument();
    expect(within(filas[1]!).getByText('Inactiva')).toBeInTheDocument();
    expect(within(filas[1]!).getByText('Ninguno')).toBeInTheDocument();
    expect(screen.getByRole('note')).toHaveTextContent('Agregar o activar una cobertura deja incompletos a los planes');
  });

  it('crea una cobertura: valida antes de enviar y manda el cuerpo con los escenarios elegidos', async () => {
    mockCatalogo([cobertura()]);
    let enviado: { codigo: string; cuerpo: unknown } | null = null;
    server.use(
      http.put(`${API}/admin/coberturas/:codigo`, async ({ request, params }) => {
        enviado = { codigo: String(params.codigo), cuerpo: await request.json() };
        return HttpResponse.json(cobertura({ codigo: String(params.codigo) }));
      }),
    );
    const user = userEvent.setup();
    renderConProviders(
      <>
        <CoberturasCatalogoPage />
        <Toaster />
      </>,
      ADMIN,
    );
    await user.click(await screen.findByRole('button', { name: /nueva cobertura/i }));
    const dialogo = await screen.findByRole('dialog', { name: 'Nueva cobertura' });

    await user.click(within(dialogo).getByRole('button', { name: 'Guardar' }));
    expect(within(dialogo).getByText('El código va en mayúsculas y guiones bajos, p. ej. ROBO_TOTAL')).toBeInTheDocument();
    expect(within(dialogo).getByText('El nombre de la cobertura es obligatorio')).toBeInTheDocument();
    expect(within(dialogo).getByText('La descripción de la cobertura es obligatoria')).toBeInTheDocument();
    expect(enviado).toBeNull();

    await user.type(within(dialogo).getByLabelText(/^código/i), 'auxilio_vial');
    await user.type(within(dialogo).getByLabelText(/^nombre/i), 'Auxilio vial');
    await user.selectOptions(within(dialogo).getByLabelText(/^categoría/i), 'ASISTENCIA');
    await user.type(within(dialogo).getByLabelText(/^descripción/i), 'Grúa y cambio de llanta');
    await user.click(await within(dialogo).findByRole('button', { name: 'Robo total' }));
    await user.click(within(dialogo).getByRole('button', { name: 'Guardar' }));
    expect(await screen.findByText('Cobertura creada')).toBeInTheDocument();
    expect(enviado).toEqual({
      codigo: 'AUXILIO_VIAL',
      cuerpo: { nombre: 'Auxilio vial', categoria: 'ASISTENCIA', descripcion: 'Grúa y cambio de llanta', orden: 5, activa: true, escenarios: ['ROBO_TOTAL'] },
    });
  });

  it('editar: el código no se cambia y se puede desactivar; el mensaje del backend sale junto al campo', async () => {
    mockCatalogo([cobertura()]);
    server.use(
      http.put(`${API}/admin/coberturas/LUNAS`, () => error400('Datos no válidos', [{ campo: 'nombre', mensaje: 'Ya existe una cobertura con ese nombre' }])),
    );
    const user = userEvent.setup();
    renderConProviders(<CoberturasCatalogoPage />, ADMIN);
    await user.click(await screen.findByRole('button', { name: 'Editar Rotura de lunas' }));
    const dialogo = await screen.findByRole('dialog', { name: 'Editar Rotura de lunas' });
    expect(within(dialogo).getByLabelText(/^código/i)).toBeDisabled();
    await user.click(within(dialogo).getByRole('checkbox', { name: /activa/i }));
    await user.click(within(dialogo).getByRole('button', { name: 'Guardar' }));
    expect(await within(dialogo).findByText('Ya existe una cobertura con ese nombre')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());
  });
});

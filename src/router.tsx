import { lazy, Suspense, type ComponentType, type ReactNode } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { PublicLayout } from './app-shell/PublicLayout';
import { PantallaPendiente } from './app-shell/PantallaPendiente';
import { NotFoundPage } from './app-shell/NotFoundPage';
import { RoleGuard } from './auth/RoleGuard';
import { useAuth } from './auth/useAuth';
import { Skeleton } from './shared/ui/skeleton';

/**
 * Rutas del doc de arquitectura §6.2. Cada feature se carga con `lazy()` para
 * que el embudo móvil cargue solo lo suyo (login, backoffice y cada feature
 * van en su propio chunk). Las pantallas aún no construidas muestran
 * <PantallaPendiente> con la ola en la que se hacen.
 */
const LandingPage = lazy(() => import('./features/landing/LandingPage').then((m) => ({ default: m.LandingPage })));
const LoginPage = lazy(() => import('./auth/LoginPage').then((m) => ({ default: m.LoginPage })));

/* Ola 1 · cotizar y comparar. El embudo carga solo lo suyo: cada pantalla en su propio chunk. */
const CotizarPage = lazy(() => import('./features/cotizacion/pages/CotizarPage').then((m) => ({ default: m.CotizarPage })));
const ComparativoPage = lazy(() => import('./features/cotizacion/pages/ComparativoPage').then((m) => ({ default: m.ComparativoPage })));
const CompraPage = lazy(() => import('./features/compra/pages/CompraPage').then((m) => ({ default: m.CompraPage })));
const CompararPlanesPage = lazy(() =>
  import('./features/planes/pages/CompararPlanesPage').then((m) => ({ default: m.CompararPlanesPage })),
);
const PruebaChoquePage = lazy(() =>
  import('./features/prueba-choque/pages/PruebaChoquePage').then((m) => ({ default: m.PruebaChoquePage })),
);
const ConfirmacionPage = lazy(() =>
  import('./features/compra/pages/ConfirmacionPage').then((m) => ({ default: m.ConfirmacionPage })),
);
const MisPolizasPage = lazy(() => import('./features/compra/pages/MisPolizasPage').then((m) => ({ default: m.MisPolizasPage })));
const MisCotizacionesPage = lazy(() =>
  import('./features/cotizacion/pages/MisCotizacionesPage').then((m) => ({ default: m.MisCotizacionesPage })),
);
const BackofficeLayout = lazy(() => import('./app-shell/BackofficeLayout').then((m) => ({ default: m.BackofficeLayout })));

/* Ola 0 · administración. Cada pantalla en su propio chunk: el embudo del cliente no las descarga. */
const admin = <K extends string>(cargar: () => Promise<Record<K, ComponentType>>, nombre: K) =>
  lazy(() => cargar().then((m) => ({ default: m[nombre] })));
const PanelAdminPage = admin(() => import('./features/administracion/pages/PanelAdminPage'), 'PanelAdminPage');
const UsuariosPage = admin(() => import('./features/administracion/pages/UsuariosPage'), 'UsuariosPage');
const AseguradorasPlanesPage = admin(() => import('./features/administracion/pages/AseguradorasPlanesPage'), 'AseguradorasPlanesPage');
const CamposRequeridosPage = admin(() => import('./features/administracion/pages/CamposRequeridosPage'), 'CamposRequeridosPage');
const ReglasInspeccionPage = admin(() => import('./features/administracion/pages/ReglasInspeccionPage'), 'ReglasInspeccionPage');
const ParametrosPage = admin(() => import('./features/administracion/pages/ParametrosPage'), 'ParametrosPage');
const BitacoraPage = admin(() => import('./features/administracion/pages/BitacoraPage'), 'BitacoraPage');
const TarifasPlanesPage = admin(() => import('./features/administracion/pages/TarifasPlanesPage'), 'TarifasPlanesPage');
const TarifasPesosPage = admin(() => import('./features/administracion/pages/TarifasPesosPage'), 'TarifasPesosPage');
const TarifasRangosSumaPage = admin(() => import('./features/administracion/pages/TarifasRangosSumaPage'), 'TarifasRangosSumaPage');
const CompletitudTarifasPage = admin(() => import('./features/administracion/pages/CompletitudTarifasPage'), 'CompletitudTarifasPage');
const SimuladorTarifaPage = admin(() => import('./features/administracion/pages/SimuladorTarifaPage'), 'SimuladorTarifaPage');

function Cargando() {
  return (
    <div className="mx-auto max-w-3xl space-y-4 p-6" aria-busy>
      <Skeleton className="h-8 w-1/2" />
      <Skeleton className="h-48 w-full" />
    </div>
  );
}

const lazyPage = (node: ReactNode) => <Suspense fallback={<Cargando />}>{node}</Suspense>;

/** `/app`: el administrador ve su panel; el asesor, el dashboard (Ola 4) aún pendiente. */
function InicioBackoffice() {
  const { roles } = useAuth();
  return roles.includes('ADMINISTRADOR') ? lazyPage(<PanelAdminPage />) : <PantallaPendiente titulo="Dashboard" ola={4} />;
}
const pendiente = (titulo: string, ola: 0 | 1 | 2 | 3 | 4) => <PantallaPendiente titulo={titulo} ola={ola} />;

export const router = createBrowserRouter([
  /* ───────── Embudo público (PublicLayout) ───────── */
  {
    element: <PublicLayout />,
    errorElement: <NotFoundPage />,
    children: [
      { path: '/', element: lazyPage(<LandingPage />) },
      { path: '/cotizar', element: lazyPage(<CotizarPage />) },
      { path: '/cotizacion/:id', element: lazyPage(<ComparativoPage />) },
      { path: '/cotizacion/:id/prueba', element: lazyPage(<PruebaChoquePage />) },
      { path: '/comparar', element: lazyPage(<CompararPlanesPage />) },
      { path: '/retoma/:token', element: pendiente('Retomar mi cotización', 2) },
      // La compra es pública a propósito: un cliente NUEVO no tiene cuenta y se la crea aquí mismo, sin salir del
      // embudo (doc de arquitectura §6.2: "CLIENTE, registro en el paso 1"). La pantalla decide qué mostrar según la sesión.
      { path: '/compra/:cotizacionId', element: lazyPage(<CompraPage />) },

      /* CLIENTE */
      {
        element: <RoleGuard roles={['CLIENTE']} />,
        children: [
          { path: '/compra/:id/listo', element: lazyPage(<ConfirmacionPage />) },
          { path: '/mi-cuenta', element: <Navigate to="/mi-cuenta/cotizaciones" replace /> },
          { path: '/mi-cuenta/cotizaciones', element: lazyPage(<MisCotizacionesPage />) },
          { path: '/mi-cuenta/polizas', element: lazyPage(<MisPolizasPage />) },
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },

  { path: '/login', element: lazyPage(<LoginPage />) },

  /* ───────── Backoffice (BackofficeLayout) ───────── */
  {
    path: '/app',
    element: <RoleGuard roles={['ASESOR', 'ADMINISTRADOR']} />,
    errorElement: <NotFoundPage />,
    children: [
      {
        element: lazyPage(<BackofficeLayout />),
        children: [
          { index: true, element: <InicioBackoffice /> },
          { path: 'buscar', element: pendiente('Búsqueda', 2) },

          /* ASESOR (ADMIN lectura) */
          { path: 'asesorias', element: pendiente('Cola de asesoría', 2) },
          { path: 'asesorias/:id', element: pendiente('Caso', 2) },
          { path: 'seguimientos', element: pendiente('Seguimientos', 2) },
          { path: 'seguimientos/:id', element: pendiente('Seguimiento', 2) },

          /* Reportes: ASESOR (propio), ADMIN (todos) */
          { path: 'reportes/mi-desempeno', element: pendiente('Mi desempeño', 4) },

          /* Solo ADMINISTRADOR */
          {
            element: <RoleGuard roles={['ADMINISTRADOR']} />,
            children: [
              { path: 'reportes/ventas', element: pendiente('Reporte de ventas', 4) },
              { path: 'reportes/retencion', element: pendiente('Reporte de retención', 4) },
              { path: 'reportes/descuentos', element: pendiente('Reporte de descuentos', 4) },
              { path: 'reportes/prueba-choque', element: pendiente('Impacto de la Prueba de Choque', 4) },

              { path: 'admin', element: <Navigate to="/app/admin/aseguradoras" replace /> },
              { path: 'admin/aseguradoras', element: lazyPage(<AseguradorasPlanesPage />) },
              { path: 'admin/campos', element: lazyPage(<CamposRequeridosPage />) },
              { path: 'admin/reglas-inspeccion', element: lazyPage(<ReglasInspeccionPage />) },
              { path: 'admin/parametros', element: lazyPage(<ParametrosPage />) },
              { path: 'admin/usuarios', element: lazyPage(<UsuariosPage />) },
              { path: 'admin/bitacora', element: lazyPage(<BitacoraPage />) },

              { path: 'admin/tarifas', element: <Navigate to="/app/admin/tarifas/planes" replace /> },
              { path: 'admin/tarifas/planes', element: lazyPage(<TarifasPlanesPage />) },
              { path: 'admin/tarifas/pesos', element: lazyPage(<TarifasPesosPage />) },
              { path: 'admin/tarifas/rangos-suma', element: lazyPage(<TarifasRangosSumaPage />) },
              { path: 'admin/tarifas/simulador', element: lazyPage(<SimuladorTarifaPage />) },
              { path: 'admin/tarifas/completitud', element: lazyPage(<CompletitudTarifasPage />) },

              { path: 'admin/planes/:planId/contenido', element: pendiente('Contenido del plan', 2) },
              { path: 'admin/coberturas', element: pendiente('Catálogo de coberturas', 2) },
              { path: 'admin/contenido/completitud', element: pendiente('Completitud del contenido de planes', 2) },

              { path: 'admin/prueba-choque/escenarios', element: pendiente('Escenarios de la Prueba de Choque', 2) },
              { path: 'admin/prueba-choque/coberturas', element: pendiente('Deducibles y topes por plan', 2) },
              { path: 'admin/prueba-choque/frecuencias', element: pendiente('Frecuencias y zonas', 2) },
              { path: 'admin/prueba-choque/factores', element: pendiente('Factores de perfil', 2) },
            ],
          },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
]);

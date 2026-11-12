import { Link, Outlet, useLocation } from 'react-router-dom';
import { Headset, LogOut, Menu, Phone, User } from 'lucide-react';
import { useAuth } from '../auth/useAuth';
import { useApplyTheme } from '../design-system/ThemeProvider';
import { cn } from '../shared/lib/utils';
import { iniciales } from '../shared/lib/format';
import { Button } from '../shared/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../shared/ui/dropdown-menu';
import { DemoLegend } from '../shared/ui/domain/DemoLegend';
import { WakeUpBanner } from '../shared/ui/domain/WakeUpBanner';
import { LogoS, LogoSeguroSimple } from './LogoSeguroSimple';

export const TELEFONO = '(01) 680-3770';
export const TELEFONO_HREF = 'tel:+5116803770';

/**
 * Layout del embudo (arquitectura §6.3, diseño §7.6): en la landing, header
 * blanco con el logo completo; en cotizar / comparar / comprar, barra
 * navy-800 compacta con la "S", el stepper y "Hablar con un asesor" siempre
 * visible. Sin sidebar. Siempre en modo claro.
 */
export function PublicLayout() {
  useApplyTheme(false);
  const { pathname } = useLocation();
  const esLanding = pathname === '/';
  const paso = pasoDelEmbudo(pathname);

  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      {esLanding ? <HeaderLanding /> : <HeaderEmbudo paso={paso} />}
      <WakeUpBanner />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}

/* ───────────── Stepper ───────────── */

export type PasoEmbudo = 0 | 1 | 2 | 3;
const PASOS = ['Cotizar', 'Comparar', 'Comprar'] as const;

export function pasoDelEmbudo(pathname: string): PasoEmbudo {
  if (pathname.startsWith('/cotizar')) return 1;
  if (pathname.startsWith('/cotizacion/') || pathname.startsWith('/comparar')) return 2;
  if (pathname.startsWith('/compra/') || pathname.startsWith('/retoma/')) return 3;
  return 0;
}

/** Stepper (§7.5): en móvil barra de progreso + "Paso 2 de 3 · Comparar"; en escritorio círculos numerados. */
function Stepper({ paso }: { paso: PasoEmbudo }) {
  if (paso === 0) return null;
  const nombre = PASOS[paso - 1];
  return (
    <nav aria-label="Progreso de la compra" className="flex-1">
      <p className="text-small text-white/80 md:hidden">
        Paso {paso} de 3 · <span className="font-bold text-white">{nombre}</span>
      </p>
      <ol className="hidden items-center gap-2 md:flex">
        {PASOS.map((p, i) => {
          const n = (i + 1) as PasoEmbudo;
          const estado = n < paso ? 'hecho' : n === paso ? 'activo' : 'pendiente';
          return (
            <li key={p} className="flex items-center gap-2" aria-current={estado === 'activo' ? 'step' : undefined}>
              <span
                className={cn(
                  'flex size-7 items-center justify-center rounded-full text-small font-bold',
                  estado === 'activo' && 'bg-brand-500 text-white',
                  estado === 'hecho' && 'bg-white text-navy-700',
                  estado === 'pendiente' && 'border border-white/50 text-white/70',
                )}
              >
                {estado === 'hecho' ? '✓' : n}
              </span>
              <span className={cn('text-small', estado === 'activo' ? 'font-bold text-white' : 'text-white/70')}>{p}</span>
              {i < PASOS.length - 1 ? <span aria-hidden className="mx-1 h-px w-8 bg-white/30" /> : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/* ───────────── Headers ───────────── */

function HeaderLanding() {
  return (
    <header className="bg-surface">
      <div className="mx-auto flex h-20 max-w-[1200px] items-center justify-between px-4 lg:px-6">
        <Link to="/" aria-label="SeguroSimple, inicio">
          <LogoSeguroSimple />
        </Link>
        <div className="hidden items-center gap-3 md:flex">
          <Button variant="secondary" size="sm" asChild>
            <a href={TELEFONO_HREF}>
              <Phone aria-hidden /> Te llamamos
            </a>
          </Button>
          <MenuCuenta variante="claro" />
        </div>
        <div className="md:hidden">
          <MenuCuenta variante="claro" />
        </div>
      </div>
    </header>
  );
}

function HeaderEmbudo({ paso }: { paso: PasoEmbudo }) {
  return (
    <header className="sticky top-0 z-20 bg-navy-800 text-white shadow-card">
      <div className="mx-auto flex h-16 max-w-[1200px] items-center gap-4 px-4 lg:px-6">
        <Link to="/" aria-label="SeguroSimple, inicio" className="shrink-0 focus-visible:outline-white">
          <LogoS />
        </Link>
        <Stepper paso={paso} />
        <Button variant="secondary" size="sm" className="ml-auto shrink-0 border-white bg-transparent text-white hover:bg-white/10 focus-visible:outline-white" asChild>
          <a href={TELEFONO_HREF}>
            <Headset aria-hidden /> <span className="hidden sm:inline">Hablar con un asesor</span>
            <span className="sm:hidden">Asesor</span>
          </a>
        </Button>
        <MenuCuenta variante="oscuro" />
      </div>
      {paso > 0 ? (
        <div className="h-1 w-full bg-white/15 md:hidden" aria-hidden>
          <div className="h-full bg-brand-500 transition-[width] duration-200" style={{ width: `${(paso / 3) * 100}%` }} />
        </div>
      ) : null}
    </header>
  );
}

/** Menú de cuenta del CLIENTE (§7.2): "Mis cotizaciones", "Mis pólizas", "Cerrar sesión". Anónimo: "Iniciar sesión". */
function MenuCuenta({ variante }: { variante: 'claro' | 'oscuro' }) {
  const { estado, nombre, roles, signOut } = useAuth();
  const oscuro = variante === 'oscuro';
  if (estado !== 'autenticado') {
    return (
      <Button variant="ghost" size="sm" className={cn(oscuro && 'text-white hover:bg-white/10 hover:text-white focus-visible:outline-white')} asChild>
        <Link to="/login">
          <User aria-hidden /> <span className="hidden sm:inline">Iniciar sesión</span>
        </Link>
      </Button>
    );
  }
  const esInterno = roles.includes('ASESOR') || roles.includes('ADMINISTRADOR');
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Menú de cuenta"
          className={cn(
            'flex size-11 items-center justify-center rounded-full text-small font-bold',
            oscuro ? 'bg-white text-navy-700 focus-visible:outline-white' : 'bg-navy-700 text-white',
          )}
        >
          {iniciales(nombre ?? '') || <User className="size-5" />}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {esInterno ? (
          <DropdownMenuItem asChild>
            <Link to="/app">
              <Menu aria-hidden /> Ir al panel
            </Link>
          </DropdownMenuItem>
        ) : (
          <>
            <DropdownMenuItem asChild>
              <Link to="/mi-cuenta/cotizaciones">Mis cotizaciones</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/mi-cuenta/polizas">Mis pólizas</Link>
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void signOut()}>
          <LogOut aria-hidden /> Cerrar sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* ───────────── Footer (§7.7) ───────────── */

function Footer() {
  return (
    <footer>
      <div className="bg-canvas">
        <div className="mx-auto grid max-w-[1200px] gap-6 px-4 py-8 text-center md:grid-cols-2 md:text-left lg:px-6">
          <div>
            <p className="text-caption text-navy-700">Supervisado por</p>
            <p className="mt-2 text-small font-bold text-ink-soft">Superintendencia de Banca, Seguros y AFP</p>
          </div>
          <div>
            <p className="text-caption text-navy-700">Miembro de</p>
            <p className="mt-2 text-small font-bold text-ink-soft">APECOSE · Endeavor Perú · Startup Perú</p>
          </div>
        </div>
      </div>
      <div className="bg-footer text-white">
        <div className="mx-auto grid max-w-[1200px] gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-4 lg:px-6">
          <ColumnaFooter titulo="Seguro vehicular" enlaces={['Garantía de mejor precio', 'Coberturas y beneficios', 'Blog SeguroSimple.com']} />
          <ColumnaFooter titulo="Sobre SeguroSimple.com" enlaces={['¿Qué hacemos?', 'Términos y condiciones', 'Contacto', 'Libro de reclamaciones']} />
          <ColumnaFooter titulo="Aseguradoras" enlaces={['Rímac', 'Pacífico', 'Mapfre', 'La Positiva', 'Qualitas']} />
          <div>
            <p className="mb-3 text-caption text-footer-title">Contacto</p>
            <a href={TELEFONO_HREF} className="inline-flex items-center gap-2 text-white hover:underline">
              <Phone className="size-4" aria-hidden /> {TELEFONO}
            </a>
          </div>
        </div>
      </div>
      <DemoLegend />
    </footer>
  );
}

function ColumnaFooter({ titulo, enlaces }: { titulo: string; enlaces: string[] }) {
  return (
    <div>
      <p className="mb-3 text-caption text-footer-title">{titulo}</p>
      <ul className="space-y-2 text-small">
        {enlaces.map((e) => (
          <li key={e}>
            <span className="text-white/90">{e}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

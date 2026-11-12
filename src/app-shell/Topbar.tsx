import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound, LogOut, Menu, Moon, Search, Sun, User } from 'lucide-react';
import { CambiarPasswordDialog } from '../auth/CambiarPasswordDialog';
import { useAuth, usePerfil } from '../auth/useAuth';
import { useTheme } from '../design-system/ThemeProvider';
import { iniciales } from '../shared/lib/format';
import { Input } from '../shared/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../shared/ui/dropdown-menu';
import { useSidebarStore } from './store/useSidebarStore';

/** Topbar del backoffice (§10.1): búsqueda por cotización o documento, usuario y modo oscuro. */
export function Topbar() {
  const { nombre, roles, signOut } = useAuth();
  const { data: perfil } = usePerfil();
  const { theme, toggle } = useTheme();
  const { abrirMovil } = useSidebarStore();
  const navigate = useNavigate();
  const [cambiarAbierto, setCambiarAbierto] = useState(false);
  const nombreMostrar = perfil?.nombreCompleto ?? nombre ?? 'Usuario';

  return (
    <>
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-line bg-surface px-4 lg:px-6">
      <button
        type="button"
        className="rounded-lg p-2 text-navy-700 hover:bg-navy-50 md:hidden"
        aria-label="Abrir menú"
        onClick={() => abrirMovil(true)}
      >
        <Menu className="size-6" />
      </button>

      <form
        role="search"
        className="relative hidden max-w-md flex-1 sm:block"
        onSubmit={(e) => {
          e.preventDefault();
          const q = new FormData(e.currentTarget).get('q');
          if (typeof q === 'string' && q.trim()) navigate(`/app/buscar?q=${encodeURIComponent(q.trim())}`);
        }}
      >
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-soft" aria-hidden />
        <Input name="q" type="search" placeholder="Buscar cotización o documento…" aria-label="Buscar cotización o documento" className="h-10 pl-9" />
      </form>

      <div className="ml-auto flex items-center gap-1">
        <button
          type="button"
          onClick={toggle}
          className="rounded-lg p-2 text-navy-700 hover:bg-navy-50"
          aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          aria-pressed={theme === 'dark'}
        >
          {theme === 'dark' ? <Sun className="size-5" /> : <Moon className="size-5" />}
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" className="flex h-11 items-center gap-2 rounded-lg px-2 hover:bg-navy-50" aria-label="Menú de cuenta">
              <span className="flex size-8 items-center justify-center rounded-full bg-navy-700 text-small font-bold text-surface">
                {iniciales(nombreMostrar) || <User className="size-4" />}
              </span>
              <span className="hidden text-small font-bold text-navy-700 lg:inline">{nombreMostrar}</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>
              <span className="block font-bold text-ink">{nombreMostrar}</span>
              <span className="block">{roles.join(' · ') || perfil?.rol}</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => setCambiarAbierto(true)}>
              <KeyRound aria-hidden /> Cambiar contraseña
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => void signOut()}>
              <LogOut aria-hidden /> Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
    <CambiarPasswordDialog open={cambiarAbierto} onOpenChange={setCambiarAbierto} />
    </>
  );
}

import { NavLink } from 'react-router-dom';
import { ChevronsLeft, ChevronsRight, X } from 'lucide-react';
import { useAuth } from '../auth/useAuth';
import { cn } from '../shared/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../shared/ui/tooltip';
import { navegacionPara, type NavItem } from './RoleNavigationConfig';
import { useSidebarStore } from './store/useSidebarStore';
import { LogoS } from './LogoSeguroSimple';

/**
 * Sidebar del backoffice (diseño visual §10.1): 240 px, navy-800, texto
 * blanco 80 %; ítem activo con barra izquierda carmesí de 3 px. Colapsable a
 * 64 px (solo iconos con tooltip). En móvil es un panel deslizante.
 */
export function Sidebar() {
  const { roles } = useAuth();
  const { colapsado, alternar, abiertoMovil, abrirMovil } = useSidebarStore();
  const grupos = navegacionPara(roles);

  return (
    <>
      {/* Fondo oscuro en móvil */}
      {abiertoMovil ? (
        <button
          type="button"
          aria-label="Cerrar menú"
          className="fixed inset-0 z-30 bg-navy-900/60 md:hidden"
          onClick={() => abrirMovil(false)}
        />
      ) : null}

      <aside
        aria-label="Menú principal"
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex flex-col bg-navy-800 text-white/80 transition-[width,transform] duration-200 ease-out',
          'md:sticky md:top-0 md:h-dvh md:translate-x-0',
          colapsado ? 'md:w-16' : 'md:w-60',
          'w-60',
          abiertoMovil ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className={cn('flex h-16 items-center gap-3 px-3', colapsado && 'md:justify-center')}>
          <LogoS className="size-9 shrink-0 text-xl" />
          {!colapsado ? <span className="text-lg font-900 text-white">SVAS</span> : null}
          <button
            type="button"
            className="ml-auto rounded-lg p-2 text-white/80 hover:bg-white/10 hover:text-white md:hidden"
            aria-label="Cerrar menú"
            onClick={() => abrirMovil(false)}
          >
            <X className="size-5" />
          </button>
        </div>

        <TooltipProvider delayDuration={200}>
          <nav className="flex-1 overflow-y-auto px-2 pb-4">
            {grupos.map((g) => (
              <div key={g.id} className="mb-2">
                {g.label && !colapsado ? (
                  <p className="px-3 pb-1 pt-4 text-caption text-navy-300">{g.label}</p>
                ) : g.label ? (
                  <div className="mx-3 my-3 h-px bg-white/15" />
                ) : null}
                <ul className="space-y-0.5">
                  {g.items.map((item) => (
                    <li key={item.to}>
                      <ItemNav item={item} colapsado={colapsado} readOnly={item.readOnlyFor?.some((r) => roles.includes(r)) ?? false} />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </TooltipProvider>

        <button
          type="button"
          onClick={alternar}
          className="hidden h-12 items-center justify-center gap-2 border-t border-white/10 text-small text-white/70 hover:bg-white/10 hover:text-white md:flex"
          aria-label={colapsado ? 'Expandir menú' : 'Contraer menú'}
          aria-expanded={!colapsado}
        >
          {colapsado ? <ChevronsRight className="size-5" /> : <ChevronsLeft className="size-5" />}
          {!colapsado ? 'Contraer' : null}
        </button>
      </aside>
    </>
  );
}

function ItemNav({ item, colapsado, readOnly }: { item: NavItem; colapsado: boolean; readOnly: boolean }) {
  const { abrirMovil } = useSidebarStore();
  const Icon = item.icon;
  const enlace = (
    <NavLink
      to={item.to}
      end={item.to === '/app'}
      onClick={() => abrirMovil(false)}
      className={({ isActive }) =>
        cn(
          'relative flex min-h-11 items-center gap-3 rounded-lg px-3 text-small font-bold transition-colors duration-150',
          'hover:bg-white/10 hover:text-white focus-visible:outline-white',
          isActive && 'bg-white/10 text-white before:absolute before:inset-y-2 before:left-0 before:w-[3px] before:rounded-r before:bg-brand-500',
          colapsado && 'md:justify-center md:px-0',
        )
      }
    >
      <Icon className="size-5 shrink-0" aria-hidden />
      <span className={cn('truncate', colapsado && 'md:sr-only')}>
        {item.label}
        {readOnly ? <span className="ml-1 font-normal text-white/50">(lectura)</span> : null}
      </span>
    </NavLink>
  );

  if (!colapsado) return enlace;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{enlace}</TooltipTrigger>
      <TooltipContent side="right">{item.label}</TooltipContent>
    </Tooltip>
  );
}

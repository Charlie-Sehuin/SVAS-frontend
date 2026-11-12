import { NavLink } from 'react-router-dom';
import { cn } from '../../../shared/lib/utils';

const TABS = [
  { to: '/app/admin/tarifas/planes', label: 'Tasa base' },
  { to: '/app/admin/tarifas/pesos', label: 'Pesos' },
  { to: '/app/admin/tarifas/rangos-suma', label: 'Rangos de suma' },
  { to: '/app/admin/tarifas/completitud', label: 'Completitud' },
  { to: '/app/admin/tarifas/simulador', label: 'Simulador' },
] as const;

/** Navegación entre las pantallas de tarifas (doc de dominio §17). */
export function TarifasTabs() {
  return (
    <nav aria-label="Secciones de tarifas" className="-mt-2 mb-5 overflow-x-auto border-b border-line">
      <ul className="flex min-w-max gap-1">
        {TABS.map((t) => (
          <li key={t.to}>
            <NavLink
              to={t.to}
              className={({ isActive }) =>
                cn(
                  'flex min-h-11 items-center border-b-[3px] px-4 text-small font-bold transition-colors',
                  isActive ? 'border-brand-500 text-navy-700' : 'border-transparent text-ink-soft hover:text-navy-700',
                )
              }
            >
              {t.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

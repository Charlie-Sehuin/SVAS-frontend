import { NavLink } from 'react-router-dom';
import { cn } from '../../../shared/lib/utils';

const TABS = [
  { to: '/app/admin/prueba-choque/escenarios', label: 'Escenarios' },
  { to: '/app/admin/prueba-choque/coberturas', label: 'Deducibles y topes' },
  { to: '/app/admin/prueba-choque/frecuencias', label: 'Frecuencias y zonas' },
  { to: '/app/admin/prueba-choque/factores', label: 'Factores de perfil' },
] as const;

/** Navegación entre las pantallas del catálogo de la Prueba de Choque (dominio §16, RF-36). */
export function PruebaChoqueTabs() {
  return (
    <nav aria-label="Secciones de la Prueba de Choque" className="-mt-2 mb-5 overflow-x-auto border-b border-line">
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

/** Aviso fijo: los valores iniciales son supuestos y cambian la simulación desde la siguiente (RN-31, RN-32). */
export function AvisoReferencial() {
  return (
    <p role="note" className="mb-4 rounded-lg bg-status-info/10 p-3 text-small text-ink">
      Estos valores son <strong>supuestos referenciales</strong> que debe validar el negocio (RN-31). Un cambio vale desde la siguiente simulación; las
      que ya se hicieron no cambian (RN-32). Cada guardado queda en la bitácora.
    </p>
  );
}

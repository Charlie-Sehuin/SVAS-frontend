import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from './useAuth';
import { UnauthorizedPage } from './UnauthorizedPage';
import { Skeleton } from '../shared/ui/skeleton';
import type { Rol } from '../shared/types/enums';
import { hasRole } from '../shared/utils/permissions';

interface RoleGuardProps {
  roles: readonly Rol[];
}

/**
 * Guard de ruta por rol (arquitectura §6.4). Sin sesión → /login (recordando
 * a dónde iba). Con sesión pero sin rol → pantalla "sin permiso".
 */
export function RoleGuard({ roles }: RoleGuardProps) {
  const { estado, roles: misRoles } = useAuth();
  const location = useLocation();

  if (estado === 'cargando') {
    return (
      <div className="mx-auto max-w-3xl space-y-4 p-6" aria-busy>
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }
  if (estado === 'anonimo') {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }
  if (!hasRole(misRoles, ...roles)) return <UnauthorizedPage />;
  return <Outlet />;
}

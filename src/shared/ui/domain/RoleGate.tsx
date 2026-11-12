import type { ReactNode } from 'react';
import { useAuth } from '../../../auth/useAuth';
import type { Rol } from '../../types/enums';
import { hasRole } from '../../utils/permissions';

interface RoleGateProps {
  roles: readonly Rol[];
  children: ReactNode;
  /** Qué mostrar si el rol no está permitido (por defecto, nada: oculto, no deshabilitado). */
  fallback?: ReactNode;
}

/** Oculta contenido por rol (arquitectura §7.3). La seguridad real vive en el backend. */
export function RoleGate({ roles, children, fallback = null }: RoleGateProps) {
  const { roles: misRoles } = useAuth();
  return hasRole(misRoles, ...roles) ? <>{children}</> : <>{fallback}</>;
}

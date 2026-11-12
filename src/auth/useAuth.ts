import { useContext } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AuthContext, type AuthContextValue } from './AuthProvider';
import { api } from '../shared/lib/api-client';
import { qk } from '../shared/lib/query-keys';
import type { Usuario } from '../shared/types/api/seguridad.types';

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}

/** Perfil completo (`GET /usuarios/me`): nombre, rol y `activo` según la base. */
export function usePerfil() {
  const { estado } = useAuth();
  return useQuery({
    queryKey: qk.usuario.me,
    queryFn: () => api.get('usuarios/me').json<Usuario>(),
    enabled: estado === 'autenticado',
    staleTime: 5 * 60_000,
  });
}

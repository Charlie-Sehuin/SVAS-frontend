import { useContext } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AuthContext, type AuthContextValue } from './AuthProvider';
import { api } from '../shared/lib/api-client';
import { qk } from '../shared/lib/query-keys';
import type { MiContactoResponse, Usuario } from '../shared/types/api/seguridad.types';

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}

/**
 * Datos de contacto de la propia cuenta (`GET /usuarios/me/contacto`): nombres, apellidos, celular y correo.
 * Con la sesión iniciada no se le vuelven a pedir a la persona al cotizar.
 */
export function useMiContacto() {
  const { estado } = useAuth();
  return useQuery({
    queryKey: qk.usuario.contacto,
    queryFn: () => api.get('usuarios/me/contacto').json<MiContactoResponse>(),
    enabled: estado === 'autenticado',
    staleTime: 5 * 60_000,
  });
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

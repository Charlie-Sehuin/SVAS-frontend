import type { ReactElement, ReactNode } from 'react';
import { render, type RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { AuthContext, type AuthContextValue } from '../auth/AuthProvider';
import { ThemeProvider } from '../design-system/ThemeProvider';
import type { Rol } from '../shared/types/enums';

/** Render con los providers de la app. `roles` simula la sesión sin Supabase. */
export function renderConProviders(
  ui: ReactElement,
  {
    roles = [],
    ruta = '/',
    auth: authExtra,
    ...opciones
  }: RenderOptions & { roles?: Rol[]; ruta?: string; auth?: Partial<AuthContextValue> } = {},
) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const auth: AuthContextValue = {
    estado: roles.length ? 'autenticado' : 'anonimo',
    session: null,
    user: null,
    roles,
    nombre: roles.length ? 'Usuario Prueba' : null,
    signIn: async () => ({ roles }),
    signOut: async () => {},
    cambiarPassword: async () => {},
    ...authExtra,
  };
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <AuthContext.Provider value={auth}>
          <MemoryRouter initialEntries={[ruta]}>{children}</MemoryRouter>
        </AuthContext.Provider>
      </QueryClientProvider>
    </ThemeProvider>
  );
  return render(ui, { wrapper: Wrapper, ...opciones });
}

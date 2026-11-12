import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { RouterProvider } from 'react-router-dom';
import { AuthProvider } from './auth/AuthProvider';
import { ThemeProvider } from './design-system/ThemeProvider';
import { queryClient } from './shared/lib/query-client';
import { Toaster } from './shared/ui/toaster';
import { router } from './router';

/** App shell (arquitectura §6.1): ThemeProvider → QueryClientProvider → AuthProvider → RouterProvider → Toaster. */
export function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <RouterProvider router={router} />
          <Toaster />
        </AuthProvider>
        {import.meta.env.DEV ? <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" /> : null}
      </QueryClientProvider>
    </ThemeProvider>
  );
}

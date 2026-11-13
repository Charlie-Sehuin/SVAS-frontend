import '@testing-library/jest-dom/vitest';
import { cleanup, configure } from '@testing-library/react';
import { toast } from 'sonner';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { server } from './msw/server';

// Con toda la suite en paralelo, cargar pantallas en frío y animar toasts puede pasar del segundo por defecto de
// `findBy…` / `waitFor`. Un margen mayor no hace más lentas las pruebas: solo evita falsos fallos por carga.
configure({ asyncUtilTimeout: 4000 });

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
afterEach(() => {
  server.resetHandlers();
  cleanup();
  // Los avisos (toasts) viven en un estado global: sin esto, uno de una prueba aparece también en la siguiente.
  toast.dismiss();
  sessionStorage.clear();
  localStorage.clear();
});
afterAll(() => server.close());

// jsdom no implementa matchMedia (lo usan useMediaQuery y el Toaster).
if (typeof window.matchMedia !== 'function') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

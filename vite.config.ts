/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: { port: 5173, strictPort: true },
  // El embudo móvil solo debe cargar lo suyo (arquitectura §6.2): las rutas van con lazy() en router.tsx y
  // cada feature queda en su propio chunk. Pero cuando varias pantallas lazy comparten una librería, el empaquetador la
  // sube al chunk de entrada y la landing la descarga sin usarla. Los formularios (zod + react-hook-form, unos 45 KB
  // comprimidos) se aíslan en un chunk que solo piden las pantallas con formulario.
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: 'formularios',
              test: /node_modules[\\/](zod|react-hook-form|@hookform)[\\/]/,
              priority: 20,
              // Sin esto el grupo arrastra también `react` y la entrada tendría que descargar este chunk.
              includeDependenciesRecursively: false,
            },
          ],
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
});

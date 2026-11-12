import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

/** Worker de mocks para el navegador (`VITE_MSW=true npm run dev`). Requiere `public/mockServiceWorker.js`. */
export const worker = setupWorker(...handlers);

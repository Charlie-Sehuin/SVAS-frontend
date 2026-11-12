import { setupServer } from 'msw/node';
import { handlers } from './handlers';

/** Servidor de mocks para Vitest. */
export const server = setupServer(...handlers);

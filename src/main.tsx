import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './index.css';

async function activarMocks() {
  if (!import.meta.env.DEV || import.meta.env.VITE_MSW !== 'true') return;
  const { worker } = await import('./test/msw/browser');
  await worker.start({ onUnhandledFrame: 'bypass' });
}

void activarMocks().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});

import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { renderConProviders } from '../test/render';
import { RoleGuard } from '../auth/RoleGuard';
import { BackofficeLayout } from './BackofficeLayout';
import { PublicLayout, pasoDelEmbudo } from './PublicLayout';

describe('app shell', () => {
  it('el stepper deduce el paso desde la ruta', () => {
    expect(pasoDelEmbudo('/')).toBe(0);
    expect(pasoDelEmbudo('/cotizar')).toBe(1);
    expect(pasoDelEmbudo('/cotizacion/abc')).toBe(2);
    expect(pasoDelEmbudo('/compra/abc')).toBe(3);
  });

  it('PublicLayout muestra "Hablar con un asesor" en el embudo y la leyenda de demostración', () => {
    renderConProviders(
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/cotizar" element={<p>contenido</p>} />
        </Route>
      </Routes>,
      { ruta: '/cotizar' },
    );
    expect(screen.getByText('contenido')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /hablar con un asesor/i })).toBeInTheDocument();
    expect(screen.getByText('Paso 1 de 3 ·', { exact: false })).toBeInTheDocument();
    expect(screen.getAllByRole('note').length).toBeGreaterThan(0);
  });

  it('RoleGuard manda al login al anónimo y muestra "sin acceso" al rol equivocado', () => {
    const arbol = (
      <Routes>
        <Route path="/login" element={<p>login</p>} />
        <Route element={<RoleGuard roles={['ADMINISTRADOR']} />}>
          <Route path="/app" element={<p>panel</p>} />
        </Route>
      </Routes>
    );
    const { unmount } = renderConProviders(arbol, { ruta: '/app' });
    expect(screen.getByText('login')).toBeInTheDocument();
    unmount();

    renderConProviders(arbol, { ruta: '/app', roles: ['CLIENTE'] });
    expect(screen.getByText('No tienes acceso a esta pantalla')).toBeInTheDocument();
  });

  it('el sidebar del ASESOR no muestra el grupo Catálogo', () => {
    renderConProviders(
      <Routes>
        <Route element={<BackofficeLayout />}>
          <Route path="/app" element={<p>panel</p>} />
        </Route>
      </Routes>,
      { ruta: '/app', roles: ['ASESOR'] },
    );
    expect(screen.getByRole('link', { name: /cola de asesoría/i })).toBeInTheDocument();
    expect(screen.queryByText('Catálogo')).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /tarifas/i })).not.toBeInTheDocument();
  });
});

import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { renderConProviders } from '../test/render';
import { RoleGuard } from '../auth/RoleGuard';
import { BackofficeLayout } from './BackofficeLayout';
import { cotizacionDeLaRuta, PublicLayout, pasoDelEmbudo } from './PublicLayout';

describe('app shell', () => {
  it('el stepper deduce el paso desde la ruta', () => {
    expect(pasoDelEmbudo('/')).toBe(0);
    expect(pasoDelEmbudo('/cotizar')).toBe(1);
    expect(pasoDelEmbudo('/cotizacion/abc')).toBe(2);
    expect(pasoDelEmbudo('/compra/abc')).toBe(3);
  });

  it('detecta la cotización de la ruta (comparativo, prueba y compra) y no la orden de la confirmación', () => {
    const id = '7f1a2b3c-4d5e-4f60-8a7b-9c0d1e2f3a4b';
    expect(cotizacionDeLaRuta(`/cotizacion/${id}`)).toBe(id);
    expect(cotizacionDeLaRuta(`/cotizacion/${id}/prueba`)).toBe(id);
    expect(cotizacionDeLaRuta(`/compra/${id}`)).toBe(id);
    expect(cotizacionDeLaRuta(`/compra/${id}/listo`)).toBeNull(); // ahí el id es el de la orden
    expect(cotizacionDeLaRuta('/cotizar')).toBeNull();
    expect(cotizacionDeLaRuta('/cotizacion/abc')).toBeNull();
  });

  it('con una cotización a la vista, "Hablar con un asesor" de la barra abre la solicitud en vez de un enlace telefónico', async () => {
    const id = '7f1a2b3c-4d5e-4f60-8a7b-9c0d1e2f3a4b';
    const user = userEvent.setup();
    renderConProviders(
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/cotizacion/:id" element={<p>contenido</p>} />
        </Route>
      </Routes>,
      { roles: ['CLIENTE'], ruta: `/cotizacion/${id}` },
    );
    expect(screen.queryByRole('link', { name: /hablar con un asesor/i })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /hablar con un asesor/i }));
    const dialogo = await screen.findByRole('dialog', { name: /hablar con un asesor/i });
    expect(within(dialogo).getByRole('radio', { name: /tengo una duda/i })).toBeChecked();
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

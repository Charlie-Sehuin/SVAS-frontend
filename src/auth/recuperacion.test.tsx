import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { renderConProviders } from '../test/render';
import { leerEnlaceRecuperacion, type AuthContextValue } from './AuthProvider';
import { LoginPage } from './LoginPage';
import { RecuperarPasswordPage } from './RecuperarPasswordPage';
import { CLAVE_RECUPERACION, RestablecerPasswordPage } from './RestablecerPasswordPage';

afterEach(() => {
  window.history.replaceState(null, '', '/');
  sessionStorage.removeItem(CLAVE_RECUPERACION);
});

describe('leerEnlaceRecuperacion', () => {
  it('toma las llaves del enlace de recuperación', () => {
    expect(leerEnlaceRecuperacion('#access_token=aaa&refresh_token=rrr&expires_in=3600&type=recovery')).toEqual({
      tipo: 'recuperacion',
      accessToken: 'aaa',
      refreshToken: 'rrr',
    });
  });

  it('reconoce el enlace vencido o ya usado', () => {
    expect(leerEnlaceRecuperacion('#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid')).toEqual({ tipo: 'vencido' });
  });

  it('no toma por recuperación lo que no lo es (otro tipo, o faltan llaves)', () => {
    expect(leerEnlaceRecuperacion('')).toEqual({ tipo: 'ninguno' });
    expect(leerEnlaceRecuperacion('#access_token=aaa&refresh_token=rrr&type=signup')).toEqual({ tipo: 'ninguno' });
    expect(leerEnlaceRecuperacion('#type=recovery&access_token=aaa')).toEqual({ tipo: 'ninguno' });
  });
});

describe('Login', () => {
  it('ofrece recuperar la contraseña', () => {
    renderConProviders(<LoginPage />, { ruta: '/login' });
    expect(screen.getByRole('link', { name: '¿Olvidaste tu contraseña?' })).toHaveAttribute('href', '/recuperar');
  });
});

describe('RecuperarPasswordPage', () => {
  it('valida el correo antes de enviar', async () => {
    const enviarRecuperacion = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderConProviders(<RecuperarPasswordPage />, { ruta: '/recuperar', auth: { enviarRecuperacion } });

    await user.type(screen.getByLabelText(/correo/i), 'no-es-correo');
    await user.click(screen.getByRole('button', { name: /enviarme el enlace/i }));

    expect(await screen.findByText('Ese correo no parece válido')).toBeInTheDocument();
    expect(enviarRecuperacion).not.toHaveBeenCalled();
  });

  it('manda el enlace y responde lo mismo exista o no la cuenta', async () => {
    const enviarRecuperacion = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderConProviders(<RecuperarPasswordPage />, { ruta: '/recuperar', auth: { enviarRecuperacion } });

    await user.type(screen.getByLabelText(/correo/i), '  ana@correo.com ');
    await user.click(screen.getByRole('button', { name: /enviarme el enlace/i }));

    expect(await screen.findByRole('heading', { name: 'Revisa tu correo' })).toBeInTheDocument();
    expect(enviarRecuperacion).toHaveBeenCalledWith('ana@correo.com');
    expect(screen.getByRole('status')).toHaveTextContent('Si ana@correo.com tiene una cuenta');
  });

  it('si el envío falla muestra el mensaje y deja reintentar', async () => {
    const enviarRecuperacion = vi.fn().mockRejectedValue(new Error('Pediste el enlace hace muy poco. Espera un minuto y vuelve a intentarlo.'));
    const user = userEvent.setup();
    renderConProviders(<RecuperarPasswordPage />, { ruta: '/recuperar', auth: { enviarRecuperacion } });

    await user.type(screen.getByLabelText(/correo/i), 'ana@correo.com');
    await user.click(screen.getByRole('button', { name: /enviarme el enlace/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Pediste el enlace hace muy poco');
    expect(screen.getByRole('button', { name: /enviarme el enlace/i })).toBeEnabled();
  });
});

function renderRestablecer(auth: Partial<AuthContextValue>) {
  return renderConProviders(
    <Routes>
      <Route path="/restablecer" element={<RestablecerPasswordPage />} />
      <Route path="/mi-cuenta" element={<p>Pantalla de la cuenta</p>} />
      <Route path="/recuperar" element={<p>Pantalla de recuperar</p>} />
    </Routes>,
    { roles: ['CLIENTE'], ruta: '/restablecer', auth },
  );
}

const ENLACE_BUENO = '/restablecer#access_token=aaa&refresh_token=rrr&type=recovery';

describe('RestablecerPasswordPage', () => {
  it('con un enlace bueno pide la contraseña nueva, la guarda y quita las llaves de la dirección', async () => {
    window.history.replaceState(null, '', ENLACE_BUENO);
    const abrirRecuperacion = vi.fn().mockResolvedValue('lista');
    const restablecerPassword = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderRestablecer({ abrirRecuperacion, restablecerPassword });

    await user.type(await screen.findByLabelText(/^nueva contraseña/i), 'Casa-Verde-Lluvia-26');
    await user.type(screen.getByLabelText(/repite la nueva/i), 'Casa-Verde-Lluvia-26');
    await user.click(screen.getByRole('button', { name: /guardar contraseña/i }));

    await waitFor(() => expect(restablecerPassword).toHaveBeenCalledWith('Casa-Verde-Lluvia-26'));
    expect(abrirRecuperacion).toHaveBeenCalledTimes(1);
    expect(abrirRecuperacion).toHaveBeenCalledWith('#access_token=aaa&refresh_token=rrr&type=recovery');
    expect(window.location.hash).toBe('');
    expect(await screen.findByText('Pantalla de la cuenta')).toBeInTheDocument();
    expect(sessionStorage.getItem(CLAVE_RECUPERACION)).toBeNull();
  });

  it('valida largo y coincidencia sin llamar a Supabase', async () => {
    window.history.replaceState(null, '', ENLACE_BUENO);
    const restablecerPassword = vi.fn();
    const user = userEvent.setup();
    renderRestablecer({ abrirRecuperacion: async () => 'lista', restablecerPassword });

    await user.type(await screen.findByLabelText(/^nueva contraseña/i), 'corta');
    await user.type(screen.getByLabelText(/repite la nueva/i), 'otra');
    await user.click(screen.getByRole('button', { name: /guardar contraseña/i }));

    expect(await screen.findByText('Usa al menos 8 caracteres')).toBeInTheDocument();
    expect(screen.getByText('Las contraseñas no coinciden')).toBeInTheDocument();
    expect(restablecerPassword).not.toHaveBeenCalled();
  });

  it('muestra el mensaje en lenguaje llano si Supabase rechaza la contraseña y no sale de la pantalla', async () => {
    window.history.replaceState(null, '', ENLACE_BUENO);
    const restablecerPassword = vi.fn().mockRejectedValue(new Error('La nueva contraseña debe ser distinta de la actual.'));
    const user = userEvent.setup();
    renderRestablecer({ abrirRecuperacion: async () => 'lista', restablecerPassword });

    await user.type(await screen.findByLabelText(/^nueva contraseña/i), 'Casa-Verde-Lluvia-26');
    await user.type(screen.getByLabelText(/repite la nueva/i), 'Casa-Verde-Lluvia-26');
    await user.click(screen.getByRole('button', { name: /guardar contraseña/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('distinta de la actual');
    expect(screen.queryByText('Pantalla de la cuenta')).not.toBeInTheDocument();
  });

  it('con el enlace vencido o ya usado explica y ofrece pedir otro', async () => {
    window.history.replaceState(null, '', '/restablecer#error=access_denied&error_code=otp_expired');
    renderRestablecer({ abrirRecuperacion: async () => 'vencida' });

    expect(await screen.findByRole('heading', { name: 'Este enlace ya no sirve' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Pedir un enlace nuevo' })).toHaveAttribute('href', '/recuperar');
  });

  it('sin enlace (entrar a la dirección a mano) no deja cambiar la contraseña', async () => {
    renderRestablecer({});
    expect(await screen.findByRole('heading', { name: 'No encontramos tu enlace' })).toBeInTheDocument();
    expect(screen.queryByLabelText(/^nueva contraseña/i)).not.toBeInTheDocument();
  });

  it('tras recargar la misma pestaña (sin llaves en la dirección) sigue pudiendo terminar el cambio', async () => {
    sessionStorage.setItem(CLAVE_RECUPERACION, '1');
    renderRestablecer({});
    expect(await screen.findByLabelText(/^nueva contraseña/i)).toBeInTheDocument();
  });
});

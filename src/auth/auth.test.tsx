import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderConProviders } from '../test/render';
import { CambiarPasswordDialog } from './CambiarPasswordDialog';
import { traducirErrorPassword } from './AuthProvider';

const ADMIN = { roles: ['ADMINISTRADOR' as const] };

async function llenar(user: ReturnType<typeof userEvent.setup>, actual: string, nueva: string, repetir: string) {
  await user.type(screen.getByLabelText(/contraseña actual/i), actual);
  await user.type(screen.getByLabelText(/^nueva contraseña/i), nueva);
  await user.type(screen.getByLabelText(/repite la nueva/i), repetir);
  await user.click(screen.getByRole('button', { name: /^cambiar contraseña$/i }));
}

describe('Cambiar contraseña', () => {
  it('valida largo, coincidencia y que sea distinta, sin llamar a Supabase', async () => {
    const cambiarPassword = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderConProviders(<CambiarPasswordDialog open onOpenChange={() => {}} />, { ...ADMIN, auth: { cambiarPassword } });

    await llenar(user, 'Actual-123', 'corta', 'corta');
    expect(await screen.findByText('Usa al menos 8 caracteres')).toBeInTheDocument();

    await user.clear(screen.getByLabelText(/^nueva contraseña/i));
    await user.clear(screen.getByLabelText(/repite la nueva/i));
    await user.type(screen.getByLabelText(/^nueva contraseña/i), 'Casa-Verde-26');
    await user.type(screen.getByLabelText(/repite la nueva/i), 'Casa-Verde-27');
    await user.click(screen.getByRole('button', { name: /^cambiar contraseña$/i }));
    expect(await screen.findByText('Las contraseñas no coinciden')).toBeInTheDocument();

    await user.clear(screen.getByLabelText(/^nueva contraseña/i));
    await user.clear(screen.getByLabelText(/repite la nueva/i));
    await user.type(screen.getByLabelText(/^nueva contraseña/i), 'Actual-123');
    await user.type(screen.getByLabelText(/repite la nueva/i), 'Actual-123');
    await user.click(screen.getByRole('button', { name: /^cambiar contraseña$/i }));
    expect(await screen.findByText('La nueva contraseña debe ser distinta de la actual')).toBeInTheDocument();

    expect(cambiarPassword).not.toHaveBeenCalled();
  });

  it('envía la actual y la nueva, y cierra el diálogo al terminar', async () => {
    const cambiarPassword = vi.fn().mockResolvedValue(undefined);
    const onOpenChange = vi.fn();
    const user = userEvent.setup();
    renderConProviders(<CambiarPasswordDialog open onOpenChange={onOpenChange} />, { ...ADMIN, auth: { cambiarPassword } });

    await llenar(user, 'Actual-123', 'Casa-Verde-Lluvia-26', 'Casa-Verde-Lluvia-26');

    await waitFor(() => expect(cambiarPassword).toHaveBeenCalledWith('Actual-123', 'Casa-Verde-Lluvia-26'));
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });

  it('muestra el mensaje en lenguaje llano si Supabase rechaza el cambio, y no cierra', async () => {
    const cambiarPassword = vi.fn().mockRejectedValue(new Error('La contraseña actual no es correcta.'));
    const onOpenChange = vi.fn();
    const user = userEvent.setup();
    renderConProviders(<CambiarPasswordDialog open onOpenChange={onOpenChange} />, { ...ADMIN, auth: { cambiarPassword } });

    await llenar(user, 'mala', 'Casa-Verde-Lluvia-26', 'Casa-Verde-Lluvia-26');

    expect(await screen.findByRole('alert')).toHaveTextContent('La contraseña actual no es correcta.');
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });

  it('permite ver lo que se escribe para comprobar una frase', async () => {
    const user = userEvent.setup();
    renderConProviders(<CambiarPasswordDialog open onOpenChange={() => {}} />, ADMIN);

    const nueva = screen.getByLabelText(/^nueva contraseña/i);
    expect(nueva).toHaveAttribute('type', 'password');
    await user.click(screen.getByLabelText(/mostrar las contraseñas/i));
    expect(nueva).toHaveAttribute('type', 'text');
  });
});

describe('traducirErrorPassword', () => {
  it('explica cada caso sin mostrar el texto técnico de Supabase', () => {
    expect(traducirErrorPassword({ message: 'Invalid login credentials' }, 'actual')).toBe('La contraseña actual no es correcta.');
    expect(traducirErrorPassword({ message: 'x', code: 'same_password' }, 'nueva')).toMatch(/distinta de la actual/);
    expect(traducirErrorPassword({ message: 'x', code: 'weak_password' }, 'nueva')).toMatch(/demasiado común o débil/);
    expect(traducirErrorPassword({ message: 'Password is known to be weak and easy to guess' }, 'nueva')).toMatch(/demasiado común o débil/);
    expect(traducirErrorPassword({ message: 'Password should be at least 6 characters' }, 'nueva')).toMatch(/demasiado corta/);
    expect(traducirErrorPassword({ message: 'something else' }, 'nueva')).toBe('No pudimos cambiar la contraseña. Inténtalo de nuevo.');
  });
});

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import { useAuth } from './useAuth';
import { Button } from '../shared/ui/button';
import { Input } from '../shared/ui/input';
import { Field } from '../shared/ui/field';
import { Card } from '../shared/ui/card';
import { DemoLegend } from '../shared/ui/domain/DemoLegend';
import { supabaseConfigurado } from '../shared/lib/supabase';
import { rutaInicial } from '../shared/utils/permissions';
import { LogoSeguroSimple } from '../app-shell/LogoSeguroSimple';

const esquema = z.object({
  email: z.string().trim().min(1, 'Escribe tu correo').email('Ese correo no parece válido'),
  password: z.string().min(1, 'Escribe tu contraseña'),
});
type Valores = z.infer<typeof esquema>;

/** Login (Ola 0). El CLIENTE normalmente se registra dentro del embudo; esta pantalla es para asesores, administradores y clientes que vuelven. */
export function LoginPage() {
  const { estado, roles, signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const from = (location.state as { from?: string } | null)?.from;

  const form = useForm<Valores>({ resolver: zodResolver(esquema), defaultValues: { email: '', password: '' } });

  if (estado === 'autenticado') return <Navigate to={from ?? rutaInicial(roles)} replace />;

  const onSubmit = form.handleSubmit(async (v) => {
    setErrorGeneral(null);
    try {
      const { roles: nuevos } = await signIn(v.email, v.password);
      navigate(from ?? rutaInicial(nuevos), { replace: true });
    } catch (e) {
      setErrorGeneral(e instanceof Error ? e.message : 'No pudimos iniciar sesión.');
    }
  });

  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <header className="flex h-16 items-center px-4 lg:px-6">
        <Link to="/" aria-label="Ir al inicio">
          <LogoSeguroSimple />
        </Link>
      </header>
      <main className="flex flex-1 items-start justify-center px-4 py-8">
        <Card elevated className="w-full max-w-md p-6 lg:p-8">
          <h1 className="text-h1 text-navy-700">Inicia sesión</h1>
          <p className="mb-6 mt-1 text-ink-soft">Asesores, administradores y clientes con cuenta.</p>

          {!supabaseConfigurado ? (
            <p role="alert" className="mb-4 rounded-lg bg-status-warning/15 p-3 text-small text-ink">
              Falta configurar <code className="font-mono">VITE_SUPABASE_URL</code> y{' '}
              <code className="font-mono">VITE_SUPABASE_ANON_KEY</code> en el archivo <code className="font-mono">.env</code>.
            </p>
          ) : null}

          <form onSubmit={onSubmit} noValidate>
            <Field label="Correo" error={form.formState.errors.email?.message} required>
              {(p) => <Input {...p} type="email" autoComplete="email" inputMode="email" {...form.register('email')} />}
            </Field>
            <Field label="Contraseña" error={form.formState.errors.password?.message} required>
              {(p) => <Input {...p} type="password" autoComplete="current-password" {...form.register('password')} />}
            </Field>

            {errorGeneral ? (
              <p role="alert" aria-live="polite" className="mb-4 rounded-lg bg-status-danger/8 p-3 text-small font-bold text-status-danger">
                {errorGeneral}
              </p>
            ) : null}

            <Button type="submit" size="lg" className="w-full" loading={form.formState.isSubmitting} disabled={!supabaseConfigurado}>
              <LogIn aria-hidden /> Entrar
            </Button>
          </form>

          <p className="mt-6 text-center text-small text-ink-soft">
            ¿Quieres asegurar tu auto?{' '}
            <Link to="/cotizar" className="font-bold text-brand-600 underline-offset-4 hover:underline">
              Cotiza en 1 minuto
            </Link>
          </p>
        </Card>
      </main>
      <DemoLegend />
    </div>
  );
}

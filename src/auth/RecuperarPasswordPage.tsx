import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import { Mail } from 'lucide-react';
import { useAuth } from './useAuth';
import { PaginaAuth } from './PaginaAuth';
import { Button } from '../shared/ui/button';
import { Input } from '../shared/ui/input';
import { Field } from '../shared/ui/field';

const esquema = z.object({
  email: z.string().trim().min(1, 'Escribe tu correo').email('Ese correo no parece válido'),
});
type Valores = z.infer<typeof esquema>;

/** `/recuperar`: pide el correo y manda el enlace. La respuesta es la misma exista o no la cuenta. */
export function RecuperarPasswordPage() {
  const { enviarRecuperacion } = useAuth();
  const [enviadoA, setEnviadoA] = useState<string | null>(null);
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const form = useForm<Valores>({ resolver: zodResolver(esquema), defaultValues: { email: '' } });

  const onSubmit = form.handleSubmit(async (v) => {
    setErrorGeneral(null);
    try {
      await enviarRecuperacion(v.email);
      setEnviadoA(v.email);
    } catch (e) {
      setErrorGeneral(e instanceof Error ? e.message : 'No pudimos enviar el enlace.');
    }
  });

  if (enviadoA) {
    return (
      <PaginaAuth titulo="Revisa tu correo">
        <p role="status" className="text-ink">
          Si <strong className="break-all">{enviadoA}</strong> tiene una cuenta, te enviamos un enlace para crear una contraseña nueva.
        </p>
        <p className="mt-3 text-small text-ink-soft">
          El enlace vence en poco tiempo y sirve una sola vez. Si no lo ves, mira en spam o correo no deseado.
        </p>
        <Button asChild variant="outlineNavy" size="lg" className="mt-6 w-full">
          <Link to="/login">Volver a iniciar sesión</Link>
        </Button>
      </PaginaAuth>
    );
  }

  return (
    <PaginaAuth titulo="¿Olvidaste tu contraseña?" descripcion="Escribe tu correo y te enviamos un enlace para crear una nueva.">
      <form onSubmit={onSubmit} noValidate>
        <Field label="Correo" error={form.formState.errors.email?.message} required>
          {(p) => <Input {...p} type="email" autoComplete="email" inputMode="email" {...form.register('email')} />}
        </Field>

        {errorGeneral ? (
          <p role="alert" aria-live="polite" className="mb-4 rounded-lg bg-status-danger/8 p-3 text-small font-bold text-status-danger">
            {errorGeneral}
          </p>
        ) : null}

        <Button type="submit" size="lg" className="w-full" loading={form.formState.isSubmitting}>
          <Mail aria-hidden /> Enviarme el enlace
        </Button>
      </form>
      <p className="mt-6 text-center text-small text-ink-soft">
        <Link to="/login" className="font-bold text-brand-600 underline-offset-4 hover:underline">
          Volver a iniciar sesión
        </Link>
      </p>
    </PaginaAuth>
  );
}

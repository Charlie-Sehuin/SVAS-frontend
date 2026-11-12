import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useLocation } from 'react-router-dom';
import { z } from 'zod';
import { isApiError } from '../shared/lib/api-client';
import { aplicarErroresBackend } from '../shared/lib/forms';
import { useContactoPrevioStore } from '../shared/stores/useContactoPrevioStore';
import { useCotizacionTokenStore } from '../shared/stores/useCotizacionTokenStore';
import { Button } from '../shared/ui/button';
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../shared/ui/dialog';
import { Field } from '../shared/ui/field';
import { Input } from '../shared/ui/input';
import { SuccessToast } from '../shared/ui/domain/toasts';
import { registrarCliente } from './auth.api';
import { useAuth } from './useAuth';

const esquema = z.object({
  nombres: z.string().trim().min(2, 'Ingresa tus nombres').max(79, 'Los nombres no pueden pasar de 79 caracteres'),
  apellidos: z.string().trim().min(2, 'Ingresa tus apellidos').max(79, 'Los apellidos no pueden pasar de 79 caracteres'),
  telefono: z
    .string()
    .transform((v) => v.replace(/[\s-]/g, ''))
    .pipe(z.string().regex(/^9\d{8}$/, 'Ingresa un celular de 9 dígitos que empiece con 9')),
  email: z.string().trim().min(1, 'Ingresa tu correo').email('Ingresa un correo válido').max(254, 'El correo es demasiado largo'),
  password: z.string().min(8, 'Usa al menos 8 caracteres').max(72, 'Usa como máximo 72 caracteres'),
});
type Valores = z.input<typeof esquema>;
const CAMPOS = ['nombres', 'apellidos', 'telefono', 'email', 'password'] as const;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Cotización anónima que se vincula a la cuenta nueva (con su token, que ya está guardado en la pestaña). */
  cotizacionId?: string | undefined;
  /** Se llama cuando la cuenta ya está creada y la sesión iniciada. */
  onRegistrado?: () => void;
}

/**
 * Registro mínimo dentro del embudo (CU-02, arquitectura §6.4): aparece al comprar y NO saca a la persona de allí.
 * Como ya escribió su contacto al cotizar, viene prellenado y solo falta la contraseña. Crea la cuenta (siempre
 * CLIENTE), vincula la cotización por su token e inicia sesión.
 */
export function RegistroMinimoDialog({ open, onOpenChange, cotizacionId, onRegistrado }: Props) {
  const { signIn } = useAuth();
  const location = useLocation();
  const previo = useContactoPrevioStore((s) => s.contacto);
  const [mostrar, setMostrar] = useState(false);
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  /** La cuenta ya existe pero no se pudo iniciar sesión: hay que ofrecer el inicio de sesión, no volver a registrar. */
  const [cuentaCreada, setCuentaCreada] = useState(false);

  const form = useForm<Valores>({
    resolver: zodResolver(esquema),
    defaultValues: {
      nombres: previo?.nombres ?? '',
      apellidos: previo?.apellidos ?? '',
      telefono: previo?.telefono ?? '',
      email: previo?.email ?? '',
      password: '',
    },
  });
  const { errors, isSubmitting } = form.formState;
  const retorno = location.pathname + location.search;

  const cerrar = (o: boolean) => {
    if (isSubmitting) return;
    onOpenChange(o);
  };

  const onSubmit = form.handleSubmit(async (v) => {
    setErrorGeneral(null);
    const email = v.email.trim().toLowerCase();
    const telefono = v.telefono.replace(/[\s-]/g, '');
    const token = cotizacionId ? useCotizacionTokenStore.getState().obtener(cotizacionId) : null;

    try {
      await registrarCliente(
        {
          nombres: v.nombres.trim(),
          apellidos: v.apellidos.trim(),
          email,
          password: v.password,
          telefono,
          // Sin el token no se puede reclamar la cotización (el backend lo exige): se crea la cuenta sin vincularla.
          ...(cotizacionId && token ? { cotizacionId } : {}),
        },
        token,
      );
    } catch (e) {
      if (isApiError(e) && e.statusCode === 409) {
        form.setError('email', { type: 'server', message: e.message });
      } else if (!aplicarErroresBackend(e, form.setError, CAMPOS)) {
        setErrorGeneral(e instanceof Error ? e.message : 'No pudimos crear tu cuenta. Inténtalo de nuevo.');
      }
      return;
    }

    // La cuenta ya existe: iniciar sesión con las mismas credenciales (el token ya trae el rol CLIENTE).
    try {
      await signIn(email, v.password);
    } catch {
      setCuentaCreada(true);
      setErrorGeneral('Tu cuenta se creó, pero no pudimos iniciar sesión. Entra con tu correo y tu contraseña.');
      return;
    }
    useContactoPrevioStore.getState().limpiar();
    SuccessToast('Cuenta creada', 'Ya puedes continuar con tu compra.');
    onOpenChange(false);
    onRegistrado?.();
  });

  const tipo = mostrar ? 'text' : 'password';
  const emailRepetido = errors.email?.type === 'server';

  return (
    <Dialog open={open} onOpenChange={cerrar}>
      <DialogContent>
        <form onSubmit={onSubmit} noValidate className="flex min-h-0 flex-1 flex-col">
          <DialogHeader>
            <DialogTitle>Crea tu cuenta para comprar</DialogTitle>
            <DialogDescription>
              Es rápido y no sales de aquí: ya tenemos los datos de tu cotización. Solo falta que elijas una contraseña.
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="grid gap-x-4 sm:grid-cols-2">
              <Field label="Nombres" required error={errors.nombres?.message}>
                {(p) => <Input {...p} autoComplete="given-name" {...form.register('nombres')} />}
              </Field>
              <Field label="Apellidos" required error={errors.apellidos?.message}>
                {(p) => <Input {...p} autoComplete="family-name" {...form.register('apellidos')} />}
              </Field>
            </div>

            <Field label="Celular" required error={errors.telefono?.message} help="9 dígitos, empieza con 9.">
              {(p) => (
                <div className="flex">
                  <span aria-hidden className="flex h-12 items-center rounded-l-lg border border-r-0 border-line bg-surface-muted px-3 text-ink-soft">
                    +51
                  </span>
                  <Input
                    {...p}
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel-national"
                    maxLength={11}
                    className="rounded-l-none"
                    {...form.register('telefono')}
                  />
                </div>
              )}
            </Field>

            <Field label="Correo electrónico" required error={errors.email?.message}>
              {(p) => <Input {...p} type="email" inputMode="email" autoComplete="email" {...form.register('email')} />}
            </Field>
            {emailRepetido ? (
              <p className="-mt-2 mb-4 text-small text-ink">
                ¿Ya es tu cuenta?{' '}
                <Link to="/login" state={{ from: retorno }} className="font-bold text-brand-600 underline-offset-4 hover:underline">
                  Inicia sesión
                </Link>
              </p>
            ) : null}

            <Field
              label="Contraseña"
              required
              error={errors.password?.message}
              help="Elige una frase fácil de recordar: tres o cuatro palabras y un número, por ejemplo Casa-Verde-Lluvia-26. Mínimo 8 caracteres."
            >
              {(p) => <Input {...p} type={tipo} autoComplete="new-password" {...form.register('password')} />}
            </Field>
            <label className="mb-2 flex min-h-11 cursor-pointer items-center gap-2 text-small text-ink">
              <input
                type="checkbox"
                checked={mostrar}
                onChange={(e) => setMostrar(e.target.checked)}
                className="size-5 accent-[var(--color-brand-500)]"
              />
              Mostrar la contraseña
            </label>

            {errorGeneral ? (
              <div role="alert" aria-live="polite" className="rounded-lg bg-status-danger/10 p-3 text-small font-bold text-status-danger">
                <p>{errorGeneral}</p>
                {cuentaCreada ? (
                  <Link to="/login" state={{ from: retorno }} className="mt-1 inline-block text-brand-600 underline-offset-4 hover:underline">
                    Ir a iniciar sesión
                  </Link>
                ) : null}
              </div>
            ) : null}
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outlineNavy" onClick={() => cerrar(false)} disabled={isSubmitting}>
              Ahora no
            </Button>
            <Button type="submit" loading={isSubmitting} loadingText="Creando tu cuenta…" disabled={cuentaCreada}>
              Crear mi cuenta
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

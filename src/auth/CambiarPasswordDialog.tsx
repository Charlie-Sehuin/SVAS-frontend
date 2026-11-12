import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '../shared/ui/button';
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../shared/ui/dialog';
import { Field } from '../shared/ui/field';
import { Input } from '../shared/ui/input';
import { SuccessToast } from '../shared/ui/domain/toasts';
import { useAuth } from './useAuth';

/** Mínimo 8 (lo que exige el backend al crear cuentas) y máximo 72 (límite de bcrypt en Supabase). */
const MIN = 8;
const MAX = 72;

const esquema = z
  .object({
    actual: z.string().min(1, 'Escribe tu contraseña actual'),
    nueva: z
      .string()
      .min(MIN, `Usa al menos ${MIN} caracteres`)
      .max(MAX, `Usa como máximo ${MAX} caracteres`),
    repetir: z.string().min(1, 'Repite la nueva contraseña'),
  })
  .refine((v) => v.nueva === v.repetir, { path: ['repetir'], message: 'Las contraseñas no coinciden' })
  .refine((v) => v.nueva !== v.actual, { path: ['nueva'], message: 'La nueva contraseña debe ser distinta de la actual' });
type Valores = z.infer<typeof esquema>;

/**
 * Cambiar la contraseña propia (cualquier rol). Sirve para reemplazar la temporal que entrega el alta de un
 * usuario interno y para que el administrador ponga una contraseña que pueda recordar.
 */
export function CambiarPasswordDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { cambiarPassword } = useAuth();
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [mostrar, setMostrar] = useState(false);
  const form = useForm<Valores>({ resolver: zodResolver(esquema), defaultValues: { actual: '', nueva: '', repetir: '' } });
  const { errors, isSubmitting } = form.formState;
  const tipo = mostrar ? 'text' : 'password';

  const cerrar = (o: boolean) => {
    if (isSubmitting) return;
    onOpenChange(o);
    if (!o) {
      form.reset();
      setErrorGeneral(null);
      setMostrar(false);
    }
  };

  const onSubmit = form.handleSubmit(async (v) => {
    setErrorGeneral(null);
    try {
      await cambiarPassword(v.actual, v.nueva);
      SuccessToast('Contraseña actualizada', 'Úsala la próxima vez que inicies sesión.');
      cerrar(false);
    } catch (e) {
      setErrorGeneral(e instanceof Error ? e.message : 'No pudimos cambiar la contraseña.');
    }
  });

  return (
    <Dialog open={open} onOpenChange={cerrar}>
      <DialogContent size="sm">
        <form onSubmit={onSubmit} noValidate className="flex min-h-0 flex-1 flex-col">
          <DialogHeader>
            <DialogTitle>Cambiar contraseña</DialogTitle>
            <DialogDescription>
              Elige una frase fácil de recordar: tres o cuatro palabras y un número, por ejemplo <strong>Casa-Verde-Lluvia-26</strong>.
              Mínimo {MIN} caracteres.
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <Field label="Contraseña actual" error={errors.actual?.message} required>
              {(p) => <Input {...p} type={tipo} autoComplete="current-password" {...form.register('actual')} />}
            </Field>
            <Field label="Nueva contraseña" error={errors.nueva?.message} required>
              {(p) => <Input {...p} type={tipo} autoComplete="new-password" {...form.register('nueva')} />}
            </Field>
            <Field label="Repite la nueva contraseña" error={errors.repetir?.message} required>
              {(p) => <Input {...p} type={tipo} autoComplete="new-password" {...form.register('repetir')} />}
            </Field>

            <label className="mb-2 flex min-h-11 cursor-pointer items-center gap-2 text-small text-ink">
              <input
                type="checkbox"
                checked={mostrar}
                onChange={(e) => setMostrar(e.target.checked)}
                className="size-5 accent-[var(--color-brand-500)]"
              />
              Mostrar las contraseñas
            </label>

            {errorGeneral ? (
              <p role="alert" aria-live="polite" className="rounded-lg bg-status-danger/10 p-3 text-small font-bold text-status-danger">
                {errorGeneral}
              </p>
            ) : null}
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outlineNavy" onClick={() => cerrar(false)} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" loading={isSubmitting}>
              Cambiar contraseña
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

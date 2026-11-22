import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { KeyRound } from 'lucide-react';
import { useAuth } from './useAuth';
import { PaginaAuth } from './PaginaAuth';
import { Button } from '../shared/ui/button';
import { Input } from '../shared/ui/input';
import { Field } from '../shared/ui/field';
import { Skeleton } from '../shared/ui/skeleton';
import { SuccessToast } from '../shared/ui/domain/toasts';
import { rutaInicial } from '../shared/utils/permissions';

/** Mismos límites que al cambiarla desde la cuenta: mínimo 8 y máximo 72 (bcrypt). */
const MIN = 8;
const MAX = 72;

const esquema = z
  .object({
    nueva: z.string().min(MIN, `Usa al menos ${MIN} caracteres`).max(MAX, `Usa como máximo ${MAX} caracteres`),
    repetir: z.string().min(1, 'Repite la nueva contraseña'),
  })
  .refine((v) => v.nueva === v.repetir, { path: ['repetir'], message: 'Las contraseñas no coinciden' });
type Valores = z.infer<typeof esquema>;

/**
 * Marca de que ESTA pestaña abrió un enlace de recuperación. Sin ella, quien llegue a `/restablecer` con una sesión
 * normal abierta no puede cambiar la contraseña sin saber la actual: eso se hace desde su cuenta.
 */
export const CLAVE_RECUPERACION = 'svas.recuperacion';
const leerMarca = () => {
  try {
    return sessionStorage.getItem(CLAVE_RECUPERACION) === '1';
  } catch {
    return false;
  }
};
const guardarMarca = (valor: boolean) => {
  try {
    if (valor) sessionStorage.setItem(CLAVE_RECUPERACION, '1');
    else sessionStorage.removeItem(CLAVE_RECUPERACION);
  } catch {
    /* sin almacenamiento: la pantalla funciona igual dentro de esta carga */
  }
};

type Fase = 'abriendo' | 'lista' | 'vencida' | 'invalida';

/** `/restablecer`: destino del enlace del correo. Abre la sesión de recuperación y pide la contraseña nueva. */
export function RestablecerPasswordPage() {
  const { abrirRecuperacion, restablecerPassword, roles } = useAuth();
  const navigate = useNavigate();
  const [fase, setFase] = useState<Fase>('abriendo');
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [mostrar, setMostrar] = useState(false);
  const iniciado = useRef(false);
  const form = useForm<Valores>({ resolver: zodResolver(esquema), defaultValues: { nueva: '', repetir: '' } });

  useEffect(() => {
    // El enlace trae las llaves en la dirección y solo sirve una vez: se leen una sola vez aunque React monte dos veces.
    if (iniciado.current) return;
    iniciado.current = true;
    const hash = window.location.hash;
    if (!hash) {
      setFase(leerMarca() ? 'lista' : 'invalida');
      return;
    }
    void abrirRecuperacion(hash)
      .then((r) => {
        // Las llaves salen de la barra de direcciones y del historial apenas se usan.
        window.history.replaceState(null, '', window.location.pathname);
        if (r === 'lista') guardarMarca(true);
        setFase(r);
      })
      .catch(() => setFase('invalida'));
  }, [abrirRecuperacion]);

  const onSubmit = form.handleSubmit(async (v) => {
    setErrorGeneral(null);
    try {
      await restablecerPassword(v.nueva);
      guardarMarca(false);
      SuccessToast('Contraseña actualizada', 'Ya puedes usarla para iniciar sesión.');
      navigate(rutaInicial(roles), { replace: true });
    } catch (e) {
      setErrorGeneral(e instanceof Error ? e.message : 'No pudimos cambiar la contraseña.');
    }
  });

  if (fase === 'abriendo') {
    return (
      <PaginaAuth titulo="Comprobando tu enlace…">
        <div aria-busy aria-label="Comprobando tu enlace" className="space-y-3">
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full" />
        </div>
      </PaginaAuth>
    );
  }

  if (fase !== 'lista') {
    return (
      <PaginaAuth titulo={fase === 'vencida' ? 'Este enlace ya no sirve' : 'No encontramos tu enlace'}>
        <p role="alert" className="text-ink">
          {fase === 'vencida'
            ? 'El enlace venció o ya se usó. Pide uno nuevo y ábrelo desde tu correo.'
            : 'Para crear una contraseña nueva, abre el enlace que te enviamos al correo o pide uno nuevo.'}
        </p>
        <Button asChild size="lg" className="mt-6 w-full">
          <Link to="/recuperar">Pedir un enlace nuevo</Link>
        </Button>
      </PaginaAuth>
    );
  }

  const tipo = mostrar ? 'text' : 'password';
  return (
    <PaginaAuth titulo="Crea tu contraseña nueva" descripcion="Elige una que puedas recordar, como tres palabras y un número.">
      <form onSubmit={onSubmit} noValidate>
        <Field label="Nueva contraseña" error={form.formState.errors.nueva?.message} help={`Entre ${MIN} y ${MAX} caracteres.`} required>
          {(p) => <Input {...p} type={tipo} autoComplete="new-password" {...form.register('nueva')} />}
        </Field>
        <Field label="Repite la nueva contraseña" error={form.formState.errors.repetir?.message} required>
          {(p) => <Input {...p} type={tipo} autoComplete="new-password" {...form.register('repetir')} />}
        </Field>
        <label className="mb-4 flex min-h-11 cursor-pointer items-center gap-2 text-small text-ink">
          <input
            type="checkbox"
            checked={mostrar}
            onChange={(e) => setMostrar(e.target.checked)}
            className="size-5 accent-[var(--color-brand-500)]"
          />
          Mostrar lo que escribo
        </label>

        {errorGeneral ? (
          <p role="alert" aria-live="polite" className="mb-4 rounded-lg bg-status-danger/8 p-3 text-small font-bold text-status-danger">
            {errorGeneral}
          </p>
        ) : null}

        <Button type="submit" size="lg" className="w-full" loading={form.formState.isSubmitting}>
          <KeyRound aria-hidden /> Guardar contraseña
        </Button>
      </form>
    </PaginaAuth>
  );
}

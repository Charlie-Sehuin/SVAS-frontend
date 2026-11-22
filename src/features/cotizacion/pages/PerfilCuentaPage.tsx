import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import { Save } from 'lucide-react';
import { useActualizarMiContacto, useAuth, useMiContacto } from '../../../auth/useAuth';
import { isApiError } from '../../../shared/lib/api-client';
import { Button } from '../../../shared/ui/button';
import { Card } from '../../../shared/ui/card';
import { Field } from '../../../shared/ui/field';
import { Input } from '../../../shared/ui/input';
import { Skeleton } from '../../../shared/ui/skeleton';
import { EstadoError, EstadoVacio } from '../../../shared/ui/domain/EstadoVacio';
import { ErrorToast, SuccessToast } from '../../../shared/ui/domain/toasts';
import type { CanalContacto } from '../../../shared/types/enums';
import { ContactChannelPicker } from '../components/ContactChannelPicker';
import { MiCuentaTabs } from './MisCotizacionesPage';

/** Celular peruano de 9 dígitos que empieza con 9, igual que el backend y el cotizador. */
const esquema = z.object({
  telefono: z
    .string()
    .transform((v) => v.replace(/[\s-]/g, ''))
    .pipe(z.string().regex(/^9\d{8}$/, 'Ingresa un celular de 9 dígitos que empiece con 9')),
  canal: z.enum(['LLAMADA', 'WHATSAPP'], { message: 'Elige cómo prefieres que te contactemos' }),
});
type Entrada = z.input<typeof esquema>;
type Salida = z.output<typeof esquema>;

/** Dato que no se edita: nombre y correo se muestran como texto, no como un campo bloqueado. */
function Dato({ etiqueta, valor, nota }: { etiqueta: string; valor: string; nota?: string }) {
  return (
    <div>
      <dt className="text-small text-ink-soft">{etiqueta}</dt>
      <dd className="break-words font-bold text-navy-700">{valor}</dd>
      {nota ? <p className="text-small text-ink-soft">{nota}</p> : null}
    </div>
  );
}

/**
 * `/mi-cuenta/perfil` (CLIENTE): el celular y el canal de contacto se pueden cambiar; nombre y correo se ven pero no
 * se editan (el correo es el usuario de login). Una cuenta sin ficha (aún no cotizó) no tiene qué editar.
 */
export function PerfilCuentaPage() {
  const { user } = useAuth();
  const { data, isLoading, isError, error, refetch } = useMiContacto();
  const actualizar = useActualizarMiContacto();
  const contacto = data?.contacto ?? null;

  const form = useForm<Entrada, unknown, Salida>({
    resolver: zodResolver(esquema),
    defaultValues: { telefono: '', canal: 'WHATSAPP' },
  });
  const { control, register, handleSubmit, reset, setError, formState } = form;

  // Al llegar (o cambiar) la ficha, el formulario parte de lo guardado: así "Guardar" solo se enciende con un cambio real.
  useEffect(() => {
    if (contacto) reset({ telefono: contacto.telefono, canal: contacto.canal });
  }, [contacto, reset]);

  const onSubmit = handleSubmit(async (v) => {
    try {
      const guardado = await actualizar.mutateAsync({
        ...(v.telefono !== contacto?.telefono ? { telefono: v.telefono } : {}),
        ...(v.canal !== contacto?.canal ? { canal: v.canal as CanalContacto } : {}),
      });
      reset({ telefono: guardado.contacto.telefono, canal: guardado.contacto.canal });
      SuccessToast('Datos actualizados', 'Usaremos estos datos para contactarte.');
    } catch (e) {
      // Los errores por campo del backend van bajo su campo; cualquier otro se muestra tal cual.
      const porCampo = isApiError(e) && e.esValidacion ? e.errors.filter((x) => x.campo === 'telefono' || x.campo === 'canal') : [];
      if (porCampo.length > 0) {
        for (const x of porCampo) setError(x.campo as 'telefono' | 'canal', { message: x.mensaje });
      } else {
        ErrorToast(e);
      }
    }
  });

  return (
    <section className="mx-auto max-w-3xl px-4 py-6 lg:py-10">
      <h1 className="mb-4 text-h1 text-navy-700">Mi cuenta</h1>
      <MiCuentaTabs />

      {isError ? (
        <EstadoError error={error} onRetry={() => void refetch()} />
      ) : isLoading ? (
        <div className="space-y-3" aria-busy aria-label="Cargando tus datos">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-56 w-full" />
        </div>
      ) : !contacto ? (
        <EstadoVacio
          titulo="Tus datos de contacto se guardan cuando cotizas tu primer seguro."
          accion={
            <Button asChild>
              <Link to="/cotizar">Cotizar ahora</Link>
            </Button>
          }
        />
      ) : (
        <>
          <Card className="p-4">
            <h2 className="mb-3 text-h2 text-navy-700">Tus datos</h2>
            <dl className="grid gap-4 sm:grid-cols-2">
              <Dato etiqueta="Nombre" valor={`${contacto.nombres} ${contacto.apellidos}`} />
              <Dato
                etiqueta="Correo"
                valor={contacto.email ?? user?.email ?? '—'}
                nota="Es tu usuario para iniciar sesión, por eso no se cambia desde aquí."
              />
            </dl>
          </Card>

          <Card className="mt-4 p-4">
            <h2 className="mb-3 text-h2 text-navy-700">Cómo contactarte</h2>
            <form onSubmit={onSubmit} noValidate>
              <Field label="Celular" error={formState.errors.telefono?.message} help="9 dígitos, empieza con 9." required>
                {(p) => <Input {...p} type="tel" inputMode="tel" autoComplete="tel-national" {...register('telefono')} />}
              </Field>

              <Controller
                control={control}
                name="canal"
                render={({ field }) => (
                  <ContactChannelPicker value={field.value} onChange={field.onChange} onBlur={field.onBlur} error={formState.errors.canal?.message} />
                )}
              />

              <Button type="submit" size="lg" className="w-full sm:w-auto" loading={actualizar.isPending} disabled={!formState.isDirty}>
                <Save aria-hidden /> Guardar cambios
              </Button>
            </form>
          </Card>
        </>
      )}
    </section>
  );
}

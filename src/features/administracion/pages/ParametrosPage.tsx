import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Save } from 'lucide-react';
import { aplicarErroresBackend } from '../../../shared/lib/forms';
import type { ParametrosComerciales } from '../../../shared/types/api';
import { Button } from '../../../shared/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../shared/ui/card';
import { Field } from '../../../shared/ui/field';
import { Input } from '../../../shared/ui/input';
import { Skeleton } from '../../../shared/ui/skeleton';
import { EstadoError } from '../../../shared/ui/domain/EstadoVacio';
import { PageHeader } from '../../../shared/ui/domain/PageHeader';
import { ErrorToast, SuccessToast } from '../../../shared/ui/domain/toasts';
import { useActualizarParametros, useParametros } from '../hooks/useAdmin';

/** Número con coma o punto decimal y un máximo de decimales. */
const decimal = (nombre: string, min: number, max: number, decimales: number) =>
  z
    .string()
    .trim()
    .min(1, `Escribe ${nombre}`)
    .transform((s) => s.replace(',', '.'))
    .refine((s) => /^\d+(\.\d+)?$/.test(s), `${nombre} debe ser un número`)
    .refine((s) => (s.split('.')[1]?.length ?? 0) <= decimales, `Hasta ${decimales} decimales`)
    .refine((s) => Number(s) >= min && Number(s) <= max, `Debe estar entre ${min} y ${max}`);

const entero = (nombre: string, min: number, max: number) =>
  z
    .string()
    .trim()
    .min(1, `Escribe ${nombre}`)
    .refine((s) => /^\d+$/.test(s), 'Debe ser un número entero')
    .refine((s) => Number(s) >= min && Number(s) <= max, `Debe estar entre ${min} y ${max}`);

const esquema = z
  .object({
    descuentoPrimeraCompra: decimal('el descuento de primera compra', 0.01, 100, 2),
    descuentoMaximo: decimal('el descuento máximo', 0.01, 100, 2),
    maxIntentos: entero('el máximo de intentos', 1, 20),
    diasSeguimiento: entero('los días de seguimiento', 1, 90),
    maxCuotas: entero('el máximo de cuotas', 1, 24),
    vigenciaEnlaceDias: entero('la vigencia del enlace', 1, 90),
    horasAbandono: entero('las horas de abandono', 1, 720),
    moneda: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z]{3}$/, 'Código ISO de 3 letras (p. ej. USD)'),
    tipoCambioReferencial: decimal('el tipo de cambio', 0.0001, 9999, 4),
  })
  // ck_parametros_descuentos (RN-07, RN-08): primera compra ≤ máximo.
  .refine((v) => Number(v.descuentoPrimeraCompra) <= Number(v.descuentoMaximo), {
    path: ['descuentoPrimeraCompra'],
    message: 'No puede superar el descuento máximo',
  });
type Entrada = z.input<typeof esquema>;
type Salida = z.output<typeof esquema>;

const CAMPOS = [
  'descuentoPrimeraCompra',
  'descuentoMaximo',
  'maxIntentos',
  'diasSeguimiento',
  'maxCuotas',
  'vigenciaEnlaceDias',
  'horasAbandono',
  'moneda',
  'tipoCambioReferencial',
] as const;

const aFormulario = (p: ParametrosComerciales): Entrada => ({
  descuentoPrimeraCompra: p.descuentoPrimeraCompra,
  descuentoMaximo: p.descuentoMaximo,
  maxIntentos: String(p.maxIntentos),
  diasSeguimiento: String(p.diasSeguimiento),
  maxCuotas: String(p.maxCuotas),
  vigenciaEnlaceDias: String(p.vigenciaEnlaceDias),
  horasAbandono: String(p.horasAbandono),
  moneda: p.moneda,
  tipoCambioReferencial: p.tipoCambioReferencial,
});

/** Parámetros comerciales (RN-07, RN-08, RN-10, RN-12, RN-38). Cada cambio queda en la bitácora. */
export function ParametrosPage() {
  const { data, isLoading, isError, error, refetch } = useParametros();
  const actualizar = useActualizarParametros();
  const form = useForm<Entrada, unknown, Salida>({ resolver: zodResolver(esquema) });
  const { errors, isDirty } = form.formState;

  useEffect(() => {
    if (data) form.reset(aFormulario(data));
  }, [data, form]);

  const onSubmit = form.handleSubmit((v) =>
    actualizar.mutate(
      {
        descuentoPrimeraCompra: Number(v.descuentoPrimeraCompra),
        descuentoMaximo: Number(v.descuentoMaximo),
        maxIntentos: Number(v.maxIntentos),
        diasSeguimiento: Number(v.diasSeguimiento),
        maxCuotas: Number(v.maxCuotas),
        vigenciaEnlaceDias: Number(v.vigenciaEnlaceDias),
        horasAbandono: Number(v.horasAbandono),
        moneda: v.moneda,
        tipoCambioReferencial: Number(v.tipoCambioReferencial),
      },
      {
        onSuccess: () => SuccessToast('Parámetros guardados'),
        onError: (e) => {
          if (!aplicarErroresBackend(e, form.setError, CAMPOS)) ErrorToast(e);
        },
      },
    ),
  );

  return (
    <>
      <PageHeader
        titulo="Parámetros comerciales"
        descripcion="Descuentos, intentos de contacto, cuotas y vigencias. Un cambio rige desde la siguiente operación; no altera lo ya contratado."
        accion={
          <Button type="submit" form="form-parametros" disabled={!isDirty} loading={actualizar.isPending}>
            <Save aria-hidden /> Guardar cambios
          </Button>
        }
      />

      {isError ? (
        <EstadoError error={error} onRetry={() => void refetch()} />
      ) : isLoading ? (
        <div className="space-y-4" aria-busy aria-label="Cargando parámetros">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : (
        <form id="form-parametros" onSubmit={onSubmit} noValidate className="grid max-w-4xl gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Descuentos</CardTitle>
              <CardDescription>En porcentaje, hasta 2 decimales.</CardDescription>
            </CardHeader>
            <CardContent>
              <Field label="Descuento de primera compra (%)" error={errors.descuentoPrimeraCompra?.message} help="RN-08. Se aplica solo." required>
                {(p) => <Input {...p} inputMode="decimal" {...form.register('descuentoPrimeraCompra')} />}
              </Field>
              <Field label="Descuento máximo que puede negociar un asesor (%)" error={errors.descuentoMaximo?.message} help="RN-07. Tope de la negociación." required>
                {(p) => <Input {...p} inputMode="decimal" {...form.register('descuentoMaximo')} />}
              </Field>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Seguimiento y retención</CardTitle>
              <CardDescription>Cuánto insistimos con un cliente que no concretó.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-x-4 sm:grid-cols-2">
                <Field label="Máximo de intentos" error={errors.maxIntentos?.message} help="RN-10" required>
                  {(p) => <Input {...p} inputMode="numeric" {...form.register('maxIntentos')} />}
                </Field>
                <Field label="Días de seguimiento" error={errors.diasSeguimiento?.message} required>
                  {(p) => <Input {...p} inputMode="numeric" {...form.register('diasSeguimiento')} />}
                </Field>
                <Field label="Vigencia del enlace (días)" error={errors.vigenciaEnlaceDias?.message} help="RN-12" required>
                  {(p) => <Input {...p} inputMode="numeric" {...form.register('vigenciaEnlaceDias')} />}
                </Field>
                <Field label="Horas para considerar abandono" error={errors.horasAbandono?.message} required>
                  {(p) => <Input {...p} inputMode="numeric" {...form.register('horasAbandono')} />}
                </Field>
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Pago y moneda</CardTitle>
              <CardDescription>El recargo por cuotas lo define cada aseguradora en sus tarifas.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-x-4 sm:grid-cols-3">
                <Field label="Máximo de cuotas" error={errors.maxCuotas?.message} required>
                  {(p) => <Input {...p} inputMode="numeric" {...form.register('maxCuotas')} />}
                </Field>
                <Field label="Moneda" error={errors.moneda?.message} help="Código de 3 letras." required>
                  {(p) => <Input {...p} autoComplete="off" maxLength={3} className="uppercase" {...form.register('moneda')} />}
                </Field>
                <Field label="Tipo de cambio referencial" error={errors.tipoCambioReferencial?.message} help="Hasta 4 decimales. Solo referencial." required>
                  {(p) => <Input {...p} inputMode="decimal" {...form.register('tipoCambioReferencial')} />}
                </Field>
              </div>
            </CardContent>
          </Card>
        </form>
      )}
    </>
  );
}

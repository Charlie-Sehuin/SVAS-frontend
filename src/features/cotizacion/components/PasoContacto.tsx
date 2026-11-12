import { Controller, useFormContext } from 'react-hook-form';
import { AlertCircle } from 'lucide-react';
import { Field } from '../../../shared/ui/field';
import { Input } from '../../../shared/ui/input';
import type { BorradorCotizar } from '../store/useCotizarWizardStore';
import { ContactChannelPicker } from './ContactChannelPicker';

/** Paso 3 · Contacto. El documento de identidad NO se pide aquí: se pide al comprar (RNF-08). */
export function PasoContacto() {
  const { register, control, formState } = useFormContext<BorradorCotizar>();
  const { errors } = formState;
  const e = errors.contacto;

  return (
    <>
      <div className="grid gap-x-4 sm:grid-cols-2">
        <Field label="Nombres" required error={e?.nombres?.message}>
          {(p) => <Input {...p} autoComplete="given-name" {...register('contacto.nombres')} />}
        </Field>
        <Field label="Apellidos" required error={e?.apellidos?.message}>
          {(p) => <Input {...p} autoComplete="family-name" {...register('contacto.apellidos')} />}
        </Field>
      </div>

      <Field label="Celular" required error={e?.telefono?.message} help="Te enviamos tus cotizaciones. 9 dígitos, empieza con 9.">
        {(p) => (
          <div className="flex">
            <span
              aria-hidden
              className="flex h-12 items-center rounded-l-lg border border-r-0 border-line bg-surface-muted px-3 text-ink-soft"
            >
              +51
            </span>
            <Input
              {...p}
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              maxLength={11}
              placeholder="987 654 321"
              className="rounded-l-none"
              {...register('contacto.telefono')}
            />
          </div>
        )}
      </Field>

      <Field label="Correo electrónico" required error={e?.email?.message}>
        {(p) => <Input {...p} type="email" inputMode="email" autoComplete="email" {...register('contacto.email')} />}
      </Field>

      <Controller
        control={control}
        name="contacto.canal"
        render={({ field }) => (
          <ContactChannelPicker
            value={field.value}
            onChange={field.onChange}
            onBlur={field.onBlur}
            error={e?.canal?.message}
          />
        )}
      />

      <div className="mb-2">
        <label className="flex min-h-11 cursor-pointer items-start gap-3 text-base text-ink">
          <input
            type="checkbox"
            className="mt-0.5 size-6 shrink-0 accent-[var(--color-brand-500)]"
            aria-invalid={e?.acepta ? true : undefined}
            aria-describedby={e?.acepta ? 'acepta-error' : undefined}
            {...register('contacto.acepta')}
          />
          <span>
            He leído y acepto los <strong>Términos y condiciones</strong> y la <strong>Política de privacidad</strong>.
          </span>
        </label>
        {e?.acepta ? (
          <p id="acepta-error" role="alert" className="mt-1 flex items-start gap-1.5 text-small text-status-danger">
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>{e.acepta.message}</span>
          </p>
        ) : null}
      </div>
    </>
  );
}

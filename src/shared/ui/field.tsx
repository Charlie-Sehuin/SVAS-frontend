import { useId, type ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import { Label } from './label';

interface FieldProps {
  label: string;
  /** Ayuda bajo el campo, 14 px, ink-soft (§7.2). */
  help?: string;
  /** Error en lenguaje llano: icono + texto en status-danger. */
  error?: string;
  required?: boolean;
  className?: string;
  /** Recibe `id`, `aria-describedby` y `aria-invalid` para el control. */
  children: (props: { id: string; 'aria-describedby': string | undefined; 'aria-invalid': boolean | undefined }) => ReactNode;
}

/** Envoltorio de campo accesible: etiqueta asociada, ayuda y error vinculados con aria-describedby (§13). */
export function Field({ label, help, error, required, className, children }: FieldProps) {
  const id = useId();
  const helpId = help ? `${id}-help` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [errorId, helpId].filter(Boolean).join(' ') || undefined;
  return (
    <div className={cn('mb-4', className)}>
      <Label htmlFor={id}>
        {label}
        {required ? <span aria-hidden className="ml-0.5 text-brand-600">*</span> : null}
      </Label>
      {children({ id, 'aria-describedby': describedBy, 'aria-invalid': error ? true : undefined })}
      {error ? (
        <p id={errorId} role="alert" className="mt-1.5 flex items-start gap-1.5 text-small text-status-danger">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>{error}</span>
        </p>
      ) : help ? (
        <p id={helpId} className="mt-1.5 text-small text-ink-soft">
          {help}
        </p>
      ) : null}
    </div>
  );
}

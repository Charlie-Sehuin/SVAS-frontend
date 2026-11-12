import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '../lib/utils';

/** Input del diseño visual §7.2: alto 48 en embudo, borde line, foco brand. */
export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }>(
  ({ className, type = 'text', invalid, ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      aria-invalid={invalid || undefined}
      className={cn(
        'flex h-12 w-full rounded-lg border bg-surface px-3 text-base text-ink placeholder:text-ink-soft/70',
        'transition-colors duration-150 focus:border-brand-500 focus-visible:outline-3 focus-visible:outline-offset-0 focus-visible:outline-brand-300',
        'disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-ink-soft',
        invalid ? 'border-status-danger' : 'border-line',
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = 'Input';

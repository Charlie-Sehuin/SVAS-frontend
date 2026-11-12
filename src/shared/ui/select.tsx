import { forwardRef, type SelectHTMLAttributes } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../lib/utils';

/**
 * Select nativo estilizado como el Input (alto 48, rounded-lg). Se usa nativo a
 * propósito: en móvil abre el selector del sistema, que es lo más cómodo y
 * accesible para marca → modelo → año (diseño visual §7.2).
 */
export const Select = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean; compact?: boolean }
>(({ className, invalid, compact, children, ...props }, ref) => (
  <div className="relative">
    <select
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(
        'w-full appearance-none rounded-lg border bg-surface pl-3 pr-10 text-base text-ink',
        compact ? 'h-10' : 'h-12',
        'transition-colors duration-150 focus:border-brand-500 focus-visible:outline-3 focus-visible:outline-offset-0 focus-visible:outline-brand-300',
        'disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-ink-soft',
        invalid ? 'border-status-danger' : 'border-line',
        className,
      )}
      {...props}
    >
      {children}
    </select>
    <ChevronDown aria-hidden className="pointer-events-none absolute right-3 top-1/2 size-5 -translate-y-1/2 text-ink-soft" />
  </div>
));
Select.displayName = 'Select';

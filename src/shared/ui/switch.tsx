import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '../lib/utils';

interface SwitchProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'> {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

/**
 * Interruptor accesible (role="switch"). Objetivo táctil de 44 px alrededor del
 * control visual. El estado NUNCA depende solo del color: la pista cambia de
 * posición y quien lo use debe acompañarlo con texto ("Activa" / "Inactiva").
 */
export const Switch = forwardRef<HTMLButtonElement, SwitchProps>(
  ({ checked, onCheckedChange, className, disabled, ...props }, ref) => (
    <button
      ref={ref}
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        'group inline-flex h-11 min-w-11 items-center justify-center rounded-lg disabled:cursor-not-allowed disabled:opacity-40',
        className,
      )}
      {...props}
    >
      <span
        aria-hidden
        className={cn(
          'relative inline-block h-6 w-11 rounded-full transition-colors duration-150',
          checked ? 'bg-status-success' : 'bg-status-neutral/60',
        )}
      >
        <span
          className={cn(
            'absolute left-0.5 top-0.5 size-5 rounded-full bg-white shadow transition-transform duration-150',
            checked && 'translate-x-5',
          )}
        />
      </span>
    </button>
  ),
);
Switch.displayName = 'Switch';

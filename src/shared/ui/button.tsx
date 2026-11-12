import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';

/**
 * Variantes del diseño visual §7.1. Regla: UN solo `primary` por pantalla.
 * `accent` (turquesa) solo para "Pon a prueba estos planes".
 */
const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-bold transition-colors duration-150 ease-out select-none ' +
    'disabled:pointer-events-none disabled:opacity-40 disabled:cursor-not-allowed ' +
    'focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand-300 ' +
    '[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg]:size-5',
  {
    variants: {
      variant: {
        primary: 'bg-brand-500 text-[var(--primary-foreground)] hover:bg-brand-600 active:bg-brand-600 shadow-none',
        accent: 'bg-accent-600 text-white hover:bg-accent-700',
        secondary: 'bg-surface border-[1.5px] border-brand-500 text-brand-600 hover:bg-brand-50',
        outlineNavy: 'bg-transparent border border-navy-700 text-navy-700 hover:bg-navy-50',
        ghost: 'bg-transparent text-navy-500 hover:bg-navy-50 hover:text-navy-700',
        destructive: 'bg-status-danger text-white hover:opacity-90',
        link: 'bg-transparent text-brand-600 underline-offset-4 hover:underline h-auto px-0 font-bold',
      },
      size: {
        /** 48 px: botón principal del embudo (§5). Ancho completo en móvil lo decide el padre. */
        lg: 'h-12 px-6 text-base min-w-[200px]',
        md: 'h-11 px-5 text-base',
        sm: 'h-9 px-3 text-small',
        icon: 'size-11',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  /** Muestra spinner y "Procesando…" sin cambiar el ancho (§7.1). */
  loading?: boolean;
  loadingText?: string;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading = false, loadingText = 'Procesando…', children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size }), loading && 'relative', className)}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading ? (
          <>
            <span className="invisible contents">{children}</span>
            <span className="absolute inset-0 flex items-center justify-center gap-2">
              <Loader2 className="animate-spin" aria-hidden />
              {loadingText}
            </span>
          </>
        ) : (
          children
        )}
      </Comp>
    );
  },
);
Button.displayName = 'Button';

export { buttonVariants };

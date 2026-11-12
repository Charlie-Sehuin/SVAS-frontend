import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '../lib/utils';

/** Card §7.3: surface, borde line, rounded-xl, sin sombra (nivel 0). `elevated` = nivel 1 (tarjeta del hero, plan seleccionado). */
export const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement> & { elevated?: boolean }>(
  ({ className, elevated, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'rounded-xl border border-line bg-surface text-ink',
        elevated && 'rounded-2xl border-transparent shadow-card',
        className,
      )}
      {...props}
    />
  ),
);
Card.displayName = 'Card';

export const CardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('flex flex-col gap-1 p-4 lg:p-6', className)} {...props} />
));
CardHeader.displayName = 'CardHeader';

export const CardTitle = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(({ className, ...props }, ref) => (
  <h3 ref={ref} className={cn('text-h3 text-navy-700', className)} {...props} />
));
CardTitle.displayName = 'CardTitle';

export const CardDescription = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => <p ref={ref} className={cn('text-small text-ink-soft', className)} {...props} />,
);
CardDescription.displayName = 'CardDescription';

export const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('p-4 pt-0 lg:p-6 lg:pt-0', className)} {...props} />
));
CardContent.displayName = 'CardContent';

export const CardFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('flex items-center gap-3 p-4 pt-0 lg:p-6 lg:pt-0', className)} {...props} />
));
CardFooter.displayName = 'CardFooter';

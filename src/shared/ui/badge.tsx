import type { HTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../lib/utils';

/** Píldora de 24 px: fondo suave del color (12 %), texto pleno, punto a la izquierda (§7.4). */
const badgeVariants = cva(
  'inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-caption normal-case tracking-normal font-bold whitespace-nowrap',
  {
    variants: {
      tone: {
        pending: 'bg-status-pending/12 text-status-pending',
        progress: 'bg-status-progress/12 text-status-progress',
        success: 'bg-status-success/12 text-status-success',
        danger: 'bg-status-danger/12 text-status-danger',
        neutral: 'bg-status-neutral/12 text-status-neutral',
        /* Advertencia: fondo ámbar suave con texto oscuro (status-pending cumple AA; §3.5). */
        warning: 'bg-status-warning/15 text-status-pending',
        info: 'bg-status-info/12 text-status-info',
        brand: 'bg-brand-50 text-brand-700',
        navy: 'bg-navy-50 text-navy-700',
        accent: 'bg-accent-50 text-accent-700',
      },
      dot: { true: 'before:size-1.5 before:rounded-full before:bg-current before:content-[""]', false: '' },
    },
    defaultVariants: { tone: 'neutral', dot: true },
  },
);

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, tone, dot, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone, dot }), className)} {...props} />;
}

export { badgeVariants };

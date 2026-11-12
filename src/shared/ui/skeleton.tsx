import type { HTMLAttributes } from 'react';
import { cn } from '../lib/utils';

/** Esqueleto con la forma final del contenido (§11.1), nunca spinner genérico a pantalla completa. */
export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div aria-hidden className={cn('animate-pulse rounded-lg bg-surface-muted', className)} {...props} />;
}

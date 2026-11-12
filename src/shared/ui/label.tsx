import { forwardRef, type ComponentPropsWithoutRef, type ElementRef } from 'react';
import * as LabelPrimitive from '@radix-ui/react-label';
import { cn } from '../lib/utils';

/** Etiqueta arriba, 14 px, 700, navy-700 (§7.2). Nunca placeholder como etiqueta. */
export const Label = forwardRef<ElementRef<typeof LabelPrimitive.Root>, ComponentPropsWithoutRef<typeof LabelPrimitive.Root>>(
  ({ className, ...props }, ref) => (
    <LabelPrimitive.Root
      ref={ref}
      className={cn('mb-1.5 block text-small font-bold text-navy-700 peer-disabled:opacity-60', className)}
      {...props}
    />
  ),
);
Label.displayName = 'Label';

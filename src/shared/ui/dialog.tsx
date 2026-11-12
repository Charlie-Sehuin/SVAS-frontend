import { forwardRef, type ComponentPropsWithoutRef, type ElementRef, type HTMLAttributes } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '../lib/utils';

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

const Overlay = forwardRef<ElementRef<typeof DialogPrimitive.Overlay>, ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>>(
  ({ className, ...props }, ref) => (
    <DialogPrimitive.Overlay ref={ref} className={cn('fixed inset-0 z-50 bg-navy-900/60', className)} {...props} />
  ),
);
Overlay.displayName = 'DialogOverlay';

/**
 * Diálogo (diseño visual §7.8): centrado en escritorio y hoja inferior en
 * móvil, esquinas superiores `rounded-2xl`, sombra nivel 2.
 */
export const DialogContent = forwardRef<
  ElementRef<typeof DialogPrimitive.Content>,
  ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & { size?: 'sm' | 'md' | 'lg' }
>(({ className, children, size = 'md', ...props }, ref) => (
  <DialogPrimitive.Portal>
    <Overlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        'fixed z-50 flex max-h-[92dvh] w-full flex-col bg-surface text-ink shadow-float focus:outline-none',
        'inset-x-0 bottom-0 rounded-t-2xl',
        'md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-2xl',
        size === 'sm' && 'md:max-w-md',
        size === 'md' && 'md:max-w-xl',
        size === 'lg' && 'md:max-w-3xl',
        className,
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close
        aria-label="Cerrar"
        className="absolute right-3 top-3 flex size-11 items-center justify-center rounded-lg text-ink-soft hover:bg-surface-muted hover:text-ink"
      >
        <X className="size-5" aria-hidden />
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
));
DialogContent.displayName = 'DialogContent';

export const DialogHeader = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex flex-col gap-1 p-4 pr-14 lg:p-6 lg:pr-16', className)} {...props} />
);

export const DialogBody = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex-1 overflow-y-auto px-4 pb-4 lg:px-6', className)} {...props} />
);

export const DialogFooter = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn('flex flex-col-reverse gap-2 border-t border-line p-4 sm:flex-row sm:justify-end lg:px-6', className)}
    {...props}
  />
);

export const DialogTitle = forwardRef<ElementRef<typeof DialogPrimitive.Title>, ComponentPropsWithoutRef<typeof DialogPrimitive.Title>>(
  ({ className, ...props }, ref) => <DialogPrimitive.Title ref={ref} className={cn('text-h2 text-navy-700', className)} {...props} />,
);
DialogTitle.displayName = 'DialogTitle';

export const DialogDescription = forwardRef<
  ElementRef<typeof DialogPrimitive.Description>,
  ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description ref={ref} className={cn('text-small text-ink-soft', className)} {...props} />
));
DialogDescription.displayName = 'DialogDescription';

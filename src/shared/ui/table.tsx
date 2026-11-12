import { forwardRef, type HTMLAttributes, type TdHTMLAttributes, type ThHTMLAttributes } from 'react';
import { cn } from '../lib/utils';

/** Tabla densa del backoffice (§10.1): filas de 44 px, scroll horizontal solo dentro del contenedor. */
export const Table = forwardRef<HTMLTableElement, HTMLAttributes<HTMLTableElement> & { caption?: string }>(
  ({ className, caption, children, ...props }, ref) => (
    <div className="w-full overflow-x-auto rounded-xl border border-line bg-surface">
      <table ref={ref} className={cn('w-full border-collapse text-small', className)} {...props}>
        {caption ? <caption className="sr-only">{caption}</caption> : null}
        {children}
      </table>
    </div>
  ),
);
Table.displayName = 'Table';

export const THead = (props: HTMLAttributes<HTMLTableSectionElement>) => <thead className="bg-surface-muted" {...props} />;
export const TBody = (props: HTMLAttributes<HTMLTableSectionElement>) => <tbody {...props} />;

export const TR = ({ className, ...props }: HTMLAttributes<HTMLTableRowElement>) => (
  <tr className={cn('h-11 border-t border-line first:border-t-0 hover:bg-brand-50/50', className)} {...props} />
);

export const TH = ({ className, ...props }: ThHTMLAttributes<HTMLTableCellElement>) => (
  <th
    scope="col"
    className={cn('whitespace-nowrap px-3 py-2 text-left text-caption text-ink-soft first:pl-4 last:pr-4', className)}
    {...props}
  />
);

export const TD = ({ className, ...props }: TdHTMLAttributes<HTMLTableCellElement>) => (
  <td className={cn('px-3 py-2 align-middle first:pl-4 last:pr-4', className)} {...props} />
);

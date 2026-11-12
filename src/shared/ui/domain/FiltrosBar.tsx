import type { ReactNode } from 'react';

/** Barra de filtros sobre las tablas (§10.1). Cada hijo es un control con su etiqueta visible. */
export function FiltrosBar({ children }: { children: ReactNode }) {
  return (
    <div role="search" className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-line bg-surface p-3">
      {children}
    </div>
  );
}

export function Filtro({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <label className={`flex min-w-40 flex-col gap-1 ${className ?? ''}`}>
      <span className="text-small font-bold text-navy-700">{label}</span>
      {children}
    </label>
  );
}

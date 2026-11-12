import type { ReactNode } from 'react';

/** Encabezado de pantalla del backoffice (§10.1): h1 de 20/28, descripción y UNA acción principal a la derecha. */
export function PageHeader({
  titulo,
  descripcion,
  accion,
}: {
  titulo: string;
  descripcion?: ReactNode;
  accion?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-bo-h1 text-navy-700">{titulo}</h1>
        {descripcion ? <p className="mt-1 max-w-3xl text-small text-ink-soft">{descripcion}</p> : null}
      </div>
      {accion ? <div className="flex shrink-0 items-center gap-2">{accion}</div> : null}
    </div>
  );
}

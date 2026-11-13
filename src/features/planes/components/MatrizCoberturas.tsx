import { Check, X } from 'lucide-react';
import { cn } from '../../../shared/lib/utils';
import type { ComparacionPlanes } from '../../../shared/types/api';

/**
 * Cobertura × plan (diseño §8.6, máx. 3). Cada celda lleva el icono Y el texto "Incluida" / "No incluida" (visible o para
 * lector de pantalla), nunca solo el icono. En móvil la primera columna queda fija y el resto se desplaza.
 */
export function MatrizCoberturas({ comparacion }: { comparacion: ComparacionPlanes }) {
  const { planes, filas } = comparacion;
  return (
    <div className="overflow-x-auto rounded-xl border border-line bg-surface">
      <table className="w-full min-w-[520px] border-collapse text-left">
        <caption className="sr-only">Qué cubre cada plan, cobertura por cobertura</caption>
        <thead className="sticky top-0 bg-surface">
          <tr className="border-b border-line">
            <th scope="col" className="sticky left-0 z-20 w-40 border-r border-line bg-surface p-3 text-small text-ink-soft sm:w-56">
              Cobertura
            </th>
            {planes.map((p) => (
              <th key={p.planId} scope="col" className="p-3 align-bottom">
                <span className="block text-caption font-normal text-ink-soft">{p.aseguradora}</span>
                <span className="block font-bold text-navy-700">Plan {p.plan}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filas.map((f) => (
            <tr key={f.codigo} className="group/fila border-b border-line transition-colors last:border-0 hover:bg-brand-50">
              <th
                scope="row"
                className="sticky left-0 z-10 w-40 border-r border-line bg-surface p-3 align-top font-bold text-navy-700 transition-colors group-hover/fila:bg-brand-50 sm:w-56"
              >
                {f.nombre}
              </th>
              {f.valores.map((v, i) => (
                <td key={planes[i]?.planId ?? i} className="p-3 align-top">
                  <span className={cn('flex items-center gap-1.5 font-bold', v.incluida ? 'text-status-success' : 'text-ink-soft')}>
                    {v.incluida ? <Check className="size-4 shrink-0" aria-hidden /> : <X className="size-4 shrink-0" aria-hidden />}
                    {v.incluida ? 'Incluida' : 'No incluida'}
                  </span>
                  {v.detalle ? <span className="mt-0.5 block text-small text-ink-soft">{v.detalle}</span> : null}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

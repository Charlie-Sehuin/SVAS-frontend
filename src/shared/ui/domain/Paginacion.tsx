import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../button';

/** Paginación de listas del backoffice. Muestra el rango en texto ("21–40 de 87"). */
export function Paginacion({
  pagina,
  tamano,
  total,
  onChange,
}: {
  pagina: number;
  tamano: number;
  total: number;
  onChange: (pagina: number) => void;
}) {
  const ultima = Math.max(1, Math.ceil(total / tamano));
  const desde = total === 0 ? 0 : (pagina - 1) * tamano + 1;
  const hasta = Math.min(total, pagina * tamano);
  return (
    <nav aria-label="Paginación" className="mt-3 flex items-center justify-between gap-3 text-small text-ink-soft">
      <p aria-live="polite">
        {desde}–{hasta} de {total}
      </p>
      <div className="flex items-center gap-2">
        <Button variant="outlineNavy" size="sm" disabled={pagina <= 1} onClick={() => onChange(pagina - 1)}>
          <ChevronLeft aria-hidden /> Anterior
        </Button>
        <span className="tabular">
          {pagina} / {ultima}
        </span>
        <Button variant="outlineNavy" size="sm" disabled={pagina >= ultima} onClick={() => onChange(pagina + 1)}>
          Siguiente <ChevronRight aria-hidden />
        </Button>
      </div>
    </nav>
  );
}

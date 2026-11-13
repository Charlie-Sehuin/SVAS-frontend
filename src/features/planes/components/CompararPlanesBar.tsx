import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { Button } from '../../../shared/ui/button';
import { MAXIMO_COMPARAR, useCompararPlanesStore } from '../store/useCompararPlanesStore';

/**
 * Barra fija abajo con los planes marcados en "Comparar" (diseño §9.3). Con menos de 2 el botón está deshabilitado y
 * dice por qué. "Comparar planes" abre `/comparar?ids=…`, una dirección que se puede compartir.
 */
export function CompararPlanesBar() {
  const navigate = useNavigate();
  const { planes, quitar, limpiar } = useCompararPlanesStore();
  if (planes.length === 0) return null;
  const faltan = planes.length < 2;

  return (
    <div
      role="region"
      aria-label="Comparar planes"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface px-4 py-3 shadow-float"
    >
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-x-4 gap-y-2">
        <p className="font-bold text-navy-700">
          Comparar ({planes.length} de {MAXIMO_COMPARAR})
        </p>
        <ul className="flex flex-1 flex-wrap gap-2">
          {planes.map((p) => (
            <li key={p.planId} className="flex items-center gap-1 rounded-full bg-navy-50 py-1 pl-3 pr-1 text-small text-navy-700">
              {p.etiqueta}
              <button
                type="button"
                onClick={() => quitar(p.planId)}
                aria-label={`Quitar ${p.etiqueta} de la comparación`}
                className="flex size-8 items-center justify-center rounded-full hover:bg-navy-100"
              >
                <X className="size-4" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
        {faltan ? <p className="text-small text-ink-soft">Elige al menos 2 planes para comparar.</p> : null}
        <Button variant="ghost" size="sm" onClick={limpiar}>
          Limpiar
        </Button>
        <Button
          disabled={faltan}
          onClick={() => navigate(`/comparar?ids=${planes.map((p) => p.planId).join(',')}`)}
        >
          Comparar planes
        </Button>
      </div>
    </div>
  );
}

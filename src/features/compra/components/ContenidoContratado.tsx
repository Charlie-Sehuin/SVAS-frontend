import { Check, X } from 'lucide-react';
import { formatearFecha } from '../../../shared/lib/format';
import type { ContenidoPlanContratado } from '../../../shared/types/api';

/** RN-46: todo contenido de planes lleva esta leyenda. */
export const LEYENDA_CONTENIDO = 'Contenido ilustrativo; no es el condicionado de la aseguradora.';

/**
 * Lo que la persona contrató, tal como se congeló al comprar (RN-45). El frontend no ordena ni deduce: pinta lo que
 * llega. "No cubre" = las coberturas con `incluida: false` más las exclusiones (doc conexión §6).
 */
export function ContenidoContratado({ contenido }: { contenido: ContenidoPlanContratado }) {
  const cubre = contenido.coberturas.filter((c) => c.incluida);
  const noCubre = contenido.coberturas.filter((c) => !c.incluida);

  return (
    <div className="space-y-4">
      <p className="text-small text-ink-soft">
        Este es el contenido del plan que contrataste el {formatearFecha(contenido.congeladoEn, 'larga')}.
      </p>
      {contenido.descripcion ? <p className="text-ink">{contenido.descripcion}</p> : null}

      <section aria-label="Qué cubre">
        <h4 className="mb-2 font-bold text-navy-700">Qué cubre</h4>
        {cubre.length === 0 ? (
          <p className="text-small text-ink-soft">Este plan no tiene coberturas cargadas.</p>
        ) : (
          <ul className="space-y-1.5">
            {cubre.map((c) => (
              <li key={c.codigo} className="flex items-start gap-2">
                <Check className="mt-0.5 size-4 shrink-0 text-status-success" aria-hidden />
                <span>
                  <span className="sr-only">Incluida: </span>
                  {c.nombre}
                  {c.detalle ? <span className="text-ink-soft"> · {c.detalle}</span> : null}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {noCubre.length > 0 || contenido.exclusiones.length > 0 ? (
        <section aria-label="Qué no cubre">
          <h4 className="mb-2 font-bold text-navy-700">Qué no cubre</h4>
          <ul className="space-y-1.5">
            {noCubre.map((c) => (
              <li key={c.codigo} className="flex items-start gap-2">
                <X className="mt-0.5 size-4 shrink-0 text-ink-soft" aria-hidden />
                <span>
                  <span className="sr-only">No incluida: </span>
                  {c.nombre}
                </span>
              </li>
            ))}
            {contenido.exclusiones.map((e) => (
              <li key={e} className="flex items-start gap-2">
                <X className="mt-0.5 size-4 shrink-0 text-ink-soft" aria-hidden />
                <span>{e}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {contenido.requisitos.length > 0 ? (
        <section aria-label="Requisitos">
          <h4 className="mb-2 font-bold text-navy-700">Requisitos</h4>
          <ul className="list-disc space-y-1 pl-5">
            {contenido.requisitos.map((r) => (
              <li key={r.texto}>{r.texto}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <p className="text-caption text-ink-soft">{LEYENDA_CONTENIDO}</p>
    </div>
  );
}

import { cn } from '../../../../shared/lib/utils';

/**
 * Contador de intentos de contacto (diseño §8.8, RN-10): el texto dice todo ("Intento 2 de 4 · quedan 5 días") y los
 * puntos lo repiten visualmente (llenos = intentos usados). El texto del límite lo calcula el llamador con lo que
 * manda el backend (`maxIntentos`, `diasSeguimiento`).
 */
export function AttemptCounter({ intentos, maximo, diasRestantes }: { intentos: number; maximo: number; diasRestantes: number }) {
  return (
    <div>
      <p className="font-bold text-navy-700">
        Intentos: {intentos} de {maximo}
        <span className="font-normal text-ink-soft">
          {' · '}
          {diasRestantes > 0 ? `quedan ${diasRestantes} ${diasRestantes === 1 ? 'día' : 'días'}` : 'se acabó el plazo'}
        </span>
      </p>
      <div className="mt-1.5 flex gap-1.5" aria-hidden>
        {Array.from({ length: maximo }, (_, i) => (
          <span key={i} className={cn('size-3 rounded-full', i < intentos ? 'bg-navy-700' : 'bg-navy-100')} />
        ))}
      </div>
    </div>
  );
}

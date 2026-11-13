import { Link } from 'react-router-dom';
import { Headset, ShieldCheck } from 'lucide-react';
import Decimal from 'decimal.js';
import type { PosicionRanking } from '../../../shared/types/api';
import { Badge } from '../../../shared/ui/badge';
import { Button } from '../../../shared/ui/button';
import { MoneyValue } from '../../../shared/ui/domain/MoneyValue';

interface Props {
  ranking: PosicionRanking[];
  cotizacionId: string;
  /** Opciones de venta de la cotización (RN-01..04): sin `COMPRA_INMEDIATA` no hay botón de comprar. */
  puedeComprar: boolean;
  puedeAsesor: boolean;
  /** Abre "Hablar con un asesor" con la duda ya marcada. */
  onHablarAsesor: () => void;
}

/**
 * Lista ordenada por Costo Real Anual (RN-34) con la barra apilada: tramo azul = prima, tramo turquesa = lo que
 * pagarías tú en promedio. El ancho de la barra es solo visual (proporción entre planes); los montos son los del backend.
 * Cada fila dice en texto lo mismo que la barra.
 */
export function RankingCostoReal({ ranking, cotizacionId, puedeComprar, puedeAsesor, onHablarAsesor }: Props) {
  const mayor = ranking.reduce((m, p) => Decimal.max(m, p.costoRealAnual), new Decimal(0));
  const mejor = ranking.find((p) => p.posicion === 1 && p.datosCompletos);

  return (
    <ol className="space-y-3" aria-label="Ranking de planes por costo real anual">
      {ranking.map((p) => {
        const esMejor = mejor?.primaCotizadaId === p.primaCotizadaId;
        const pctPrima = mayor.gt(0) ? new Decimal(p.prima).div(mayor).times(100).toNumber() : 0;
        const pctEsperado = mayor.gt(0) ? new Decimal(p.desembolsoEsperado).div(mayor).times(100).toNumber() : 0;
        return (
          <li key={p.primaCotizadaId} className="rounded-xl border border-line bg-surface p-4">
            <div className="flex flex-wrap items-start gap-x-3 gap-y-1">
              <span className="text-money-xl leading-none text-navy-700" aria-label={`Posición ${p.posicion}`}>
                {p.posicion}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-caption text-ink-soft">{p.aseguradora}</p>
                <p className="font-bold text-navy-700">Plan {p.plan}</p>
              </div>
              {esMejor ? (
                <Badge tone="accent">
                  <ShieldCheck className="size-3.5" aria-hidden /> Mejor protección por tu dinero
                </Badge>
              ) : null}
              {!p.datosCompletos ? <Badge tone="warning">Información incompleta</Badge> : null}
            </div>

            <div className="mt-3 flex h-3 overflow-hidden rounded-full bg-navy-50" role="img" aria-label={`Prima ${p.prima} dólares y ${p.desembolsoEsperado} dólares que pagarías tú en promedio`}>
              <div className="bg-navy-700" style={{ width: `${pctPrima}%` }} />
              <div className="bg-accent-500" style={{ width: `${pctEsperado}%` }} />
            </div>

            <dl className="mt-3 grid gap-x-4 gap-y-1 text-small sm:grid-cols-3">
              <div className="flex justify-between gap-2 sm:block">
                <dt className="text-ink-soft">Prima al año</dt>
                <dd>
                  <MoneyValue value={p.prima} />
                </dd>
              </div>
              <div className="flex justify-between gap-2 sm:block">
                <dt className="text-ink-soft">Lo que pagarías tú en promedio</dt>
                <dd>
                  <MoneyValue value={p.desembolsoEsperado} />
                </dd>
              </div>
              <div className="flex justify-between gap-2 sm:block">
                <dt className="font-bold text-navy-700">Costo real al año</dt>
                <dd>
                  <MoneyValue value={p.costoRealAnual} className="text-navy-700" />
                </dd>
              </div>
            </dl>

            {puedeComprar || puedeAsesor ? (
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                {puedeComprar ? (
                  <Button variant={esMejor ? 'primary' : 'outlineNavy'} className="w-full sm:w-auto" asChild>
                    <Link to={`/compra/${cotizacionId}?prima=${p.primaCotizadaId}`}>Comprar este plan</Link>
                  </Button>
                ) : null}
                {puedeAsesor ? (
                  <Button variant="secondary" className="w-full sm:w-auto" onClick={onHablarAsesor}>
                    <Headset aria-hidden /> Hablar con un asesor sobre esto
                  </Button>
                ) : null}
              </div>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

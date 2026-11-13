import { Receipt, Tag } from 'lucide-react';
import { formatearPorcentaje } from '../../../shared/lib/format';
import type { ResumenCompra } from '../../../shared/types/api';
import { Card } from '../../../shared/ui/card';
import { MoneyValue } from '../../../shared/ui/domain/MoneyValue';

/**
 * Plan elegido con los montos del backend (RN-38): suma asegurada, prima anual, descuento y prima final.
 * La prima final es la que ya incluye el descuento; no se calcula aquí.
 */
export function ResumenCompraCard({ resumen, compacto = false }: { resumen: ResumenCompra; compacto?: boolean }) {
  const d = resumen.descuento;
  return (
    <Card className="p-5">
      <p className="text-caption text-ink-soft">{resumen.aseguradora}</p>
      <h2 className="text-h3 text-navy-700">Plan {resumen.plan}</h2>

      <dl className="mt-4 space-y-2">
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-ink-soft">Suma asegurada</dt>
          <dd>
            <MoneyValue value={resumen.sumaAsegurada} decimales={0} />
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-ink-soft">Prima anual</dt>
          <dd>
            <MoneyValue value={resumen.primaAnual} />
          </dd>
        </div>
        {d ? (
          <div className="flex items-baseline justify-between gap-3 text-status-success">
            <dt>{d.tipo === 'PRIMERA_COMPRA' ? 'Descuento de primera compra' : 'Descuento negociado'}</dt>
            <dd className="font-bold">{formatearPorcentaje(d.porcentaje)}</dd>
          </div>
        ) : null}
        <div className="flex items-baseline justify-between gap-3 border-t border-line pt-3">
          <dt className="font-bold text-navy-700">Prima final al año</dt>
          <dd>
            <MoneyValue value={resumen.primaFinal} size={compacto ? 'inline' : 'md'} className="text-navy-700" />
          </dd>
        </div>
      </dl>

      {d && !compacto ? (
        <p className="mt-4 flex items-start gap-2 rounded-lg bg-status-success/10 px-3 py-2 text-small text-ink">
          <Tag className="mt-0.5 size-4 shrink-0 text-status-success" aria-hidden />
          <span>
            {d.tipo === 'PRIMERA_COMPRA'
              ? `Se aplicó tu ${formatearPorcentaje(d.porcentaje)} de descuento por primera compra.`
              : `Se aplicó tu descuento negociado de ${formatearPorcentaje(d.porcentaje)}.`}
          </span>
        </p>
      ) : null}
      {!compacto ? (
        <p className="mt-3 flex items-start gap-2 text-caption text-ink-soft">
          <Receipt className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          Los montos los calcula la aseguradora; aquí solo los mostramos.
        </p>
      ) : null}
    </Card>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { RotateCcw, Save, TriangleAlert } from 'lucide-react';
import { parseDecimal } from '../../../shared/lib/forms';
import type { BeneficiosPlanAdmin } from '../../../shared/types/api';
import { Button } from '../../../shared/ui/button';
import { Input } from '../../../shared/ui/input';
import { Skeleton } from '../../../shared/ui/skeleton';
import { EstadoError } from '../../../shared/ui/domain/EstadoVacio';
import { ErrorToast, SuccessToast, WarningToast } from '../../../shared/ui/domain/toasts';
import { useBeneficiosPlanAdmin, useGuardarBeneficiosPlan } from '../hooks/useContenidoAdmin';

interface Fila {
  ofrece: boolean;
  valor: string;
  detalle: string;
}
type Borrador = Record<string, Fila>;

const aBorrador = (d: BeneficiosPlanAdmin): Borrador =>
  Object.fromEntries(
    d.catalogo.map((c) => {
      const b = d.beneficios.find((x) => x.codigo === c.codigo);
      return [c.codigo, { ofrece: !!b, valor: b ? String(Number(b.valor)) : '', detalle: b?.detalle ?? '' }];
    }),
  );

function errorDe(tipo: string, f: Fila): string | null {
  if (!f.ofrece) return null;
  const n = parseDecimal(f.valor);
  if (n === null || n <= 0) return 'Indica un valor mayor que 0';
  if ((f.valor.trim().replace(',', '.').split('.')[1] ?? '').length > 2) return 'Hasta 2 decimales';
  if (tipo === 'PORCENTAJE' && n > 100) return 'No puede pasar de 100';
  if (f.detalle.trim().length > 200) return 'Máximo 200 caracteres';
  return null;
}

/**
 * Beneficios de un plan (extras al seguro). El administrador marca los que ESE plan ofrece y su valor; lo que no marca
 * es "No incluye". Regla de escalera: el plan superior de una aseguradora debe incluir todo lo del inferior, con igual o
 * mejor valor; si no se cumple se guarda igual y sale un aviso ámbar. Tiene su propio guardado: no depende del contenido.
 */
export function BeneficiosPlanPanel({ planId }: { planId: string }) {
  const { data, isLoading, isError, error, refetch } = useBeneficiosPlanAdmin(planId);
  const guardar = useGuardarBeneficiosPlan(planId);
  const [borrador, setBorrador] = useState<Borrador | null>(null);

  useEffect(() => {
    if (data) setBorrador(aBorrador(data));
  }, [data]);

  const original = useMemo(() => (data ? JSON.stringify(aBorrador(data)) : ''), [data]);
  const sucio = borrador !== null && JSON.stringify(borrador) !== original;
  const errores = useMemo(() => {
    const e: Record<string, string> = {};
    if (!data || !borrador) return e;
    for (const c of data.catalogo) {
      const m = errorDe(c.tipo, borrador[c.codigo]!);
      if (m) e[c.codigo] = m;
    }
    return e;
  }, [data, borrador]);
  const hayErrores = Object.keys(errores).length > 0;

  if (isError) return <EstadoError error={error} onRetry={() => void refetch()} />;
  if (isLoading || !data || !borrador) return <Skeleton className="mt-8 h-48 w-full" aria-label="Cargando los beneficios del plan" />;

  const poner = (codigo: string, parche: Partial<Fila>) => setBorrador((b) => (b ? { ...b, [codigo]: { ...b[codigo]!, ...parche } } : b));

  function onGuardar() {
    if (!data || !borrador || hayErrores) return;
    const beneficios = data.catalogo
      .filter((c) => borrador[c.codigo]!.ofrece)
      .map((c) => {
        const f = borrador[c.codigo]!;
        return { codigo: c.codigo, valor: parseDecimal(f.valor)!, detalle: f.detalle.trim() || null };
      });
    guardar.mutate(
      { beneficios },
      {
        onSuccess: (r) => {
          SuccessToast('Beneficios guardados', 'Ya los ven los clientes en el detalle, el comparador y el chat.');
          if (r.warning) WarningToast(r.warning, `warning-beneficios-${planId}`);
        },
        onError: (err) => ErrorToast(err),
      },
    );
  }

  return (
    <section aria-label="Beneficios del plan" className="mt-10 border-t border-line pt-6">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold text-navy-700">Beneficios · {data.aseguradora} · Plan {data.plan}</h2>
          <p className="text-small text-ink-soft">
            Extras al seguro (visitas técnicas, grúa, combustible…). Marca solo los que este plan ofrece; el resto sale como «No incluye».
            Un plan superior debe incluir todo lo del inferior, con igual o mejor valor.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" disabled={!sucio || guardar.isPending} onClick={() => setBorrador(aBorrador(data))}>
            <RotateCcw aria-hidden /> Descartar
          </Button>
          <Button disabled={!sucio || hayErrores} loading={guardar.isPending} loadingText="Guardando…" onClick={onGuardar}>
            <Save aria-hidden /> Actualizar beneficios
          </Button>
        </div>
      </div>

      {data.advertencias.length > 0 ? (
        <div className="mb-3 rounded-xl border border-status-warning/50 bg-status-warning/10 p-4">
          <h3 className="flex items-center gap-2 font-bold text-ink">
            <TriangleAlert className="size-5 shrink-0 text-status-pending" aria-hidden /> Este plan no cumple la escalera de beneficios
          </h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-small text-ink">
            {data.advertencias.map((a) => (
              <li key={a.codigo}>{a.mensaje}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <ul className="space-y-2">
        {data.catalogo.map((c) => {
          const f = borrador[c.codigo]!;
          const err = errores[c.codigo];
          return (
            <li key={c.codigo} className="rounded-xl border border-line bg-surface p-3">
              <label className="flex min-h-11 cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={f.ofrece}
                  onChange={(e) => poner(c.codigo, { ofrece: e.target.checked })}
                  className="size-5 accent-brand-500"
                  aria-label={`El plan ofrece: ${c.nombre}`}
                />
                <span className="font-bold text-navy-700">{c.nombre}</span>
              </label>
              {f.ofrece ? (
                <div className="mt-2 grid gap-2 sm:grid-cols-[10rem_minmax(0,1fr)] sm:items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <Input
                        value={f.valor}
                        inputMode="decimal"
                        aria-label={`Valor de ${c.nombre}`}
                        invalid={!!err}
                        className="h-10 w-24 font-mono"
                        onChange={(e) => poner(c.codigo, { valor: e.target.value })}
                      />
                      <span className="text-small text-ink-soft">{c.unidad}</span>
                    </div>
                    {err ? (
                      <p role="alert" className="mt-1 text-caption text-status-danger">
                        {err}
                      </p>
                    ) : null}
                  </div>
                  <Input
                    value={f.detalle}
                    placeholder="Detalle opcional (p. ej. solo en grifos aliados)"
                    aria-label={`Detalle de ${c.nombre}`}
                    className="h-10"
                    onChange={(e) => poner(c.codigo, { detalle: e.target.value })}
                  />
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

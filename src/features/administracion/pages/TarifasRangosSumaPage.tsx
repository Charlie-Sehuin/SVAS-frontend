import { useEffect, useMemo, useState } from 'react';
import { RotateCcw, Save } from 'lucide-react';
import { parseDecimal } from '../../../shared/lib/forms';
import { cn } from '../../../shared/lib/utils';
import type { RangoVista } from '../../../shared/types/api';
import { Badge } from '../../../shared/ui/badge';
import { Button } from '../../../shared/ui/button';
import { Field } from '../../../shared/ui/field';
import { Input } from '../../../shared/ui/input';
import { Select } from '../../../shared/ui/select';
import { Skeleton } from '../../../shared/ui/skeleton';
import { Table, TBody, TD, TH, THead, TR } from '../../../shared/ui/table';
import { EstadoError, EstadoVacio } from '../../../shared/ui/domain/EstadoVacio';
import { PageHeader } from '../../../shared/ui/domain/PageHeader';
import { ErrorToast, SuccessToast } from '../../../shared/ui/domain/toasts';
import { useMarcas, useModelos } from '../../cotizacion/hooks/useCatalogo';
import { TarifasTabs } from '../tarifas/TarifasTabs';
import { useAseguradoras, useGuardarRangos, useRangos } from '../hooks/useAdmin';

interface Borrador {
  min: string;
  max: string;
}

const clave = (r: Pick<RangoVista, 'modeloId' | 'anio'>) => `${r.modeloId}|${r.anio}`;

/** Valida un monto en USD: mayor que 0, hasta 2 decimales. */
function errorDeMonto(texto: string): string | null {
  const n = parseDecimal(texto);
  if (n === null) return 'Escribe un monto';
  if (n <= 0) return 'Debe ser mayor que 0';
  if ((texto.trim().replace(',', '.').split('.')[1] ?? '').length > 2) return 'Hasta 2 decimales';
  if (n > 9_999_999_999.99) return 'Es demasiado alto';
  return null;
}

/** Rangos de suma asegurada por modelo y año (RN-37, RN-39). Sin rango, la aseguradora no cotiza ese modelo-año. */
export function TarifasRangosSumaPage() {
  const aseguradoras = useAseguradoras();
  const marcas = useMarcas();
  const [aseguradoraId, setAseguradoraId] = useState('');
  const [marcaId, setMarcaId] = useState('');
  const [modeloId, setModeloId] = useState('');
  const modelos = useModelos(marcaId || null);
  const rangos = useRangos({ aseguradoraId: aseguradoraId || null, marcaId: marcaId || null, modeloId: modeloId || null });
  const guardar = useGuardarRangos();
  const [borrador, setBorrador] = useState<Map<string, Borrador>>(new Map());

  // Cambiar el filtro descarta los cambios sin guardar.
  useEffect(() => setBorrador(new Map()), [aseguradoraId, marcaId, modeloId]);

  const filas = rangos.data ?? [];
  const valores = (r: RangoVista): Borrador => borrador.get(clave(r)) ?? { min: r.sumaMinima, max: r.sumaMaxima };
  /** Cambió si algún valor es distinto del original (o no es un número). Se compara en números, no en texto. */
  const esCambiado = (r: RangoVista) => {
    const b = borrador.get(clave(r));
    if (!b) return false;
    const min = parseDecimal(b.min);
    const max = parseDecimal(b.max);
    return min === null || max === null || min !== Number(r.sumaMinima) || max !== Number(r.sumaMaxima);
  };
  const cambiadas = filas.filter(esCambiado);

  const errores = useMemo(() => {
    const m = new Map<string, { min?: string; max?: string; fila?: string }>();
    for (const r of filas) {
      const b = borrador.get(clave(r));
      if (!b || !esCambiado(r)) continue;
      const eMin = errorDeMonto(b.min);
      const eMax = errorDeMonto(b.max);
      const e: { min?: string; max?: string; fila?: string } = {};
      if (eMin) e.min = eMin;
      if (eMax) e.max = eMax;
      if (!eMin && !eMax && parseDecimal(b.min)! > parseDecimal(b.max)!) e.fila = 'La suma mínima no puede superar la máxima';
      if (e.min || e.max || e.fila) m.set(clave(r), e);
    }
    return m;
  }, [borrador, filas]);

  /** Se conserva lo escrito aunque un texto intermedio coincida con el original (si no, el campo saltaría mientras se teclea). */
  const editar = (r: RangoVista, campo: keyof Borrador, texto: string) =>
    setBorrador((prev) => {
      const actual = prev.get(clave(r)) ?? { min: r.sumaMinima, max: r.sumaMaxima };
      return new Map(prev).set(clave(r), { ...actual, [campo]: texto });
    });

  const onGuardar = () => {
    if (!aseguradoraId || errores.size > 0) return;
    guardar.mutate(
      {
        aseguradoraId,
        filas: cambiadas.map((r) => {
          const b = borrador.get(clave(r))!;
          return { modeloId: r.modeloId, anio: r.anio, sumaMinima: parseDecimal(b.min)!, sumaMaxima: parseDecimal(b.max)! };
        }),
      },
      {
        onSuccess: (r) => {
          SuccessToast('Rangos guardados', `${r.cambiadas} cambiados de ${r.recibidas} recibidos.`);
          setBorrador(new Map());
        },
        onError: (e) => ErrorToast(e),
      },
    );
  };

  return (
    <>
      <PageHeader
        titulo="Tarifas · Rangos de suma asegurada"
        descripcion="Mínimo y máximo que cada aseguradora permite por modelo y año. La suma inicial de una cotización es el punto medio del rango, redondeado a USD 100."
        accion={
          <>
            <Button variant="ghost" disabled={cambiadas.length === 0 || guardar.isPending} onClick={() => setBorrador(new Map())}>
              <RotateCcw aria-hidden /> Descartar
            </Button>
            <Button disabled={cambiadas.length === 0 || errores.size > 0} loading={guardar.isPending} onClick={onGuardar}>
              <Save aria-hidden /> Guardar{cambiadas.length > 0 ? ` (${cambiadas.length})` : ''}
            </Button>
          </>
        }
      />
      <TarifasTabs />

      <div className="mb-4 grid gap-x-4 rounded-xl border border-line bg-surface p-3 pb-0 sm:grid-cols-3">
        <Field label="Aseguradora">
          {(p) => (
            <Select {...p} compact value={aseguradoraId} onChange={(e) => setAseguradoraId(e.target.value)}>
              <option value="">Elige una aseguradora</option>
              {aseguradoras.data?.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nombre}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Marca">
          {(p) => (
            <Select
              {...p}
              compact
              value={marcaId}
              disabled={marcas.isLoading}
              onChange={(e) => {
                setMarcaId(e.target.value);
                setModeloId('');
              }}
            >
              <option value="">{marcas.isLoading ? 'Cargando…' : 'Elige una marca'}</option>
              {marcas.data?.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nombre}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Modelo (opcional)">
          {(p) => (
            <Select {...p} compact value={modeloId} disabled={!marcaId || modelos.isLoading} onChange={(e) => setModeloId(e.target.value)}>
              <option value="">{marcaId ? 'Todos los modelos' : 'Primero elige la marca'}</option>
              {modelos.data?.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nombre}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </div>

      {!aseguradoraId || !marcaId ? (
        <EstadoVacio titulo="Elige una aseguradora y una marca para ver y editar sus rangos." />
      ) : rangos.isError ? (
        <EstadoError error={rangos.error} onRetry={() => void rangos.refetch()} />
      ) : rangos.isLoading ? (
        <div className="space-y-2" aria-busy aria-label="Cargando rangos">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="h-11 w-full" />
          ))}
        </div>
      ) : filas.length === 0 ? (
        <EstadoVacio titulo="Esta aseguradora no tiene rangos para esa marca: no cotiza esos modelos." />
      ) : (
        <Table caption="Rangos de suma asegurada">
          <THead>
            <TR>
              <TH>Modelo</TH>
              <TH>Año</TH>
              <TH className="w-48">Suma mínima (USD)</TH>
              <TH className="w-48">Suma máxima (USD)</TH>
              <TH className="w-32">Estado</TH>
            </TR>
          </THead>
          <TBody>
            {filas.map((r) => {
              const k = clave(r);
              const v = valores(r);
              const e = errores.get(k);
              const mod = esCambiado(r);
              return (
                <TR key={k} className={cn('h-16', mod && 'bg-brand-50/40')}>
                  <TD className="font-bold text-ink">
                    {r.marca} {r.modelo}
                  </TD>
                  <TD className="tabular">{r.anio}</TD>
                  <TD>
                    <Input
                      inputMode="decimal"
                      value={v.min}
                      aria-label={`Suma mínima de ${r.modelo} ${r.anio}`}
                      invalid={!!e?.min || !!e?.fila}
                      className="h-10 font-mono"
                      onChange={(ev) => editar(r, 'min', ev.target.value)}
                    />
                    {e?.min ? <p role="alert" className="mt-1 text-small text-status-danger">{e.min}</p> : null}
                  </TD>
                  <TD>
                    <Input
                      inputMode="decimal"
                      value={v.max}
                      aria-label={`Suma máxima de ${r.modelo} ${r.anio}`}
                      invalid={!!e?.max || !!e?.fila}
                      className="h-10 font-mono"
                      onChange={(ev) => editar(r, 'max', ev.target.value)}
                    />
                    {e?.max ? <p role="alert" className="mt-1 text-small text-status-danger">{e.max}</p> : null}
                    {e?.fila ? <p role="alert" className="mt-1 text-small text-status-danger">{e.fila}</p> : null}
                  </TD>
                  <TD>{mod ? <Badge tone="brand">Sin guardar</Badge> : null}</TD>
                </TR>
              );
            })}
          </TBody>
        </Table>
      )}
    </>
  );
}

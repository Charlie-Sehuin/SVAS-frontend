import { useEffect, useState } from 'react';
import { Plus, RotateCcw, Save } from 'lucide-react';
import { isApiError } from '../../../shared/lib/api-client';
import { parseDecimal } from '../../../shared/lib/forms';
import { cn } from '../../../shared/lib/utils';
import type { CoberturaAdmin, EscenarioAdmin, FilaCoberturaRequest } from '../../../shared/types/api';
import type { CondicionTaller } from '../../../shared/types/enums';
import { Badge } from '../../../shared/ui/badge';
import { Button } from '../../../shared/ui/button';
import { Input } from '../../../shared/ui/input';
import { Select } from '../../../shared/ui/select';
import { Skeleton } from '../../../shared/ui/skeleton';
import { Switch } from '../../../shared/ui/switch';
import { Table, TBody, TD, TH, THead, TR } from '../../../shared/ui/table';
import { EstadoError, EstadoVacio } from '../../../shared/ui/domain/EstadoVacio';
import { Filtro, FiltrosBar } from '../../../shared/ui/domain/FiltrosBar';
import { PageHeader } from '../../../shared/ui/domain/PageHeader';
import { ErrorToast, SuccessToast } from '../../../shared/ui/domain/toasts';
import { useAseguradoras, usePlanes } from '../hooks/useAdmin';
import { useCoberturasAdmin, useEscenariosAdmin, useGuardarCoberturas } from '../hooks/usePruebaChoqueAdmin';
import { AvisoReferencial, PruebaChoqueTabs } from '../prueba-choque/PruebaChoqueTabs';
import { TEXTO_TALLER } from '../prueba-choque/textos';

/** Lo que se edita de una cobertura: texto de cada celda, tal como lo escribe la persona. */
interface Fila {
  cubre: boolean;
  pct: string;
  minimo: string;
  tope: string;
  taller: CondicionTaller;
  dias: string;
  fuente: string;
}
type CampoFila = 'pct' | 'minimo' | 'tope' | 'dias' | 'fuente';

const FILA_NUEVA: Fila = { cubre: true, pct: '0', minimo: '0', tope: '', taller: 'AFILIADO', dias: '0', fuente: '' };

const desdeCobertura = (c: CoberturaAdmin): Fila => ({
  cubre: c.cubre,
  pct: c.deduciblePct ?? '',
  minimo: c.deducibleMinimo ?? '',
  tope: c.topeCobertura ?? '',
  taller: c.condicionTaller,
  dias: String(c.diasAutoReemplazo),
  fuente: c.fuente,
});

const mismoNumero = (a: string, b: string) => {
  const x = parseDecimal(a);
  const y = parseDecimal(b);
  return x === null || y === null ? a.trim() === b.trim() : x === y;
};
const igual = (a: Fila, b: Fila) =>
  a.cubre === b.cubre &&
  a.taller === b.taller &&
  a.fuente.trim() === b.fuente.trim() &&
  // Si no cubre, lo demás no cuenta: el backend lo rechaza y aquí se limpia al guardar.
  (!a.cubre || (mismoNumero(a.pct, b.pct) && mismoNumero(a.minimo, b.minimo) && mismoNumero(a.tope, b.tope) && mismoNumero(a.dias, b.dias)));

const dosDecimales = (t: string) => /^\d+([.,]\d{1,2})?$/.test(t.trim());

/** Mismas reglas que el backend (el backend vuelve a validar): devuelve un mensaje por campo con problema. */
function erroresDe(f: Fila): Partial<Record<CampoFila, string>> {
  const e: Partial<Record<CampoFila, string>> = {};
  if (f.cubre) {
    const pct = parseDecimal(f.pct);
    if (f.pct.trim() !== '' && (pct === null || !dosDecimales(f.pct) || pct > 100)) e.pct = 'Entre 0 y 100 %, hasta 2 decimales';
    const min = parseDecimal(f.minimo);
    if (f.minimo.trim() !== '' && (min === null || !dosDecimales(f.minimo))) e.minimo = 'Monto con hasta 2 decimales';
    const tope = parseDecimal(f.tope);
    if (f.tope.trim() !== '' && (tope === null || !dosDecimales(f.tope) || tope <= 0)) e.tope = 'Mayor que 0, o vacío = hasta la suma asegurada';
    if (!/^\d+$/.test(f.dias.trim()) || Number(f.dias) > 365) e.dias = 'Entre 0 y 365';
  }
  if (!f.fuente.trim()) e.fuente = 'Indica la fuente (p. ej. el condicionado)';
  else if (f.fuente.trim().length > 200) e.fuente = 'Hasta 200 caracteres';
  return e;
}

function aPeticion(planId: string, escenario: string, f: Fila): FilaCoberturaRequest {
  const base = { planId, escenario, condicionTaller: f.taller, fuente: f.fuente.trim() };
  // Si no cubre no lleva deducible, tope ni días de reemplazo (el backend lo exige).
  if (!f.cubre) return { ...base, cubre: false, deduciblePct: null, deducibleMinimo: null, topeCobertura: null, diasAutoReemplazo: 0 };
  return {
    ...base,
    cubre: true,
    deduciblePct: f.pct.trim() === '' ? null : parseDecimal(f.pct),
    deducibleMinimo: f.minimo.trim() === '' ? null : parseDecimal(f.minimo),
    topeCobertura: f.tope.trim() === '' ? null : parseDecimal(f.tope),
    diasAutoReemplazo: Number(f.dias),
  };
}

/**
 * `/app/admin/prueba-choque/coberturas` (RF-36, RN-31): para cada plan y escenario, si cubre y con qué deducible, mínimo, tope
 * y días de auto de reemplazo. Un escenario sin fila sale "Sin información" en la Prueba de Choque (RN-30): nunca se asume
 * un valor favorable. Cada fila lleva su fuente (de dónde sale el dato). Solo se envían las filas que cambiaron.
 */
export function PruebaChoqueCoberturasPage() {
  const aseguradoras = useAseguradoras();
  const planes = usePlanes();
  const escenariosQ = useEscenariosAdmin();
  const [planId, setPlanId] = useState('');
  const coberturasQ = useCoberturasAdmin(planId || null);
  const guardar = useGuardarCoberturas();
  /** Borrador por código de escenario. Solo contiene filas tocadas (o nuevas). */
  const [borrador, setBorrador] = useState<Map<string, Fila>>(new Map());
  const [erroresServidor, setErroresServidor] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    setBorrador(new Map());
    setErroresServidor(new Map());
  }, [planId]);

  const nombreAseguradora = (id: string) => aseguradoras.data?.find((a) => a.id === id)?.nombre ?? '';
  const planesOrdenados = [...(planes.data ?? [])].sort((a, b) =>
    `${nombreAseguradora(a.aseguradoraId)} ${a.nombre}`.localeCompare(`${nombreAseguradora(b.aseguradoraId)} ${b.nombre}`),
  );

  const escenarios = escenariosQ.data ?? [];
  const coberturaDe = (codigo: string) => coberturasQ.data?.find((c) => c.escenario === codigo);
  const filaActual = (e: EscenarioAdmin): Fila | null => borrador.get(e.codigo) ?? (coberturaDe(e.codigo) ? desdeCobertura(coberturaDe(e.codigo)!) : null);
  const cambiada = (e: EscenarioAdmin) => {
    const b = borrador.get(e.codigo);
    if (!b) return false;
    const original = coberturaDe(e.codigo);
    return !original || !igual(b, desdeCobertura(original));
  };

  const cambiadas = escenarios.filter(cambiada);
  const conError = cambiadas.filter((e) => Object.keys(erroresDe(borrador.get(e.codigo)!)).length > 0).length;

  const editar = (codigo: string, parche: Partial<Fila>) =>
    setBorrador((prev) => {
      const base = prev.get(codigo) ?? (coberturaDe(codigo) ? desdeCobertura(coberturaDe(codigo)!) : FILA_NUEVA);
      return new Map(prev).set(codigo, { ...base, ...parche });
    });

  function onGuardar() {
    if (!planId || conError > 0) return;
    setErroresServidor(new Map());
    const enviadas = cambiadas.map((e) => e.codigo);
    guardar.mutate(
      cambiadas.map((e) => aPeticion(planId, e.codigo, borrador.get(e.codigo)!)),
      {
        onSuccess: (r) => {
          SuccessToast('Coberturas guardadas', `${r.cambiadas} cambiadas de ${r.recibidas} recibidas.`);
          setBorrador(new Map());
        },
        onError: (err) => {
          // Los errores del backend por fila (`filas.3`) se pegan a su escenario.
          if (isApiError(err) && err.errors.length > 0) {
            const m = new Map<string, string>();
            for (const x of err.errors) {
              const i = /^filas\.(\d+)/.exec(x.campo)?.[1];
              const codigo = i !== undefined ? enviadas[Number(i)] : undefined;
              if (codigo) m.set(codigo, x.mensaje);
            }
            setErroresServidor(m);
          }
          ErrorToast(err);
        },
      },
    );
  }

  const plan = planesOrdenados.find((p) => p.id === planId);

  return (
    <>
      <PageHeader
        titulo="Prueba de Choque · Deducibles y topes"
        descripcion="Por plan y escenario: si cubre y cuánto paga el cliente de su bolsillo. Un escenario sin definir sale como &quot;Sin información&quot; en la Prueba de Choque."
        accion={
          <>
            <Button variant="ghost" disabled={cambiadas.length === 0 || guardar.isPending} onClick={() => setBorrador(new Map())}>
              <RotateCcw aria-hidden /> Descartar
            </Button>
            <Button disabled={cambiadas.length === 0 || conError > 0} loading={guardar.isPending} onClick={onGuardar}>
              <Save aria-hidden /> Guardar{cambiadas.length > 0 ? ` (${cambiadas.length})` : ''}
            </Button>
          </>
        }
      />
      <PruebaChoqueTabs />
      <AvisoReferencial />

      <FiltrosBar>
        <Filtro label="Plan" className="min-w-72">
          <Select compact value={planId} onChange={(e) => setPlanId(e.target.value)}>
            <option value="">Elige un plan</option>
            {planesOrdenados.map((p) => (
              <option key={p.id} value={p.id}>
                {nombreAseguradora(p.aseguradoraId)} · Plan {p.nombre}
                {p.activo ? '' : ' (inactivo)'}
              </option>
            ))}
          </Select>
        </Filtro>
      </FiltrosBar>

      {!plan ? (
        <EstadoVacio titulo="Elige un plan para ver y editar sus deducibles y topes." />
      ) : coberturasQ.isError || escenariosQ.isError ? (
        <EstadoError error={coberturasQ.error ?? escenariosQ.error} onRetry={() => void (coberturasQ.isError ? coberturasQ.refetch() : escenariosQ.refetch())} />
      ) : coberturasQ.isLoading || escenariosQ.isLoading ? (
        <div className="space-y-2" aria-busy aria-label="Cargando las coberturas">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : (
        <Table caption={`Deducibles y topes de ${nombreAseguradora(plan.aseguradoraId)} · Plan ${plan.nombre}`}>
          <THead>
            <tr>
              <TH>Escenario</TH>
              <TH>Cubre</TH>
              <TH className="w-28">Deducible %</TH>
              <TH className="w-32">Mínimo (USD)</TH>
              <TH className="w-36">Tope (USD)</TH>
              <TH className="w-40">Taller</TH>
              <TH className="w-24">Días de reemplazo</TH>
              <TH className="min-w-56">Fuente</TH>
              <TH>Estado</TH>
            </tr>
          </THead>
          <TBody>
            {escenarios.map((e) => {
              const f = filaActual(e);
              const mod = cambiada(e);
              if (!f) {
                return (
                  <TR key={e.codigo} className="h-14">
                    <TD>
                      <span className="font-bold text-navy-700">{e.nombre}</span>
                      {!e.activo ? <span className="ml-2 text-caption text-ink-soft">(inactivo)</span> : null}
                    </TD>
                    <TD colSpan={7}>
                      <span className="mr-3 text-ink-soft">Sin información de este plan para este escenario.</span>
                      <Button size="sm" variant="outlineNavy" onClick={() => editar(e.codigo, {})} aria-label={`Definir cobertura de ${e.nombre}`}>
                        <Plus aria-hidden /> Definir
                      </Button>
                    </TD>
                    <TD>
                      <Badge tone="warning">Sin información</Badge>
                    </TD>
                  </TR>
                );
              }
              const errores = mod ? erroresDe(f) : {};
              const errorServidor = erroresServidor.get(e.codigo);
              const celda = (campo: CampoFila, etiqueta: string, ancho?: string) => (
                <>
                  <Input
                    value={f[campo]}
                    aria-label={`${etiqueta} de ${e.nombre}`}
                    inputMode={campo === 'fuente' ? 'text' : 'decimal'}
                    disabled={campo !== 'fuente' && !f.cubre}
                    invalid={!!errores[campo]}
                    className={cn('h-10', campo !== 'fuente' && 'font-mono', ancho)}
                    onChange={(ev) => editar(e.codigo, { [campo]: ev.target.value })}
                  />
                  {errores[campo] ? (
                    <p role="alert" className="mt-1 text-caption text-status-danger">
                      {errores[campo]}
                    </p>
                  ) : null}
                </>
              );
              return (
                <TR key={e.codigo} className={cn('align-top', mod && 'bg-brand-50/40')}>
                  <TD>
                    <span className="block font-bold text-navy-700">{e.nombre}</span>
                    {!e.activo ? <span className="text-caption text-ink-soft">(inactivo)</span> : null}
                    {errorServidor ? (
                      <p role="alert" className="mt-1 max-w-48 text-caption text-status-danger">
                        {errorServidor}
                      </p>
                    ) : null}
                  </TD>
                  <TD>
                    <span className="flex items-center gap-2">
                      <Switch checked={f.cubre} aria-label={`El plan cubre ${e.nombre}`} onCheckedChange={(v) => editar(e.codigo, { cubre: v })} />
                      <span className="text-small font-bold">{f.cubre ? 'Sí' : 'No'}</span>
                    </span>
                  </TD>
                  <TD>{celda('pct', 'Deducible %')}</TD>
                  <TD>{celda('minimo', 'Deducible mínimo')}</TD>
                  <TD>{celda('tope', 'Tope')}</TD>
                  <TD>
                    <Select
                      compact
                      value={f.taller}
                      aria-label={`Taller de ${e.nombre}`}
                      onChange={(ev) => editar(e.codigo, { taller: ev.target.value as CondicionTaller })}
                    >
                      {(Object.keys(TEXTO_TALLER) as CondicionTaller[]).map((t) => (
                        <option key={t} value={t}>
                          {TEXTO_TALLER[t]}
                        </option>
                      ))}
                    </Select>
                  </TD>
                  <TD>{celda('dias', 'Días de reemplazo')}</TD>
                  <TD>{celda('fuente', 'Fuente')}</TD>
                  <TD>{!coberturaDe(e.codigo) ? <Badge tone="info">Nueva</Badge> : mod ? <Badge tone="brand">Sin guardar</Badge> : null}</TD>
                </TR>
              );
            })}
          </TBody>
        </Table>
      )}
    </>
  );
}

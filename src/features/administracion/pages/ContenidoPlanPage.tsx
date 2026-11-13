import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Check, Plus, RotateCcw, Save, Trash2, TriangleAlert, X } from 'lucide-react';
import { isApiError } from '../../../shared/lib/api-client';
import { formatearFecha } from '../../../shared/lib/format';
import { cn } from '../../../shared/lib/utils';
import { TIPOS_REQUISITO, type TipoRequisito } from '../../../shared/types/api';
import { Badge } from '../../../shared/ui/badge';
import { Button } from '../../../shared/ui/button';
import { Field } from '../../../shared/ui/field';
import { Input } from '../../../shared/ui/input';
import { Select } from '../../../shared/ui/select';
import { Skeleton } from '../../../shared/ui/skeleton';
import { EstadoError } from '../../../shared/ui/domain/EstadoVacio';
import { PageHeader } from '../../../shared/ui/domain/PageHeader';
import { ErrorToast, SuccessToast, WarningToast } from '../../../shared/ui/domain/toasts';
import { aBorrador, aPeticion, type Borrador, hayErrores, MAX, validar } from '../contenido/borrador';
import { TEXTO_CATEGORIA, TEXTO_TIPO_REQUISITO } from '../contenido/textos';
import { useContenidoPlanAdmin, useGuardarContenidoPlan } from '../hooks/useContenidoAdmin';

const PESTANAS = [
  { id: 'descripcion', texto: 'Descripción' },
  { id: 'coberturas', texto: 'Coberturas' },
  { id: 'exclusiones', texto: 'Exclusiones' },
  { id: 'requisitos', texto: 'Requisitos' },
] as const;
type Pestana = (typeof PESTANAS)[number]['id'];

/**
 * `/app/admin/planes/:planId/contenido` (dominio §18, RN-42..RN-46, diseño §10.5): el contenido comercial de un plan en cuatro
 * pestañas. El plan debe decir sí o no a TODAS las coberturas activas del catálogo ("no cubre" es una fila, nunca una ausencia);
 * "Guardar" se habilita solo cuando el contenido está completo. Las contradicciones con la Prueba de Choque (RN-43) se guardan
 * igual y salen como advertencias ámbar. Es contenido ilustrativo: no cambia ninguna prima.
 */
export function ContenidoPlanPage() {
  const { planId = '' } = useParams();
  const { data, isLoading, isError, error, refetch } = useContenidoPlanAdmin(planId);
  const guardar = useGuardarContenidoPlan(planId);
  const [pestana, setPestana] = useState<Pestana>('descripcion');
  const [borrador, setBorrador] = useState<Borrador | null>(null);
  const [errorGuardado, setErrorGuardado] = useState<string[]>([]);
  const idBase = useId();
  const botones = useRef<Record<string, HTMLButtonElement | null>>({});

  // El borrador se rearma cada vez que llega el contenido guardado (al abrir y después de guardar).
  useEffect(() => {
    if (data) {
      setBorrador(aBorrador(data));
      setErrorGuardado([]);
    }
  }, [data]);

  const codigos = useMemo(() => data?.coberturas.map((c) => c.codigo) ?? [], [data]);
  const errores = useMemo(() => (borrador ? validar(borrador, codigos) : null), [borrador, codigos]);
  const original = useMemo(() => (data ? JSON.stringify(aBorrador(data)) : ''), [data]);
  const sucio = borrador !== null && JSON.stringify(borrador) !== original;

  const volver = (
    <Button variant="ghost" size="sm" className="mb-3 -ml-3" asChild>
      <Link to="/app/admin/contenido/completitud">
        <ArrowLeft aria-hidden /> Volver a la completitud
      </Link>
    </Button>
  );

  if (isError) {
    return (
      <div>
        {volver}
        <EstadoError error={error} onRetry={() => void refetch()} />
      </div>
    );
  }
  if (isLoading || !data || !borrador || !errores) {
    return (
      <div aria-busy aria-label="Cargando el contenido del plan">
        {volver}
        <Skeleton className="mb-4 h-9 w-1/2" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const completo = !hayErrores(errores);
  const definidas = codigos.length - errores.sinDefinir;

  const poner = (parche: Partial<Borrador>) => setBorrador((b) => (b ? { ...b, ...parche } : b));
  const ponerCobertura = (codigo: string, parche: Partial<Borrador['coberturas'][string]>) =>
    setBorrador((b) => (b ? { ...b, coberturas: { ...b.coberturas, [codigo]: { ...b.coberturas[codigo]!, ...parche } } } : b));

  function onGuardar() {
    if (!borrador || !completo) return;
    setErrorGuardado([]);
    guardar.mutate(aPeticion(borrador, codigos), {
      onSuccess: (r) => {
        SuccessToast('Contenido guardado', 'Ya lo ven los clientes en el detalle y el comparador.');
        // RN-43: se guardó, pero hay contradicciones con la Prueba de Choque. La lista queda arriba.
        if (r.warning) WarningToast(r.warning, `warning-contenido-${planId}`);
      },
      onError: (err) => {
        // Mensajes del backend tal cual (RN-42: faltan coberturas, repetidas, límite en una que no se incluye…).
        setErrorGuardado(isApiError(err) && err.errors.length > 0 ? err.errors.map((x) => x.mensaje) : []);
        ErrorToast(err);
      },
    });
  }

  function teclado(e: KeyboardEvent, indice: number) {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    const sig = PESTANAS[(indice + (e.key === 'ArrowRight' ? 1 : -1) + PESTANAS.length) % PESTANAS.length]!;
    setPestana(sig.id);
    botones.current[sig.id]?.focus();
  }

  // Problemas por pestaña, en texto (el estado no depende del color).
  const problemas: Record<Pestana, string | null> = {
    descripcion: errores.resumen || errores.descripcion || errores.idealPara ? 'Falta completar' : null,
    coberturas:
      errores.sinDefinir > 0 ? `Faltan ${errores.sinDefinir}` : Object.keys(errores.coberturas).length > 0 ? 'Revisar' : null,
    exclusiones: errores.exclusiones.general || Object.keys(errores.exclusiones.porFila).length > 0 ? 'Revisar' : null,
    requisitos: errores.requisitos.general || Object.keys(errores.requisitos.porFila).length > 0 ? 'Revisar' : null,
  };

  return (
    <div>
      {volver}
      <PageHeader
        titulo={`Contenido · ${data.aseguradora} · Plan ${data.plan}`}
        descripcion={
          data.contenidoActualizadoEn ? `Actualizado el ${formatearFecha(data.contenidoActualizadoEn, 'larga')}.` : 'Este plan todavía no tiene contenido.'
        }
        accion={
          <>
            {data.activo ? <Badge tone="success">Plan activo</Badge> : <Badge tone="neutral">Plan inactivo</Badge>}
            <Button variant="ghost" disabled={!sucio || guardar.isPending} onClick={() => setBorrador(aBorrador(data))}>
              <RotateCcw aria-hidden /> Descartar
            </Button>
            <Button disabled={!completo || !sucio} loading={guardar.isPending} loadingText="Guardando…" onClick={onGuardar}>
              <Save aria-hidden /> Guardar
            </Button>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1">
        <p className={cn('font-bold', errores.sinDefinir === 0 ? 'text-status-success' : 'text-status-pending')}>
          {definidas} de {codigos.length} coberturas definidas
        </p>
        {!completo ? (
          <p className="text-small text-ink-soft">Guardar se habilita cuando todo el contenido está completo.</p>
        ) : !sucio ? (
          <p className="text-small text-ink-soft">No hay cambios por guardar.</p>
        ) : null}
      </div>

      {data.advertencias.length > 0 ? (
        <section aria-label="Advertencias de la Prueba de Choque" className="mb-4 rounded-xl border border-status-warning/50 bg-status-warning/10 p-4">
          <h2 className="flex items-center gap-2 font-bold text-ink">
            <TriangleAlert className="size-5 shrink-0 text-status-pending" aria-hidden /> Contradicciones con la Prueba de Choque
          </h2>
          <p className="text-small text-ink-soft">Se guardó igual, pero conviene corregir una de las dos.</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-small text-ink">
            {data.advertencias.map((a) => (
              <li key={a.codigo}>{a.mensaje}</li>
            ))}
          </ul>
          <Button variant="link" asChild className="mt-1">
            <Link to="/app/admin/prueba-choque/coberturas">Ir a deducibles y topes</Link>
          </Button>
        </section>
      ) : null}

      {errorGuardado.length > 0 ? (
        <div role="alert" className="mb-4 rounded-xl border border-status-danger/30 bg-status-danger/5 p-4">
          <p className="font-bold text-status-danger">No se pudo guardar</p>
          <ul className="mt-1 list-disc pl-5 text-small text-ink">
            {errorGuardado.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div role="tablist" aria-label="Secciones del contenido" className="flex overflow-x-auto border-b border-line">
        {PESTANAS.map((p, i) => (
          <button
            key={p.id}
            ref={(el) => {
              botones.current[p.id] = el;
            }}
            type="button"
            role="tab"
            id={`${idBase}-tab-${p.id}`}
            aria-selected={pestana === p.id}
            aria-controls={`${idBase}-panel-${p.id}`}
            tabIndex={pestana === p.id ? 0 : -1}
            onClick={() => setPestana(p.id)}
            onKeyDown={(e) => teclado(e, i)}
            className={cn(
              'flex min-h-11 shrink-0 items-center gap-2 border-b-[3px] px-4 text-small font-bold transition-colors focus-visible:outline-3 focus-visible:outline-offset-[-3px] focus-visible:outline-brand-300',
              pestana === p.id ? 'border-brand-500 text-navy-700' : 'border-transparent text-ink-soft hover:text-navy-700',
            )}
          >
            {p.texto}
            {problemas[p.id] ? (
              <Badge tone="warning" dot={false}>
                {problemas[p.id]}
              </Badge>
            ) : null}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`${idBase}-panel-${pestana}`} aria-labelledby={`${idBase}-tab-${pestana}`} tabIndex={0} className="pt-5">
        {pestana === 'descripcion' ? (
          <div className="max-w-3xl">
            <Field label="Resumen" help={`Una frase de venta. ${borrador.resumen.length} de ${MAX.resumen} caracteres.`} error={errores.resumen} required>
              {(p) => <Input {...p} value={borrador.resumen} onChange={(e) => poner({ resumen: e.target.value })} maxLength={MAX.resumen + 20} invalid={!!errores.resumen} />}
            </Field>
            <Field label="Descripción" help={`${borrador.descripcion.length} de ${MAX.descripcion} caracteres.`} error={errores.descripcion} required>
              {(p) => (
                <textarea
                  {...p}
                  value={borrador.descripcion}
                  onChange={(e) => poner({ descripcion: e.target.value })}
                  rows={5}
                  className={cn(
                    'w-full rounded-lg border bg-surface p-3 text-base text-ink focus:border-brand-500 focus-visible:outline-3 focus-visible:outline-brand-300',
                    errores.descripcion ? 'border-status-danger' : 'border-line',
                  )}
                />
              )}
            </Field>
            <Field label="Ideal para" help={`Quién debería elegir este plan. ${borrador.idealPara.length} de ${MAX.idealPara} caracteres.`} error={errores.idealPara} required>
              {(p) => <Input {...p} value={borrador.idealPara} onChange={(e) => poner({ idealPara: e.target.value })} maxLength={MAX.idealPara + 20} invalid={!!errores.idealPara} />}
            </Field>
          </div>
        ) : pestana === 'coberturas' ? (
          <ul className="divide-y divide-line rounded-xl border border-line bg-surface">
            {data.coberturas.map((c) => {
              const f = borrador.coberturas[c.codigo]!;
              const err = errores.coberturas[c.codigo];
              return (
                <li key={c.codigo} className="grid gap-3 p-4 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1.2fr)_9rem] lg:items-start">
                  <div className="min-w-0">
                    <p className="font-bold text-navy-700">{c.nombre}</p>
                    <p className="text-caption text-ink-soft">{TEXTO_CATEGORIA[c.categoria]}</p>
                    {f.incluida === null ? (
                      <Badge tone="warning" className="mt-1">
                        Sin definir
                      </Badge>
                    ) : null}
                  </div>
                  <div role="group" aria-label={`¿El plan incluye ${c.nombre}?`} className="flex gap-2">
                    {([true, false] as const).map((valor) => (
                      <button
                        key={String(valor)}
                        type="button"
                        aria-pressed={f.incluida === valor}
                        onClick={() => ponerCobertura(c.codigo, { incluida: valor, ...(valor ? {} : { limite: '' }) })}
                        className={cn(
                          'inline-flex min-h-11 min-w-20 items-center justify-center gap-1.5 rounded-lg border-2 px-3 text-small font-bold transition-colors focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand-300',
                          f.incluida === valor
                            ? valor
                              ? 'border-status-success bg-status-success/10 text-status-success'
                              : 'border-navy-500 bg-navy-50 text-navy-700'
                            : 'border-line bg-surface text-ink-soft hover:border-navy-300',
                        )}
                      >
                        {valor ? <Check className="size-4" aria-hidden /> : <X className="size-4" aria-hidden />}
                        {valor ? 'Incluida' : 'No incluida'}
                      </button>
                    ))}
                  </div>
                  <div>
                    <Input
                      value={f.detalle}
                      placeholder="Detalle para el cliente, p. ej. Hasta USD 100,000"
                      aria-label={`Detalle de ${c.nombre}`}
                      disabled={f.incluida === null}
                      invalid={!!err?.detalle}
                      className="h-10"
                      onChange={(e) => ponerCobertura(c.codigo, { detalle: e.target.value })}
                    />
                    {err?.detalle ? (
                      <p role="alert" className="mt-1 text-caption text-status-danger">
                        {err.detalle}
                      </p>
                    ) : null}
                  </div>
                  <div>
                    <Input
                      value={f.limite}
                      inputMode="decimal"
                      placeholder="Límite (USD)"
                      aria-label={`Límite de ${c.nombre}`}
                      disabled={f.incluida !== true}
                      invalid={!!err?.limite}
                      className="h-10 font-mono"
                      onChange={(e) => ponerCobertura(c.codigo, { limite: e.target.value })}
                    />
                    {err?.limite ? (
                      <p role="alert" className="mt-1 text-caption text-status-danger">
                        {err.limite}
                      </p>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        ) : pestana === 'exclusiones' ? (
          <div className="max-w-3xl">
            <p className="mb-3 text-small text-ink-soft">Lo que el plan nunca cubre, en frases cortas. Se muestran a quien mira el detalle del plan.</p>
            {errores.exclusiones.general ? (
              <p role="alert" className="mb-3 text-small text-status-danger">
                {errores.exclusiones.general}
              </p>
            ) : null}
            <ul className="space-y-2">
              {borrador.exclusiones.map((x, i) => (
                <li key={i}>
                  <div className="flex gap-2">
                    <Input
                      value={x}
                      aria-label={`Exclusión ${i + 1}`}
                      invalid={!!errores.exclusiones.porFila[i]}
                      onChange={(e) => poner({ exclusiones: borrador.exclusiones.map((v, j) => (j === i ? e.target.value : v)) })}
                    />
                    <Button variant="ghost" size="icon" aria-label={`Quitar la exclusión ${i + 1}`} onClick={() => poner({ exclusiones: borrador.exclusiones.filter((_, j) => j !== i) })}>
                      <Trash2 aria-hidden />
                    </Button>
                  </div>
                  {errores.exclusiones.porFila[i] ? (
                    <p role="alert" className="mt-1 text-small text-status-danger">
                      {errores.exclusiones.porFila[i]}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
            <Button className="mt-3" variant="outlineNavy" onClick={() => poner({ exclusiones: [...borrador.exclusiones, ''] })} disabled={borrador.exclusiones.length >= MAX.exclusiones}>
              <Plus aria-hidden /> Agregar exclusión
            </Button>
          </div>
        ) : (
          <div className="max-w-3xl">
            <p className="mb-3 text-small text-ink-soft">Qué se necesita para contratar. Informan al cliente; no bloquean la cotización ni la compra (RN-44).</p>
            {errores.requisitos.general ? (
              <p role="alert" className="mb-3 text-small text-status-danger">
                {errores.requisitos.general}
              </p>
            ) : null}
            <ul className="space-y-3">
              {borrador.requisitos.map((r, i) => (
                <li key={i} className="rounded-xl border border-line bg-surface p-3">
                  <div className="grid gap-2 sm:grid-cols-[10rem_minmax(0,1fr)_auto] sm:items-start">
                    <Select
                      compact
                      value={r.tipo}
                      aria-label={`Tipo del requisito ${i + 1}`}
                      onChange={(e) => poner({ requisitos: borrador.requisitos.map((v, j) => (j === i ? { ...v, tipo: e.target.value as TipoRequisito } : v)) })}
                    >
                      {TIPOS_REQUISITO.map((t) => (
                        <option key={t} value={t}>
                          {TEXTO_TIPO_REQUISITO[t]}
                        </option>
                      ))}
                    </Select>
                    <Input
                      value={r.texto}
                      aria-label={`Texto del requisito ${i + 1}`}
                      invalid={!!errores.requisitos.porFila[i]}
                      className="h-10"
                      onChange={(e) => poner({ requisitos: borrador.requisitos.map((v, j) => (j === i ? { ...v, texto: e.target.value } : v)) })}
                    />
                    <Button variant="ghost" size="icon" aria-label={`Quitar el requisito ${i + 1}`} onClick={() => poner({ requisitos: borrador.requisitos.filter((_, j) => j !== i) })}>
                      <Trash2 aria-hidden />
                    </Button>
                  </div>
                  {errores.requisitos.porFila[i] ? (
                    <p role="alert" className="mt-1 text-small text-status-danger">
                      {errores.requisitos.porFila[i]}
                    </p>
                  ) : null}
                  <label className="mt-1 flex min-h-11 cursor-pointer items-center gap-3 text-small">
                    <input
                      type="checkbox"
                      checked={r.obligatorio}
                      onChange={(e) => poner({ requisitos: borrador.requisitos.map((v, j) => (j === i ? { ...v, obligatorio: e.target.checked } : v)) })}
                      className="size-5 accent-brand-500"
                    />
                    <span>Es un requisito del plan (si no, es solo informativo)</span>
                  </label>
                </li>
              ))}
            </ul>
            <Button
              className="mt-3"
              variant="outlineNavy"
              onClick={() => poner({ requisitos: [...borrador.requisitos, { tipo: 'VEHICULO', texto: '', obligatorio: true }] })}
              disabled={borrador.requisitos.length >= MAX.requisitos}
            >
              <Plus aria-hidden /> Agregar requisito
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

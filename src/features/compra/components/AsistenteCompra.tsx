import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowLeft, Loader2, ShieldCheck } from 'lucide-react';
import { isApiError, nuevaIdempotencyKey } from '../../../shared/lib/api-client';
import { useAuth } from '../../../auth/useAuth';
import { formatearMonto } from '../../../shared/lib/format';
import type { ModoPago } from '../../../shared/types/enums';
import { Button } from '../../../shared/ui/button';
import { Field } from '../../../shared/ui/field';
import { Input } from '../../../shared/ui/input';
import { Skeleton } from '../../../shared/ui/skeleton';
import { MoneyValue } from '../../../shared/ui/domain/MoneyValue';
import { EstadoError } from '../../../shared/ui/domain/EstadoVacio';
import { ErrorToast } from '../../../shared/ui/domain/toasts';
import {
  useCamposFaltantes,
  useCrearCompra,
  useEstadoCompra,
  useGuardarDatosCompra,
  usePagar,
  useResumenCompra,
  useVinculoCotizacion,
} from '../hooks/useCompra';
import { ResumenCompraCard } from './ResumenCompraCard';
import { SelectorModoPago } from './SelectorModoPago';

type Paso = 'resumen' | 'datos' | 'firma' | 'pago';
const NOMBRE_PASO: Record<Paso, string> = { resumen: 'Resumen', datos: 'Tus datos', firma: 'Firma', pago: 'Pago' };

interface Props {
  cotizacionId: string;
  primaCotizadaId: string;
}

/**
 * Asistente de compra del CLIENTE (diseño §9.6): resumen → datos que faltan (solo si faltan, RNF-08) → firma y
 * condiciones → pago. Un paso por pantalla. Los montos son los que devuelve el backend; aquí no se calcula nada.
 */
export function AsistenteCompra({ cotizacionId, primaCotizadaId }: Props) {
  const navigate = useNavigate();
  const volver = `/cotizacion/${cotizacionId}`;

  const vinculo = useVinculoCotizacion(cotizacionId);
  const resumenQ = useResumenCompra(cotizacionId, primaCotizadaId, vinculo.listo);
  const camposQ = useCamposFaltantes(cotizacionId, vinculo.listo);
  const resumen = resumenQ.data;

  // Se decide UNA vez, al primer dato: si después de guardar ya no falta nada, el paso "Tus datos" no desaparece
  // a mitad de camino y cambia la numeración.
  const [pedirDatos, setPedirDatos] = useState<boolean | null>(null);
  useEffect(() => {
    if (pedirDatos === null && camposQ.data) setPedirDatos(camposQ.data.campos.length > 0);
  }, [camposQ.data, pedirDatos]);

  const crear = useCrearCompra();
  const ordenId = crear.data?.ordenId ?? resumen?.ordenId ?? null;
  const yaTeniaOrden = !!resumen?.ordenId && !crear.data;

  // Compra ya iniciada: el estado dice si ya está pagada (entonces se va directo a la confirmación).
  const estadoQ = useEstadoCompra(yaTeniaOrden ? ordenId! : undefined);

  const pasos: Paso[] = ordenId
    ? ['resumen', 'pago']
    : pedirDatos
      ? ['resumen', 'datos', 'firma', 'pago']
      : ['resumen', 'firma', 'pago'];
  const [indice, setIndice] = useState(0);
  const paso = pasos[Math.min(indice, pasos.length - 1)]!;

  // Al cambiar de paso el foco va al título: así el lector de pantalla anuncia dónde está.
  const tituloRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    tituloRef.current?.focus();
  }, [paso]);

  if (vinculo.isError || resumenQ.isError) {
    return (
      <div className="space-y-4">
        <EstadoError
          error={vinculo.isError ? vinculo.error : resumenQ.error}
          onRetry={() => void (vinculo.isError ? vinculo.refetch() : resumenQ.refetch())}
        />
        <div className="text-center">
          <Button variant="outlineNavy" asChild>
            <Link to={volver}>Volver a mi cotización</Link>
          </Button>
        </div>
      </div>
    );
  }
  if (resumenQ.isLoading || !resumen) {
    return (
      <div className="space-y-4" aria-busy aria-label="Cargando tu compra">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-56 w-full" />
      </div>
    );
  }
  if (estadoQ.data?.estado === 'CONFIRMADO') return <Navigate to={`/compra/${estadoQ.data.ordenId}/listo`} replace />;

  const irA = (delta: 1 | -1) => setIndice((i) => Math.max(0, Math.min(pasos.length - 1, i + delta)));

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,640px)_1fr]">
      <div>
        <p className="text-small text-ink-soft">
          Paso {indice + 1} de {pasos.length} · <span className="font-bold text-navy-700">{NOMBRE_PASO[paso]}</span>
        </p>
        <div
          role="progressbar"
          aria-label="Avance de la compra"
          aria-valuemin={1}
          aria-valuemax={pasos.length}
          aria-valuenow={indice + 1}
          className="mt-2 mb-5 h-1 overflow-hidden rounded-full bg-navy-100"
        >
          <div className="h-full bg-brand-500 transition-all" style={{ width: `${((indice + 1) / pasos.length) * 100}%` }} />
        </div>

        {paso === 'resumen' ? (
          <PasoResumen
            tituloRef={tituloRef}
            resumen={resumen}
            listo={ordenId !== null || camposQ.data !== undefined || camposQ.isError}
            onSiguiente={() => irA(1)}
            volver={volver}
          />
        ) : paso === 'datos' ? (
          <PasoDatos
            tituloRef={tituloRef}
            cotizacionId={cotizacionId}
            campos={camposQ.data?.campos ?? []}
            onSiguiente={() => irA(1)}
            onAtras={() => irA(-1)}
          />
        ) : paso === 'firma' ? (
          <PasoFirma
            tituloRef={tituloRef}
            cotizacionId={cotizacionId}
            primaCotizadaId={primaCotizadaId}
            crear={crear}
            volver={volver}
            onCreada={() => {
              void resumenQ.refetch();
              irA(1);
            }}
            onAtras={() => irA(-1)}
          />
        ) : (
          <PasoPago
            tituloRef={tituloRef}
            ordenId={ordenId!}
            pago={resumen.pago}
            aseguradora={resumen.aseguradora}
            onAtras={yaTeniaOrden ? undefined : () => irA(-1)}
            onPagada={() => navigate(`/compra/${ordenId}/listo`, { replace: true })}
          />
        )}
      </div>

      <aside className="hidden lg:block" aria-label="Resumen de tu compra">
        <div className="sticky top-6">
          <ResumenCompraCard resumen={resumen} compacto />
        </div>
      </aside>
    </div>
  );
}

type RefTitulo = React.RefObject<HTMLHeadingElement>;

function Titulo({ refTitulo, children }: { refTitulo: RefTitulo; children: string }) {
  return (
    <h1 ref={refTitulo} tabIndex={-1} className="mb-4 text-h2 text-navy-700 outline-none">
      {children}
    </h1>
  );
}

/** Barra de acciones: fija abajo en móvil (botón principal siempre a mano), normal en escritorio. */
function Acciones({ children }: { children: React.ReactNode }) {
  return (
    <div className="sticky bottom-0 z-10 -mx-4 mt-6 flex flex-col-reverse gap-3 border-t border-line bg-surface px-4 py-3 sm:flex-row sm:items-center md:static md:mx-0 md:border-0 md:bg-transparent md:px-0">
      {children}
    </div>
  );
}

/* ───────────── 1 · Resumen ───────────── */

function PasoResumen({
  tituloRef,
  resumen,
  listo,
  onSiguiente,
  volver,
}: {
  tituloRef: RefTitulo;
  resumen: NonNullable<ReturnType<typeof useResumenCompra>['data']>;
  listo: boolean;
  onSiguiente: () => void;
  volver: string;
}) {
  return (
    <>
      <Titulo refTitulo={tituloRef}>Revisa tu compra</Titulo>
      <ResumenCompraCard resumen={resumen} />
      <Acciones>
        <Button variant="ghost" asChild>
          <Link to={volver}>
            <ArrowLeft aria-hidden /> Volver a mi cotización
          </Link>
        </Button>
        <Button size="lg" className="sm:ml-auto" onClick={onSiguiente} disabled={!listo}>
          Continuar
        </Button>
      </Acciones>
    </>
  );
}

/* ───────────── 2 · Datos que faltan (RNF-08) ───────────── */

function PasoDatos({
  tituloRef,
  cotizacionId,
  campos,
  onSiguiente,
  onAtras,
}: {
  tituloRef: RefTitulo;
  cotizacionId: string;
  campos: { campo: 'numeroDocumento' | 'placa'; etiqueta: string; ayuda: string }[];
  onSiguiente: () => void;
  onAtras: () => void;
}) {
  const guardar = useGuardarDatosCompra(cotizacionId);
  const [valores, setValores] = useState<Record<string, string>>({});
  const [errores, setErrores] = useState<Record<string, string>>({});

  // Si ya no falta nada (se guardó todo), no hay nada más que pedir.
  const sinPendientes = campos.length === 0;

  function enviar(e: FormEvent) {
    e.preventDefault();
    const nuevos: Record<string, string> = {};
    const datos: { numeroDocumento?: string; placa?: string } = {};
    for (const c of campos) {
      // Documento y placa se normalizan a mayúsculas (el backend hace lo mismo; así se ve igual que en la póliza).
      const v = (valores[c.campo] ?? '').trim().toUpperCase();
      if (!v) nuevos[c.campo] = `Ingresa ${c.etiqueta.toLowerCase()}`;
      else datos[c.campo] = v;
    }
    setErrores(nuevos);
    if (Object.keys(nuevos).length > 0) return;
    guardar.mutate(datos, {
      onSuccess: (r) => {
        if (r.camposFaltantes.length === 0) onSiguiente();
      },
      onError: (err) => {
        // Errores por campo del backend (formato de documento o placa), tal cual.
        if (isApiError(err) && err.esValidacion) {
          setErrores(Object.fromEntries(err.errors.map((x) => [x.campo, x.mensaje])));
        } else {
          ErrorToast(err);
        }
      },
    });
  }

  return (
    <form onSubmit={enviar} noValidate>
      <Titulo refTitulo={tituloRef}>Faltan unos datos</Titulo>
      <p className="mb-4 text-ink-soft">Solo te pedimos lo que no tenemos todavía.</p>
      {campos.map((c) => (
        <Field key={c.campo} label={c.etiqueta} help={c.ayuda} error={errores[c.campo]} required>
          {(p) => (
            <Input
              {...p}
              value={valores[c.campo] ?? ''}
              onChange={(e) => setValores((v) => ({ ...v, [c.campo]: e.target.value }))}
              autoComplete="off"
              inputMode={c.campo === 'numeroDocumento' ? 'numeric' : 'text'}
              invalid={!!errores[c.campo]}
            />
          )}
        </Field>
      ))}
      <Acciones>
        <Button type="button" variant="ghost" onClick={onAtras}>
          <ArrowLeft aria-hidden /> Atrás
        </Button>
        {sinPendientes ? (
          <Button type="button" size="lg" className="sm:ml-auto" onClick={onSiguiente}>
            Continuar
          </Button>
        ) : (
          <Button type="submit" size="lg" className="sm:ml-auto" loading={guardar.isPending} loadingText="Guardando…">
            Guardar y continuar
          </Button>
        )}
      </Acciones>
    </form>
  );
}

/* ───────────── 3 · Firma y condiciones (RF-24) ───────────── */

function PasoFirma({
  tituloRef,
  cotizacionId,
  primaCotizadaId,
  crear,
  volver,
  onCreada,
  onAtras,
}: {
  tituloRef: RefTitulo;
  cotizacionId: string;
  primaCotizadaId: string;
  crear: ReturnType<typeof useCrearCompra>;
  volver: string;
  onCreada: () => void;
  onAtras: () => void;
}) {
  const { nombre: nombreSesion } = useAuth();
  const [firma, setFirma] = useState('');
  const [acepta, setAcepta] = useState(false);
  const [intento, setIntento] = useState(false);

  const errorFirma = intento && !firma.trim() ? 'Escribe tu nombre completo como firma' : undefined;
  const errorAcepta = intento && !acepta ? 'Debes aceptar las condiciones para continuar' : undefined;

  function enviar(e: FormEvent) {
    e.preventDefault();
    setIntento(true);
    if (!firma.trim() || !acepta) return;
    crear.mutate(
      { cotizacionId, primaCotizadaId, aceptaCondiciones: true, firmaSimulada: firma.trim() },
      { onSuccess: onCreada },
    );
  }

  return (
    <form onSubmit={enviar} noValidate>
      <Titulo refTitulo={tituloRef}>Firma y condiciones</Titulo>
      <p className="mb-4 text-ink-soft">
        Escribe tu nombre completo como firma. Es una firma simulada: este es un documento de demostración sin validez legal.
      </p>

      <Field label="Tu firma (nombre completo)" error={errorFirma} required>
        {(p) => (
          <Input
            {...p}
            value={firma}
            onChange={(e) => setFirma(e.target.value)}
            maxLength={120}
            autoComplete="name"
            placeholder={nombreSesion ?? undefined}
            invalid={!!errorFirma}
          />
        )}
      </Field>

      <div className="mb-4">
        <label className="flex min-h-11 cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={acepta}
            onChange={(e) => setAcepta(e.target.checked)}
            aria-invalid={errorAcepta ? true : undefined}
            aria-describedby={errorAcepta ? 'error-acepta' : undefined}
            className="mt-1 size-5 shrink-0 accent-brand-500"
          />
          <span>Acepto las condiciones de la compra y del plan que elegí.</span>
        </label>
        {errorAcepta ? (
          <p id="error-acepta" role="alert" className="mt-1.5 flex items-start gap-1.5 text-small text-status-danger">
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>{errorAcepta}</span>
          </p>
        ) : null}
      </div>

      {crear.isError ? (
        <div role="alert" className="mb-4 rounded-lg border border-status-danger/30 bg-status-danger/5 p-3">
          <p className="font-bold text-status-danger">{isApiError(crear.error) ? crear.error.message : 'No pudimos registrar tu compra.'}</p>
          {isApiError(crear.error) && crear.error.statusCode === 409 ? (
            <Button variant="link" asChild className="mt-1">
              <Link to={volver}>Volver al comparativo</Link>
            </Button>
          ) : null}
        </div>
      ) : null}

      <Acciones>
        <Button type="button" variant="ghost" onClick={onAtras} disabled={crear.isPending}>
          <ArrowLeft aria-hidden /> Atrás
        </Button>
        <Button type="submit" size="lg" className="sm:ml-auto" loading={crear.isPending} loadingText="Registrando…">
          Firmar y continuar
        </Button>
      </Acciones>
    </form>
  );
}

/* ───────────── 4 · Pago ───────────── */

function PasoPago({
  tituloRef,
  ordenId,
  pago,
  aseguradora,
  onAtras,
  onPagada,
}: {
  tituloRef: RefTitulo;
  ordenId: string;
  pago: NonNullable<ReturnType<typeof useResumenCompra>['data']>['pago'];
  aseguradora: string;
  onAtras: (() => void) | undefined;
  onPagada: () => void;
}) {
  const pagar = usePagar(ordenId);
  const [modo, setModo] = useState<ModoPago>('UNICO');
  const [rechazo, setRechazo] = useState<string | null>(null);
  // Una Idempotency-Key por intento: si la red falla y se repite el clic, la misma clave evita cobrar dos veces.
  // Se renueva solo cuando el intento terminó de forma definitiva (rechazo) o cambió lo que se paga.
  const claveRef = useRef<string | null>(null);

  // En cuotas solo se cobra HOY la primera (la cuota mensual que devuelve el backend); el resto vence mes a mes.
  const enCuotas = modo === 'CUOTAS' && pago.CUOTAS ? pago.CUOTAS : null;
  const etiquetaPagar = enCuotas
    ? `Pagar mi 1.ª cuota: ${formatearMonto(enCuotas.cuotaMensual)}`
    : `Pagar ${formatearMonto(pago.UNICO.total)}`;

  function cambiarModo(m: ModoPago) {
    setModo(m);
    claveRef.current = null;
    setRechazo(null);
  }

  function pagarAhora() {
    claveRef.current ??= nuevaIdempotencyKey();
    setRechazo(null);
    pagar.mutate(
      {
        idempotencyKey: claveRef.current,
        body: modo === 'CUOTAS' && pago.CUOTAS ? { modo, numeroCuotas: pago.CUOTAS.numeroCuotas } : { modo },
      },
      {
        onSuccess: onPagada,
        onError: (err) => {
          if (isApiError(err) && err.statusCode === 409) {
            // Ya estaba pagada (otra pestaña u otro intento): la confirmación muestra el resultado.
            onPagada();
          } else if (isApiError(err) && err.statusCode === 400) {
            // Rechazo o dato inválido: el intento terminó, el próximo usa otra clave. Mensaje del backend tal cual.
            claveRef.current = null;
            setRechazo(err.message);
          } else {
            // Red o servidor: la clave se conserva para reintentar sin riesgo de doble cobro.
            ErrorToast(err);
          }
        },
      },
    );
  }

  return (
    <div>
      <Titulo refTitulo={tituloRef}>Elige cómo pagar</Titulo>
      <SelectorModoPago pago={pago} aseguradora={aseguradora} valor={modo} onChange={cambiarModo} deshabilitado={pagar.isPending} />

      {pagar.isPending ? (
        <p role="status" className="mt-4 flex items-center gap-2 text-ink-soft">
          <Loader2 className="size-5 animate-spin" aria-hidden /> Procesando tu pago…
        </p>
      ) : null}

      {rechazo ? (
        <div role="alert" className="mt-4 flex items-start gap-3 rounded-lg border border-status-danger/30 bg-status-danger/5 p-4">
          <AlertCircle className="mt-0.5 size-5 shrink-0 text-status-danger" aria-hidden />
          <div>
            <p className="font-bold text-status-danger">Tu pago no pudo procesarse</p>
            <p className="text-small text-ink">{rechazo}</p>
          </div>
        </div>
      ) : null}

      {enCuotas ? (
        <p className="mt-4 rounded-lg bg-navy-50 px-3 py-2 text-small text-ink">
          Hoy pagas solo tu 1.ª cuota de <MoneyValue value={enCuotas.cuotaMensual} />. Las otras {enCuotas.numeroCuotas - 1} cuotas
          vencen una cada mes. Total del plan de cuotas: <MoneyValue value={enCuotas.total} />.
        </p>
      ) : null}

      <p className="mt-4 flex items-start gap-2 text-small text-ink-soft">
        <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
        El pago es simulado: no se cobra dinero real.
      </p>

      <Acciones>
        {onAtras ? (
          <Button type="button" variant="ghost" onClick={onAtras} disabled={pagar.isPending}>
            <ArrowLeft aria-hidden /> Atrás
          </Button>
        ) : null}
        <Button size="lg" className="sm:ml-auto" onClick={pagarAhora} loading={pagar.isPending} loadingText="Procesando tu pago…">
          {rechazo ? 'Intentar con otro medio' : etiquetaPagar}
        </Button>
      </Acciones>
    </div>
  );
}


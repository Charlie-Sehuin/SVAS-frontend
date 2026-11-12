import { useEffect, useMemo, useRef, useState } from 'react';
import { Download, RotateCcw, Save, Upload } from 'lucide-react';
import { parseDecimal } from '../../../shared/lib/forms';
import { cn } from '../../../shared/lib/utils';
import {
  NOMBRE_PESO,
  PESO_DECIMALES,
  PESO_MAX,
  PESO_MIN,
  tablasDe,
  usoPesos,
} from '../../../shared/lib/tarifas.constants';
import type { PesoVista, TablaPeso } from '../../../shared/types/api';
import { Badge } from '../../../shared/ui/badge';
import { Button } from '../../../shared/ui/button';
import { Input } from '../../../shared/ui/input';
import { Select } from '../../../shared/ui/select';
import { Skeleton } from '../../../shared/ui/skeleton';
import { Table, TBody, TD, TH, THead, TR } from '../../../shared/ui/table';
import { EstadoError, EstadoVacio } from '../../../shared/ui/domain/EstadoVacio';
import { Filtro, FiltrosBar } from '../../../shared/ui/domain/FiltrosBar';
import { PageHeader } from '../../../shared/ui/domain/PageHeader';
import { ErrorToast, SuccessToast, WarningToast } from '../../../shared/ui/domain/toasts';
import { TarifasTabs } from '../tarifas/TarifasTabs';
import { useAseguradoras, useGuardarPesos, usePesos } from '../hooks/useAdmin';

interface Borrador {
  peso: string;
  /** Fila que vino del CSV y aún no existía en la tabla. */
  nuevo?: boolean;
  nombre?: string;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function claveValida(tabla: TablaPeso, clave: string): boolean {
  if (tabla === 'anio') return /^\d{4}$/.test(clave) && +clave >= 1950 && +clave <= 2100;
  if (tabla === 'ubigeo') return /^\d{6}$/.test(clave);
  return UUID.test(clave);
}

/** Valida un peso (RN-40): entre 0,500 y 3,000 con hasta 3 decimales. Devuelve el mensaje o `null`. */
function errorDePeso(texto: string): string | null {
  const n = parseDecimal(texto);
  if (n === null) return 'Escribe un número';
  if (n < PESO_MIN || n > PESO_MAX) return `Entre ${PESO_MIN.toFixed(3)} y ${PESO_MAX.toFixed(3)}`;
  if ((texto.trim().replace(',', '.').split('.')[1] ?? '').length > PESO_DECIMALES) return `Hasta ${PESO_DECIMALES} decimales`;
  return null;
}

/** Pesos por marca, modelo, año, tipo y distrito (doc de dominio §17). Solo se muestran las tablas que usa la fórmula de la aseguradora. */
export function TarifasPesosPage() {
  const aseguradoras = useAseguradoras();
  const [aseguradoraId, setAseguradoraId] = useState('');
  const aseguradora = aseguradoras.data?.find((a) => a.id === aseguradoraId);
  const tablas = aseguradora ? tablasDe(aseguradora.codigoEstrategia) : [];
  const [tabla, setTabla] = useState<TablaPeso>('marca');

  // Si la tabla elegida no aplica a la aseguradora nueva, vuelve a la primera que sí aplica.
  useEffect(() => {
    if (tablas.length > 0 && !tablas.includes(tabla)) setTabla(tablas[0]!);
  }, [tablas, tabla]);

  const pesos = usePesos(tabla, aseguradora ? aseguradoraId : null);
  const guardar = useGuardarPesos();
  const [borrador, setBorrador] = useState<Map<string, Borrador>>(new Map());
  const [busqueda, setBusqueda] = useState('');
  const archivo = useRef<HTMLInputElement>(null);

  // Cambiar de aseguradora o de tabla descarta los cambios sin guardar.
  useEffect(() => {
    setBorrador(new Map());
    setBusqueda('');
  }, [aseguradoraId, tabla]);

  /** Filas = las de la tabla + las nuevas que trajo un CSV. */
  const filas = useMemo<(PesoVista & { nuevo?: boolean })[]>(() => {
    const base = pesos.data ?? [];
    const claves = new Set(base.map((p) => p.clave));
    const nuevas = [...borrador.entries()]
      .filter(([k, b]) => b.nuevo && !claves.has(k))
      .map(([clave, b]) => ({ clave, nombre: b.nombre ?? clave, peso: b.peso, nuevo: true }));
    return [...base, ...nuevas];
  }, [pesos.data, borrador]);

  const valorDe = (f: PesoVista) => borrador.get(f.clave)?.peso ?? f.peso;
  const cambiada = (f: PesoVista & { nuevo?: boolean }) => {
    const b = borrador.get(f.clave);
    if (!b) return false;
    if (f.nuevo) return true;
    const n = parseDecimal(b.peso);
    return n === null || n !== Number(f.peso);
  };

  const visibles = filas.filter((f) => f.nombre.toLowerCase().includes(busqueda.trim().toLowerCase()) || f.clave.includes(busqueda.trim()));
  const cambiadas = filas.filter(cambiada);
  const conError = cambiadas.filter((f) => errorDePeso(valorDe(f)) !== null).length;

  /**
   * Se conserva siempre lo que el usuario escribe, aunque un texto intermedio coincida con el original
   * ("1" frente a "1.000"): si se descartara, el campo volvería al original mientras se teclea.
   * Qué filas cambiaron lo decide `cambiada()` comparando números.
   */
  const editar = (f: PesoVista, texto: string) =>
    setBorrador((prev) => new Map(prev).set(f.clave, { ...prev.get(f.clave), peso: texto }));

  const onGuardar = () => {
    if (!aseguradora || conError > 0) return;
    guardar.mutate(
      {
        tabla,
        aseguradoraId: aseguradora.id,
        filas: cambiadas.map((f) => ({ clave: f.clave, peso: parseDecimal(valorDe(f))! })),
      },
      {
        onSuccess: (r) => {
          SuccessToast('Pesos guardados', `${r.cambiadas} cambiados de ${r.recibidas} recibidos.`);
          setBorrador(new Map());
        },
        onError: (e) => ErrorToast(e),
      },
    );
  };

  /* ───── CSV ───── */
  const descargar = () => {
    const lineas = ['clave,nombre,peso', ...filas.map((f) => `${f.clave},"${f.nombre.replace(/"/g, '""')}",${valorDe(f)}`)];
    const url = URL.createObjectURL(new Blob([lineas.join('\n')], { type: 'text/csv;charset=utf-8' }));
    const a = Object.assign(document.createElement('a'), {
      href: url,
      download: `pesos-${aseguradora?.nombre.toLowerCase().replace(/\s+/g, '-') ?? 'aseguradora'}-${tabla}.csv`,
    });
    a.click();
    URL.revokeObjectURL(url);
  };

  const cargarCsv = async (file: File) => {
    const texto = await file.text();
    const lineas = texto.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const errores: string[] = [];
    const nuevo = new Map(borrador);
    const claves = new Set(filas.map((f) => f.clave));
    let leidas = 0;

    lineas.forEach((linea, i) => {
      // Acepta coma, punto y coma o tabulador. Solo se usan la primera y la última columna (clave y peso).
      const partes = linea.split(/[,;\t]/).map((p) => p.trim().replace(/^"|"$/g, ''));
      const clave = partes[0] ?? '';
      const peso = partes[partes.length - 1] ?? '';
      if (i === 0 && parseDecimal(peso) === null) return; // encabezado
      if (!claveValida(tabla, clave)) {
        errores.push(`Línea ${i + 1}: la clave "${clave}" no es un ${NOMBRE_PESO[tabla].toLowerCase()} válido`);
        return;
      }
      const e = errorDePeso(peso);
      if (e) {
        errores.push(`Línea ${i + 1}: ${e.toLowerCase()} (${peso})`);
        return;
      }
      leidas += 1;
      const existente = filas.find((f) => f.clave === clave);
      if (existente && Number(existente.peso) === parseDecimal(peso)) nuevo.delete(clave);
      else nuevo.set(clave, { peso, ...(claves.has(clave) ? {} : { nuevo: true, nombre: partes.length > 2 ? partes[1] : clave }) });
    });

    setBorrador(nuevo);
    if (errores.length > 0) {
      WarningToast(
        `Se cargaron ${leidas} filas. ${errores.length} se omitieron: ${errores.slice(0, 3).join('; ')}${errores.length > 3 ? '…' : ''}`,
      );
    } else {
      SuccessToast(`Se cargaron ${leidas} filas. Revisa y pulsa Guardar.`);
    }
    if (archivo.current) archivo.current.value = '';
  };

  const nota = aseguradora && usoPesos(aseguradora.codigoEstrategia).opcionales.includes(tabla);

  return (
    <>
      <PageHeader
        titulo="Tarifas · Pesos"
        descripcion="Menor que 1 es descuento y mayor que 1 es recargo. El rango válido es de 0,500 a 3,000. Un peso faltante hace que esa aseguradora no cotice ese vehículo."
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
      <TarifasTabs />

      <FiltrosBar>
        <Filtro label="Aseguradora" className="min-w-56">
          <Select compact value={aseguradoraId} onChange={(e) => setAseguradoraId(e.target.value)}>
            <option value="">Elige una aseguradora</option>
            {aseguradoras.data?.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nombre}
              </option>
            ))}
          </Select>
        </Filtro>
        <Filtro label="Tabla" className="min-w-48">
          <Select compact value={tabla} disabled={!aseguradora} onChange={(e) => setTabla(e.target.value as TablaPeso)}>
            {(aseguradora ? tablas : (['marca'] as TablaPeso[])).map((t) => (
              <option key={t} value={t}>
                {NOMBRE_PESO[t]}
              </option>
            ))}
          </Select>
        </Filtro>
        <Filtro label="Buscar" className="min-w-48 flex-1">
          <Input type="search" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Nombre o clave" className="h-10" disabled={!aseguradora} />
        </Filtro>
        <div className="flex gap-2">
          <Button variant="outlineNavy" size="sm" onClick={descargar} disabled={filas.length === 0}>
            <Download aria-hidden /> Descargar CSV
          </Button>
          <Button variant="outlineNavy" size="sm" onClick={() => archivo.current?.click()} disabled={!aseguradora}>
            <Upload aria-hidden /> Cargar CSV
          </Button>
          <input
            ref={archivo}
            type="file"
            accept=".csv,.txt,text/csv"
            className="sr-only"
            tabIndex={-1}
            aria-label="Archivo CSV de pesos"
            onChange={(e) => e.target.files?.[0] && void cargarCsv(e.target.files[0])}
          />
        </div>
      </FiltrosBar>

      {nota ? (
        <p className="mb-3 rounded-lg bg-status-info/10 p-3 text-small text-ink">
          En {aseguradora?.nombre}, un {NOMBRE_PESO[tabla].toLowerCase()} sin peso usa 1,000 (zona estándar); no bloquea la cotización.
        </p>
      ) : null}

      {!aseguradora ? (
        <EstadoVacio titulo="Elige una aseguradora para ver sus pesos." />
      ) : pesos.isError ? (
        <EstadoError error={pesos.error} onRetry={() => void pesos.refetch()} />
      ) : pesos.isLoading ? (
        <div className="space-y-2" aria-busy aria-label="Cargando pesos">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="h-11 w-full" />
          ))}
        </div>
      ) : visibles.length === 0 ? (
        <EstadoVacio titulo={filas.length === 0 ? 'Esta tabla aún no tiene pesos. Carga un CSV para empezar.' : 'Ningún resultado con esa búsqueda.'} />
      ) : (
        <Table caption={`Pesos de ${NOMBRE_PESO[tabla]} de ${aseguradora.nombre}`}>
          <THead>
            <TR>
              <TH>{NOMBRE_PESO[tabla]}</TH>
              <TH className="w-48">Peso</TH>
              <TH className="w-40">Estado</TH>
            </TR>
          </THead>
          <TBody>
            {visibles.map((f) => {
              const texto = valorDe(f);
              const mod = cambiada(f);
              const error = mod ? errorDePeso(texto) : null;
              return (
                <TR key={f.clave} className={cn('h-14', mod && 'bg-brand-50/40')}>
                  <TD>
                    <span className="font-bold text-ink">{f.nombre}</span>
                    {tabla !== 'anio' && tabla !== 'ubigeo' ? null : <span className="ml-2 font-mono text-ink-soft">{f.clave}</span>}
                  </TD>
                  <TD>
                    <Input
                      inputMode="decimal"
                      value={texto}
                      aria-label={`Peso de ${f.nombre}`}
                      invalid={!!error}
                      aria-describedby={error ? `err-${f.clave}` : undefined}
                      className="h-10 font-mono"
                      onChange={(e) => editar(f, e.target.value)}
                    />
                    {error ? (
                      <p id={`err-${f.clave}`} role="alert" className="mt-1 text-small text-status-danger">
                        {error}
                      </p>
                    ) : null}
                  </TD>
                  <TD>{f.nuevo ? <Badge tone="info">Nuevo</Badge> : mod ? <Badge tone="brand">Sin guardar</Badge> : null}</TD>
                </TR>
              );
            })}
          </TBody>
        </Table>
      )}
    </>
  );
}

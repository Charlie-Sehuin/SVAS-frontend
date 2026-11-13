import { useEffect, useMemo, useState } from 'react';
import { Plus, RotateCcw, Save } from 'lucide-react';
import { aDecimal, formatearPorcentaje } from '../../../shared/lib/format';
import { parseDecimal } from '../../../shared/lib/forms';
import { cn } from '../../../shared/lib/utils';
import type { ZonaAdmin } from '../../../shared/types/api';
import { TEXTO_USO, USOS_VEHICULO, type UsoVehiculo, type ZonaRiesgo } from '../../../shared/types/enums';
import { Badge } from '../../../shared/ui/badge';
import { Button } from '../../../shared/ui/button';
import { Input } from '../../../shared/ui/input';
import { Select } from '../../../shared/ui/select';
import { Skeleton } from '../../../shared/ui/skeleton';
import { Table, TBody, TD, TH, THead, TR } from '../../../shared/ui/table';
import { EstadoError, EstadoVacio } from '../../../shared/ui/domain/EstadoVacio';
import { Filtro, FiltrosBar } from '../../../shared/ui/domain/FiltrosBar';
import { PageHeader } from '../../../shared/ui/domain/PageHeader';
import { ErrorToast, SuccessToast } from '../../../shared/ui/domain/toasts';
import { useDistritos } from '../../cotizacion/hooks/useCatalogo';
import { SelectorUbigeoCascada, UBIGEO_VACIO, type ValorUbigeo } from '../../cotizacion/components/SelectorUbigeoCascada';
import {
  useEscenariosAdmin,
  useFrecuenciasAdmin,
  useGuardarFrecuencias,
  useGuardarZonas,
  useZonasAdmin,
} from '../hooks/usePruebaChoqueAdmin';
import { AvisoReferencial, PruebaChoqueTabs } from '../prueba-choque/PruebaChoqueTabs';
import { TEXTO_ZONA, ZONAS } from '../prueba-choque/textos';

const MIN = 0.0001;
const MAX = 0.95;

/** Probabilidad anual: de 0,0001 a 0,95 con hasta 4 decimales (el backend vuelve a validar). */
function errorDeProbabilidad(texto: string): string | null {
  const n = parseDecimal(texto);
  if (n === null) return 'Escribe un número';
  if (n < MIN || n > MAX) return 'Entre 0,0001 y 0,95';
  if ((texto.trim().replace(',', '.').split('.')[1] ?? '').length > 4) return 'Hasta 4 decimales';
  return null;
}

/** "0.12" → "12 % al año". Solo cambia la forma de mostrar una probabilidad; no interviene en ningún monto. */
const comoPorcentaje = (texto: string) => `${formatearPorcentaje(aDecimal(texto.replace(',', '.')).times(100).toString())} al año`;

/**
 * `/app/admin/prueba-choque/frecuencias` (RF-36, RN-31): qué tan probable es cada escenario en un año, según el uso del
 * vehículo y la zona de riesgo del distrito; y qué zona tiene cada distrito (los que no figuran cuentan como MEDIA).
 */
export function PruebaChoqueFrecuenciasPage() {
  return (
    <>
      <PageHeader
        titulo="Prueba de Choque · Frecuencias y zonas"
        descripcion="Probabilidad anual de cada escenario por uso del vehículo y zona de riesgo, y la zona de cada distrito."
      />
      <PruebaChoqueTabs />
      <AvisoReferencial />
      <SeccionFrecuencias />
      <SeccionZonas />
    </>
  );
}

/* ───────────────────────── Frecuencias ───────────────────────── */

function SeccionFrecuencias() {
  const escenariosQ = useEscenariosAdmin();
  const [escenario, setEscenario] = useState('');
  const frecuenciasQ = useFrecuenciasAdmin(escenario || null);
  const guardar = useGuardarFrecuencias();
  const [borrador, setBorrador] = useState<Map<string, string>>(new Map());

  const escenarios = escenariosQ.data ?? [];
  // Al cargar, se elige el primer escenario para que la pantalla no empiece vacía.
  useEffect(() => {
    if (!escenario && escenarios.length > 0) setEscenario(escenarios[0]!.codigo);
  }, [escenario, escenarios]);
  useEffect(() => setBorrador(new Map()), [escenario]);

  const clave = (uso: UsoVehiculo, zona: ZonaRiesgo) => `${uso}|${zona}`;
  const guardado = (uso: UsoVehiculo, zona: ZonaRiesgo) => frecuenciasQ.data?.find((f) => f.uso === uso && f.zona === zona)?.probabilidadAnual ?? '';
  const valorDe = (uso: UsoVehiculo, zona: ZonaRiesgo) => borrador.get(clave(uso, zona)) ?? guardado(uso, zona);
  const cambiada = (uso: UsoVehiculo, zona: ZonaRiesgo) => {
    const b = borrador.get(clave(uso, zona));
    if (b === undefined || b.trim() === '') return false;
    const original = guardado(uso, zona);
    const n = parseDecimal(b);
    return original === '' || n === null || n !== Number(original);
  };

  const cambios = USOS_VEHICULO.flatMap((u) => ZONAS.filter((z) => cambiada(u, z)).map((z) => ({ uso: u, zona: z })));
  const conError = cambios.filter((c) => errorDeProbabilidad(valorDe(c.uso, c.zona)) !== null).length;

  function onGuardar() {
    if (!escenario || conError > 0 || cambios.length === 0) return;
    guardar.mutate(
      cambios.map((c) => ({ escenario, uso: c.uso, zona: c.zona, probabilidadAnual: parseDecimal(valorDe(c.uso, c.zona))! })),
      {
        onSuccess: (r) => {
          SuccessToast('Frecuencias guardadas', `${r.cambiadas} cambiadas de ${r.recibidas} recibidas.`);
          setBorrador(new Map());
        },
        onError: (e) => ErrorToast(e),
      },
    );
  }

  return (
    <section aria-labelledby="titulo-frecuencias" className="mb-10">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 id="titulo-frecuencias" className="text-h3 text-navy-700">
          Frecuencias
        </h2>
        <div className="flex gap-2">
          <Button variant="ghost" disabled={cambios.length === 0 || guardar.isPending} onClick={() => setBorrador(new Map())}>
            <RotateCcw aria-hidden /> Descartar
          </Button>
          <Button disabled={cambios.length === 0 || conError > 0} loading={guardar.isPending} onClick={onGuardar}>
            <Save aria-hidden /> Guardar frecuencias{cambios.length > 0 ? ` (${cambios.length})` : ''}
          </Button>
        </div>
      </div>

      <FiltrosBar>
        <Filtro label="Escenario" className="min-w-64">
          <Select compact value={escenario} onChange={(e) => setEscenario(e.target.value)}>
            {escenarios.map((e) => (
              <option key={e.codigo} value={e.codigo}>
                {e.nombre}
                {e.activo ? '' : ' (inactivo)'}
              </option>
            ))}
          </Select>
        </Filtro>
      </FiltrosBar>

      {escenariosQ.isError || frecuenciasQ.isError ? (
        <EstadoError error={escenariosQ.error ?? frecuenciasQ.error} onRetry={() => void (escenariosQ.isError ? escenariosQ.refetch() : frecuenciasQ.refetch())} />
      ) : escenariosQ.isLoading || (escenarios.length > 0 && (escenario === '' || frecuenciasQ.isLoading)) ? (
        <Skeleton className="h-48 w-full" aria-busy aria-label="Cargando las frecuencias" />
      ) : escenarios.length === 0 ? (
        <EstadoVacio titulo="Primero crea los escenarios." />
      ) : (
        <Table caption="Probabilidad anual por uso y zona">
          <THead>
            <tr>
              <TH>Uso del vehículo</TH>
              {ZONAS.map((z) => (
                <TH key={z} className="w-48">
                  Zona {TEXTO_ZONA[z].toLowerCase()}
                </TH>
              ))}
            </tr>
          </THead>
          <TBody>
            {USOS_VEHICULO.map((uso) => (
              <TR key={uso} className="h-20 align-top">
                <TD className="font-bold text-navy-700">{TEXTO_USO[uso]}</TD>
                {ZONAS.map((zona) => {
                  const texto = valorDe(uso, zona);
                  const mod = cambiada(uso, zona);
                  const error = mod ? errorDeProbabilidad(texto) : null;
                  const falta = texto === '' && guardado(uso, zona) === '';
                  return (
                    <TD key={zona} className={cn(mod && 'bg-brand-50/40')}>
                      <Input
                        inputMode="decimal"
                        value={texto}
                        placeholder="—"
                        aria-label={`Probabilidad anual, ${TEXTO_USO[uso]}, zona ${TEXTO_ZONA[zona].toLowerCase()}`}
                        invalid={!!error}
                        className="h-10 font-mono"
                        onChange={(ev) => setBorrador((prev) => new Map(prev).set(clave(uso, zona), ev.target.value))}
                      />
                      {error ? (
                        <p role="alert" className="mt-1 text-caption text-status-danger">
                          {error}
                        </p>
                      ) : falta && !mod ? (
                        <Badge tone="warning" className="mt-1">
                          Falta: el motor usa 0
                        </Badge>
                      ) : texto !== '' && errorDeProbabilidad(texto) === null ? (
                        <p className="mt-1 text-caption text-ink-soft">{comoPorcentaje(texto)}</p>
                      ) : null}
                    </TD>
                  );
                })}
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </section>
  );
}

/* ───────────────────────── Zonas ───────────────────────── */

interface BorradorZona {
  zona: ZonaRiesgo;
  /** Distrito que no estaba en la lista (se agregó aquí). */
  nuevo?: { distrito: string; provincia: string; departamento: string };
}

function SeccionZonas() {
  const [filtro, setFiltro] = useState<ZonaRiesgo | ''>('');
  const [busqueda, setBusqueda] = useState('');
  const zonasQ = useZonasAdmin(filtro || undefined);
  const guardar = useGuardarZonas();
  const [borrador, setBorrador] = useState<Map<string, BorradorZona>>(new Map());

  // Para agregar un distrito que aún no figura (cuenta como MEDIA hasta que se le asigne una zona).
  const [ubigeo, setUbigeo] = useState<ValorUbigeo>(UBIGEO_VACIO);
  const [zonaNueva, setZonaNueva] = useState<ZonaRiesgo>('ALTA');
  const distritos = useDistritos(ubigeo.departamento || null, ubigeo.provincia || null);

  useEffect(() => setBorrador(new Map()), [filtro]);

  const filas = useMemo<(ZonaAdmin & { nuevo?: boolean })[]>(() => {
    const base = zonasQ.data ?? [];
    const claves = new Set(base.map((z) => z.ubigeo));
    const nuevas = [...borrador.entries()]
      .filter(([k, b]) => b.nuevo && !claves.has(k))
      .map(([k, b]) => ({ ubigeo: k, ...b.nuevo!, zona: b.zona, nuevo: true }));
    return [...base, ...nuevas];
  }, [zonasQ.data, borrador]);

  const zonaDe = (z: ZonaAdmin) => borrador.get(z.ubigeo)?.zona ?? z.zona;
  const cambiada = (z: ZonaAdmin & { nuevo?: boolean }) => z.nuevo === true || (borrador.has(z.ubigeo) && borrador.get(z.ubigeo)!.zona !== z.zona);
  const cambiadas = filas.filter(cambiada);
  const visibles = filas.filter((z) => `${z.distrito} ${z.provincia} ${z.departamento} ${z.ubigeo}`.toLowerCase().includes(busqueda.trim().toLowerCase()));

  function agregar() {
    if (!ubigeo.ubigeo) return;
    const nombre = distritos.data?.find((d) => d.ubigeo === ubigeo.ubigeo)?.distrito ?? ubigeo.ubigeo;
    setBorrador((prev) =>
      new Map(prev).set(ubigeo.ubigeo, { zona: zonaNueva, nuevo: { distrito: nombre, provincia: ubigeo.provincia, departamento: ubigeo.departamento } }),
    );
    setUbigeo(UBIGEO_VACIO);
  }

  function onGuardar() {
    if (cambiadas.length === 0) return;
    guardar.mutate(
      cambiadas.map((z) => ({ ubigeo: z.ubigeo, zona: zonaDe(z) })),
      {
        onSuccess: (r) => {
          SuccessToast('Zonas guardadas', `${r.cambiadas} cambiadas de ${r.recibidas} recibidas.`);
          setBorrador(new Map());
        },
        onError: (e) => ErrorToast(e),
      },
    );
  }

  return (
    <section aria-labelledby="titulo-zonas">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 id="titulo-zonas" className="text-h3 text-navy-700">
          Zonas de riesgo por distrito
        </h2>
        <div className="flex gap-2">
          <Button variant="ghost" disabled={cambiadas.length === 0 || guardar.isPending} onClick={() => setBorrador(new Map())}>
            <RotateCcw aria-hidden /> Descartar
          </Button>
          <Button disabled={cambiadas.length === 0} loading={guardar.isPending} onClick={onGuardar}>
            <Save aria-hidden /> Guardar zonas{cambiadas.length > 0 ? ` (${cambiadas.length})` : ''}
          </Button>
        </div>
      </div>
      <p className="mb-3 text-small text-ink-soft">Los distritos que no están en la lista cuentan como zona media.</p>

      <FiltrosBar>
        <Filtro label="Zona" className="min-w-40">
          <Select compact value={filtro} onChange={(e) => setFiltro(e.target.value as ZonaRiesgo | '')}>
            <option value="">Todas</option>
            {ZONAS.map((z) => (
              <option key={z} value={z}>
                {TEXTO_ZONA[z]}
              </option>
            ))}
          </Select>
        </Filtro>
        <Filtro label="Buscar" className="min-w-48 flex-1">
          <Input type="search" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Distrito, provincia o ubigeo" className="h-10" />
        </Filtro>
      </FiltrosBar>

      <details className="mb-4 rounded-xl border border-line bg-surface p-3">
        <summary className="cursor-pointer font-bold text-navy-700">Agregar un distrito que no figura</summary>
        <div className="mt-3 grid gap-x-4 sm:grid-cols-3">
          <SelectorUbigeoCascada value={ubigeo} onChange={setUbigeo} compact />
        </div>
        <div className="mt-1 flex flex-wrap items-end gap-3">
          <Filtro label="Zona" className="min-w-40">
            <Select compact value={zonaNueva} onChange={(e) => setZonaNueva(e.target.value as ZonaRiesgo)}>
              {ZONAS.map((z) => (
                <option key={z} value={z}>
                  {TEXTO_ZONA[z]}
                </option>
              ))}
            </Select>
          </Filtro>
          <Button variant="outlineNavy" size="sm" disabled={!ubigeo.ubigeo} onClick={agregar}>
            <Plus aria-hidden /> Agregar a la lista
          </Button>
        </div>
      </details>

      {zonasQ.isError ? (
        <EstadoError error={zonasQ.error} onRetry={() => void zonasQ.refetch()} />
      ) : zonasQ.isLoading ? (
        <Skeleton className="h-48 w-full" aria-busy aria-label="Cargando las zonas" />
      ) : visibles.length === 0 ? (
        <EstadoVacio titulo={filas.length === 0 ? 'Todavía no hay distritos con zona propia.' : 'Ningún distrito con esa búsqueda.'} />
      ) : (
        <Table caption="Zona de riesgo de cada distrito">
          <THead>
            <tr>
              <TH>Distrito</TH>
              <TH>Provincia</TH>
              <TH>Ubigeo</TH>
              <TH className="w-44">Zona</TH>
              <TH className="w-32">Estado</TH>
            </tr>
          </THead>
          <TBody>
            {visibles.map((z) => {
              const mod = cambiada(z);
              return (
                <TR key={z.ubigeo} className={cn('h-14', mod && 'bg-brand-50/40')}>
                  <TD className="font-bold text-navy-700">{z.distrito}</TD>
                  <TD>{z.provincia}</TD>
                  <TD className="font-mono">{z.ubigeo}</TD>
                  <TD>
                    <Select
                      compact
                      value={zonaDe(z)}
                      aria-label={`Zona de ${z.distrito}`}
                      onChange={(e) => setBorrador((prev) => new Map(prev).set(z.ubigeo, { ...prev.get(z.ubigeo), zona: e.target.value as ZonaRiesgo }))}
                    >
                      {ZONAS.map((zona) => (
                        <option key={zona} value={zona}>
                          {TEXTO_ZONA[zona]}
                        </option>
                      ))}
                    </Select>
                  </TD>
                  <TD>{z.nuevo ? <Badge tone="info">Nuevo</Badge> : mod ? <Badge tone="brand">Sin guardar</Badge> : null}</TD>
                </TR>
              );
            })}
          </TBody>
        </Table>
      )}
    </section>
  );
}

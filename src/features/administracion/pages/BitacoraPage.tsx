import { Fragment, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { formatearFecha } from '../../../shared/lib/format';
import type { FiltroBitacora } from '../../../shared/types/api';
import { Badge } from '../../../shared/ui/badge';
import { Input } from '../../../shared/ui/input';
import { Skeleton } from '../../../shared/ui/skeleton';
import { Table, TBody, TD, TH, THead, TR } from '../../../shared/ui/table';
import { EstadoError, EstadoVacio } from '../../../shared/ui/domain/EstadoVacio';
import { Filtro, FiltrosBar } from '../../../shared/ui/domain/FiltrosBar';
import { PageHeader } from '../../../shared/ui/domain/PageHeader';
import { Paginacion } from '../../../shared/ui/domain/Paginacion';
import { useBitacora } from '../hooks/useAdmin';

const TAMANO = 25;

/** Entidades más comunes como sugerencia; el filtro acepta cualquier nombre (minúsculas y guion bajo). */
const ENTIDADES_SUGERIDAS = ['usuario', 'aseguradora', 'plan', 'campo_requerido', 'parametros_comerciales', 'regla_inspeccion', 'tarifa_plan'];

/** Inicio y fin de día de Lima (UTC-5, sin horario de verano) como ISO 8601. */
const inicioDia = (yyyyMmDd: string) => `${yyyyMmDd}T00:00:00-05:00`;
const finDia = (yyyyMmDd: string) => `${yyyyMmDd}T23:59:59.999-05:00`;

/** Bitácora de solo lectura (RNF-12): quién cambió qué y cuándo, con el antes y el después. */
export function BitacoraPage() {
  const [entidad, setEntidad] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [pagina, setPagina] = useState(1);
  const [abierta, setAbierta] = useState<string | null>(null);

  const entidadValida = /^[a-z_]{1,40}$/.test(entidad.trim());
  const filtros: FiltroBitacora = {
    pagina,
    tamano: TAMANO,
    ...(entidadValida ? { entidad: entidad.trim() } : {}),
    ...(desde ? { desde: inicioDia(desde) } : {}),
    ...(hasta ? { hasta: finDia(hasta) } : {}),
  };
  const { data, isLoading, isError, error, refetch, isFetching } = useBitacora(filtros);
  const rangoInvertido = !!desde && !!hasta && desde > hasta;

  const reiniciar = () => {
    setPagina(1);
    setAbierta(null);
  };

  return (
    <>
      <PageHeader titulo="Bitácora" descripcion="Registro de cambios hechos por usuarios y por el sistema. Solo lectura." />

      <FiltrosBar>
        <Filtro label="Entidad">
          <>
            <Input
              list="entidades-bitacora"
              value={entidad}
              onChange={(e) => {
                setEntidad(e.target.value.toLowerCase());
                reiniciar();
              }}
              placeholder="p. ej. plan"
              autoComplete="off"
              className="h-10"
              aria-invalid={entidad !== '' && !entidadValida ? true : undefined}
            />
            <datalist id="entidades-bitacora">
              {ENTIDADES_SUGERIDAS.map((e) => (
                <option key={e} value={e} />
              ))}
            </datalist>
          </>
        </Filtro>
        <Filtro label="Desde">
          <Input
            type="date"
            value={desde}
            max={hasta || undefined}
            onChange={(e) => {
              setDesde(e.target.value);
              reiniciar();
            }}
            className="h-10"
          />
        </Filtro>
        <Filtro label="Hasta">
          <Input
            type="date"
            value={hasta}
            min={desde || undefined}
            onChange={(e) => {
              setHasta(e.target.value);
              reiniciar();
            }}
            className="h-10"
          />
        </Filtro>
        {entidad !== '' && !entidadValida ? (
          <p role="alert" className="pb-2 text-small text-status-danger">
            La entidad va en minúsculas y con guion bajo.
          </p>
        ) : null}
        {rangoInvertido ? (
          <p role="alert" className="pb-2 text-small text-status-danger">
            La fecha “desde” no puede ser posterior a “hasta”.
          </p>
        ) : null}
      </FiltrosBar>

      {isError ? (
        <EstadoError error={error} onRetry={() => void refetch()} />
      ) : isLoading ? (
        <div className="space-y-2" aria-busy aria-label="Cargando bitácora">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="h-11 w-full" />
          ))}
        </div>
      ) : data && data.items.length === 0 ? (
        <EstadoVacio titulo="No hay registros con esos filtros." />
      ) : data ? (
        <div className={isFetching ? 'opacity-70 transition-opacity' : undefined}>
          <Table caption="Bitácora de actividad">
            <THead>
              <TR>
                <TH className="w-10">
                  <span className="sr-only">Detalle</span>
                </TH>
                <TH>Fecha</TH>
                <TH>Acción</TH>
                <TH>Entidad</TH>
                <TH>Usuario</TH>
              </TR>
            </THead>
            <TBody>
              {data.items.map((e) => {
                const expandida = abierta === e.id;
                return (
                  <Fragment key={e.id}>
                    <TR>
                      <TD>
                        <button
                          type="button"
                          aria-expanded={expandida}
                          aria-label={`${expandida ? 'Ocultar' : 'Ver'} detalle de ${e.accion}`}
                          onClick={() => setAbierta(expandida ? null : e.id)}
                          className="flex size-8 items-center justify-center rounded-lg text-ink-soft hover:bg-surface-muted"
                        >
                          {expandida ? <ChevronDown className="size-4" aria-hidden /> : <ChevronRight className="size-4" aria-hidden />}
                        </button>
                      </TD>
                      <TD className="whitespace-nowrap tabular">{formatearFecha(e.fecha, 'hora')}</TD>
                      <TD>
                        <Badge tone="navy" dot={false}>
                          {e.accion}
                        </Badge>
                      </TD>
                      <TD className="font-mono">{e.entidad}</TD>
                      <TD className="font-mono text-ink-soft" title={e.usuarioId ?? undefined}>
                        {e.usuarioId ? `${e.usuarioId.slice(0, 8)}…` : 'Sistema'}
                      </TD>
                    </TR>
                    {expandida ? (
                      <tr>
                        <td colSpan={5} className="bg-surface-muted px-4 py-3">
                          <DetalleBitacora detalle={e.detalle} entidadId={e.entidadId} />
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })}
            </TBody>
          </Table>
          <Paginacion
            pagina={data.pagina}
            tamano={data.tamano}
            total={data.total}
            onChange={(p) => {
              setPagina(p);
              setAbierta(null);
            }}
          />
        </div>
      ) : null}
    </>
  );
}

/** "Antes / después" en dos columnas cuando el detalle los trae; si no, el JSON tal cual. */
function DetalleBitacora({ detalle, entidadId }: { detalle: unknown; entidadId: string | null }) {
  const obj = detalle && typeof detalle === 'object' ? (detalle as Record<string, unknown>) : null;
  const tieneAntesDespues = !!obj && ('antes' in obj || 'despues' in obj);
  return (
    <div className="space-y-3 text-small">
      {entidadId ? (
        <p className="text-ink-soft">
          Id de la entidad: <code className="select-all font-mono">{entidadId}</code>
        </p>
      ) : null}
      {tieneAntesDespues ? (
        <div className="grid gap-3 md:grid-cols-2">
          <Bloque titulo="Antes" valor={obj.antes} />
          <Bloque titulo="Después" valor={obj.despues} />
        </div>
      ) : detalle == null ? (
        <p className="text-ink-soft">Sin detalle.</p>
      ) : (
        <Bloque titulo="Detalle" valor={detalle} />
      )}
    </div>
  );
}

function Bloque({ titulo, valor }: { titulo: string; valor: unknown }) {
  return (
    <div>
      <p className="mb-1 text-caption text-ink-soft">{titulo}</p>
      <pre className="max-h-64 overflow-auto rounded-lg border border-line bg-surface p-3 font-mono text-[13px] leading-5">
        {valor === undefined || valor === null ? '—' : JSON.stringify(valor, null, 2)}
      </pre>
    </div>
  );
}

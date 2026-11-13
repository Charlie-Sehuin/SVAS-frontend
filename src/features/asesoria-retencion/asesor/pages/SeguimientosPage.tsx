import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../../auth/useAuth';
import { useIsDesktop } from '../../../../shared/hooks/useMediaQuery';
import { formatearFecha, tiempoTranscurrido } from '../../../../shared/lib/format';
import type { SeguimientoEnLista } from '../../../../shared/types/api';
import type { EstadoSeguimiento } from '../../../../shared/types/enums';
import { Button } from '../../../../shared/ui/button';
import { Card } from '../../../../shared/ui/card';
import { Select } from '../../../../shared/ui/select';
import { Skeleton } from '../../../../shared/ui/skeleton';
import { Table, TBody, TD, TH, THead, TR } from '../../../../shared/ui/table';
import { EstadoError, EstadoVacio } from '../../../../shared/ui/domain/EstadoVacio';
import { Filtro, FiltrosBar } from '../../../../shared/ui/domain/FiltrosBar';
import { PageHeader } from '../../../../shared/ui/domain/PageHeader';
import { StatusBadge } from '../../../../shared/ui/domain/StatusBadge';
import { useSeguimientos } from '../../hooks/useAsesoria';
import { TEXTO_MOTIVO_CIERRE } from '../textos';

/**
 * `/app/seguimientos` (CU-04, RF-16..21): cotizaciones que no se concretaron y siguen en seguimiento para recuperarlas.
 * Datos personales enmascarados en la lista. El ADMINISTRADOR solo lee. Por defecto, los que siguen abiertos.
 */
export function SeguimientosPage() {
  const { roles } = useAuth();
  const esAsesor = roles.includes('ASESOR');
  const [estado, setEstado] = useState<EstadoSeguimiento | ''>('');
  const lista = useSeguimientos(estado || undefined);
  const escritorio = useIsDesktop();
  const items = lista.data ?? [];

  return (
    <div>
      <PageHeader
        titulo="Seguimiento y retención"
        descripcion={
          esAsesor
            ? 'Cotizaciones que no se concretaron. Contacta al cliente por el canal que prefiere y registra cada intento.'
            : 'Vista de solo lectura. Los seguimientos los atienden los asesores.'
        }
      />

      <FiltrosBar>
        <Filtro label="Estado">
          <Select compact value={estado} onChange={(e) => setEstado(e.target.value as EstadoSeguimiento | '')}>
            <option value="">En seguimiento</option>
            <option value="CONVERTIDO">Convertidos</option>
            <option value="DESCARTADO">Descartados</option>
          </Select>
        </Filtro>
      </FiltrosBar>

      {lista.isError ? (
        <EstadoError error={lista.error} onRetry={() => void lista.refetch()} />
      ) : lista.isLoading ? (
        <div className="space-y-2" aria-busy aria-label="Cargando los seguimientos">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EstadoVacio titulo="No hay seguimientos con este estado." />
      ) : escritorio ? (
        <Table caption="Seguimientos de cotizaciones">
          <THead>
            <tr>
              <TH>Cliente</TH>
              <TH>Vehículo</TH>
              <TH>Intentos</TH>
              <TH>Abierto</TH>
              <TH>Estado</TH>
              <TH>
                <span className="sr-only">Acción</span>
              </TH>
            </tr>
          </THead>
          <TBody>
            {items.map((s) => (
              <TR key={s.id}>
                <TD>{s.cliente.nombre}</TD>
                <TD>{s.cotizacion.vehiculo}</TD>
                <TD>{s.intentos}</TD>
                <TD>{tiempoTranscurrido(s.fechaApertura)}</TD>
                <TD>
                  <Estado s={s} />
                </TD>
                <TD>
                  <Button size="sm" variant={s.estado === 'EN_SEGUIMIENTO' && esAsesor ? 'primary' : 'outlineNavy'} asChild>
                    <Link to={`/app/seguimientos/${s.id}`}>{s.estado === 'EN_SEGUIMIENTO' && esAsesor ? 'Atender' : 'Ver'}</Link>
                  </Button>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      ) : (
        <ul className="space-y-3">
          {items.map((s) => (
            <li key={s.id}>
              <Card className="space-y-2 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-bold text-navy-700">{s.cliente.nombre}</p>
                  <Estado s={s} />
                </div>
                <p className="text-small text-ink">{s.cotizacion.vehiculo}</p>
                <p className="text-small text-ink-soft">
                  {s.intentos} {s.intentos === 1 ? 'intento' : 'intentos'} · abierto {tiempoTranscurrido(s.fechaApertura)}
                </p>
                <Button size="sm" variant="outlineNavy" asChild>
                  <Link to={`/app/seguimientos/${s.id}`}>{s.estado === 'EN_SEGUIMIENTO' && esAsesor ? 'Atender' : 'Ver'}</Link>
                </Button>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Estado en texto; un seguimiento cerrado dice también el motivo y la fecha. */
function Estado({ s }: { s: SeguimientoEnLista }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
      <StatusBadge entity="seguimiento" value={s.estado} />
      {s.motivoCierre ? <span className="text-caption text-ink-soft">{TEXTO_MOTIVO_CIERRE[s.motivoCierre]}</span> : null}
      {s.fechaCierre ? <span className="text-caption text-ink-soft">{formatearFecha(s.fechaCierre)}</span> : null}
    </span>
  );
}

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bot, Clock, UserRound } from 'lucide-react';
import { useAuth } from '../../../../auth/useAuth';
import { useIsDesktop } from '../../../../shared/hooks/useMediaQuery';
import { tiempoTranscurrido } from '../../../../shared/lib/format';
import { cn } from '../../../../shared/lib/utils';
import type { SolicitudEnCola } from '../../../../shared/types/api';
import type { EstadoSolicitudAsesoria, OrigenCaso } from '../../../../shared/types/enums';
import { Button } from '../../../../shared/ui/button';
import { Card } from '../../../../shared/ui/card';
import { Select } from '../../../../shared/ui/select';
import { Skeleton } from '../../../../shared/ui/skeleton';
import { Table, TBody, TD, TH, THead, TR } from '../../../../shared/ui/table';
import { EstadoError, EstadoVacio } from '../../../../shared/ui/domain/EstadoVacio';
import { Filtro, FiltrosBar } from '../../../../shared/ui/domain/FiltrosBar';
import { PageHeader } from '../../../../shared/ui/domain/PageHeader';
import { StatusBadge } from '../../../../shared/ui/domain/StatusBadge';
import { ErrorToast } from '../../../../shared/ui/domain/toasts';
import { useColaAsesoria, useTomarSolicitud } from '../../hooks/useAsesoria';
import { esperaLarga, TEXTO_CANAL, TEXTO_MOTIVO, TEXTO_ORIGEN } from '../textos';

/**
 * `/app/asesorias` (CU-03, RF-13, RN-13): la cola de solicitudes. El backend la entrega ya en el orden de RN-13 (primero
 * las del sistema, luego por antigüedad) y este orden NO se cambia aquí. Datos personales enmascarados. El
 * ADMINISTRADOR solo lee; el ASESOR toma casos. Una espera de más de 4 h se marca en ámbar y con texto.
 */
export function ColaAsesoriaPage() {
  const { roles } = useAuth();
  const navigate = useNavigate();
  const esAsesor = roles.includes('ASESOR');
  const [estado, setEstado] = useState<EstadoSolicitudAsesoria | ''>('');
  const [origen, setOrigen] = useState<OrigenCaso | ''>('');
  const cola = useColaAsesoria({ estado: estado || undefined, origen: origen || undefined });
  const tomar = useTomarSolicitud();
  const escritorio = useIsDesktop();

  function tomarCaso(id: string) {
    tomar.mutate(id, {
      onSuccess: () => navigate(`/app/asesorias/${id}`),
      // 409: "Otro asesor tomó este caso." El mensaje es el del backend; la cola ya se está refrescando.
      onError: (e) => ErrorToast(e),
    });
  }

  const items = cola.data ?? [];

  return (
    <div>
      <PageHeader
        titulo="Cola de asesoría"
        descripcion={
          esAsesor
            ? 'Las solicitudes del sistema van primero y después las del cliente, de la más antigua a la más nueva.'
            : 'Vista de solo lectura. Los casos los atienden los asesores.'
        }
      />

      <FiltrosBar>
        <Filtro label="Estado">
          <Select compact value={estado} onChange={(e) => setEstado(e.target.value as EstadoSolicitudAsesoria | '')}>
            <option value="">Abiertas</option>
            <option value="PENDIENTE">Pendientes</option>
            <option value="EN_ATENCION">En atención</option>
            <option value="CERRADA">Cerradas</option>
          </Select>
        </Filtro>
        <Filtro label="Origen">
          <Select compact value={origen} onChange={(e) => setOrigen(e.target.value as OrigenCaso | '')}>
            <option value="">Todos</option>
            <option value="SISTEMA">Sistema</option>
            <option value="CLIENTE">Cliente</option>
          </Select>
        </Filtro>
      </FiltrosBar>

      {cola.isError ? (
        <EstadoError error={cola.error} onRetry={() => void cola.refetch()} />
      ) : cola.isLoading ? (
        <div className="space-y-2" aria-busy aria-label="Cargando la cola">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EstadoVacio titulo="No hay solicitudes con estos filtros." />
      ) : escritorio ? (
        <Table caption="Cola de solicitudes de asesoría">
          <THead>
            <tr>
              <TH>Prioridad</TH>
              <TH>Motivo</TH>
              <TH>Cliente</TH>
              <TH>Vehículo</TH>
              <TH>Canal</TH>
              <TH>Espera</TH>
              <TH>Estado</TH>
              <TH>
                <span className="sr-only">Acción</span>
              </TH>
            </tr>
          </THead>
          <TBody>
            {items.map((s) => (
              <TR key={s.id}>
                <TD>
                  <Prioridad origen={s.origen} />
                </TD>
                <TD>{TEXTO_MOTIVO[s.motivo]}</TD>
                <TD>{s.cliente.nombre}</TD>
                <TD>{s.cotizacion.vehiculo}</TD>
                <TD>{TEXTO_CANAL[s.canal]}</TD>
                <TD>
                  <Espera s={s} />
                </TD>
                <TD>
                  <StatusBadge entity="solicitud" value={s.estado} />
                </TD>
                <TD>
                  <Acciones s={s} esAsesor={esAsesor} tomando={tomar.isPending && tomar.variables === s.id} onTomar={tomarCaso} />
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
                  <Prioridad origen={s.origen} />
                  <StatusBadge entity="solicitud" value={s.estado} />
                </div>
                <p className="font-bold text-navy-700">{TEXTO_MOTIVO[s.motivo]}</p>
                <p className="text-small text-ink">
                  {s.cliente.nombre} · {s.cotizacion.vehiculo}
                </p>
                <p className="text-small text-ink-soft">Prefiere {TEXTO_CANAL[s.canal]}</p>
                <Espera s={s} />
                <Acciones s={s} esAsesor={esAsesor} tomando={tomar.isPending && tomar.variables === s.id} onTomar={tomarCaso} />
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Prioridad con icono Y texto (nunca solo icono). */
function Prioridad({ origen }: { origen: OrigenCaso }) {
  const Icono = origen === 'SISTEMA' ? Bot : UserRound;
  return (
    <span className="inline-flex items-center gap-1.5 font-bold text-navy-700">
      <Icono className="size-4" aria-hidden /> {TEXTO_ORIGEN[origen]}
    </span>
  );
}

/** Tiempo de espera; pasadas 4 h se marca en ámbar y con el texto "Espera larga". */
function Espera({ s }: { s: SolicitudEnCola }) {
  const abierta = s.estado !== 'CERRADA';
  const larga = abierta && esperaLarga(s.fechaCreacion);
  return (
    <span className={cn('inline-flex items-center gap-1.5', larga ? 'font-bold text-status-pending' : 'text-ink-soft')}>
      <Clock className="size-4" aria-hidden /> {tiempoTranscurrido(s.fechaCreacion)}
      {larga ? <span className="rounded bg-status-warning/15 px-1.5 py-0.5 text-caption">Espera larga</span> : null}
    </span>
  );
}

function Acciones({
  s,
  esAsesor,
  tomando,
  onTomar,
}: {
  s: SolicitudEnCola;
  esAsesor: boolean;
  tomando: boolean;
  onTomar: (id: string) => void;
}) {
  // Solo el ASESOR toma y solo una pendiente; el administrador solo mira.
  if (esAsesor && s.estado === 'PENDIENTE') {
    return (
      <Button size="sm" loading={tomando} loadingText="Tomando…" onClick={() => onTomar(s.id)}>
        Tomar caso
      </Button>
    );
  }
  return (
    <Button size="sm" variant="outlineNavy" asChild>
      <Link to={`/app/asesorias/${s.id}`}>{s.asignadoAMi ? 'Atender' : 'Ver caso'}</Link>
    </Button>
  );
}


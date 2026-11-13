import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '../../../../auth/useAuth';
import { tiempoTranscurrido } from '../../../../shared/lib/format';
import { Button } from '../../../../shared/ui/button';
import { Skeleton } from '../../../../shared/ui/skeleton';
import { EstadoError } from '../../../../shared/ui/domain/EstadoVacio';
import { PageHeader } from '../../../../shared/ui/domain/PageHeader';
import { StatusBadge } from '../../../../shared/ui/domain/StatusBadge';
import { ErrorToast } from '../../../../shared/ui/domain/toasts';
import { useSolicitudDetalle, useTomarSolicitud } from '../../hooks/useAsesoria';
import { ClienteCard } from '../components/ClienteCard';
import { PlanesCotizadosCard } from '../components/PlanesCotizadosCard';
import { CerrarCasoForm } from '../components/CerrarCasoForm';
import { NegociarDescuentoForm } from '../components/NegociarDescuentoForm';
import { SimulacionDelCaso } from '../components/SimulacionDelCaso';
import { TEXTO_CANAL, TEXTO_MOTIVO, TEXTO_ORIGEN } from '../textos';

/**
 * `/app/asesorias/:id` (CU-03, diseño §10.3): dos columnas. Izquierda, quién es el cliente, su vehículo, los planes
 * cotizados y su Prueba de Choque. Derecha, negociar descuento (con el tope a la vista) y cerrar. Solo el asesor que tomó el
 * caso puede actuar; el administrador mira. El documento llega completo solo en el caso asignado o para el administrador.
 */
export function CasoDetallePage() {
  const { id = '' } = useParams();
  const { roles } = useAuth();
  const { data: caso, isLoading, isError, error, refetch } = useSolicitudDetalle(id);
  const tomar = useTomarSolicitud();

  const volver = (
    <Button variant="ghost" size="sm" className="mb-3 -ml-3" asChild>
      <Link to="/app/asesorias">
        <ArrowLeft aria-hidden /> Volver a la cola
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
  if (isLoading || !caso) {
    return (
      <div aria-busy aria-label="Cargando el caso">
        {volver}
        <Skeleton className="mb-4 h-9 w-1/2" />
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-72 w-full" />
          <Skeleton className="h-72 w-full" />
        </div>
      </div>
    );
  }

  const esAsesor = roles.includes('ASESOR');
  const esAdmin = roles.includes('ADMINISTRADOR');
  const puedeTomar = esAsesor && caso.estado === 'PENDIENTE';
  const puedeActuar = esAsesor && caso.asignadoAMi && caso.estado === 'EN_ATENCION';
  const puedeVerSimulacion = caso.asignadoAMi || esAdmin;
  const c = caso.cliente;

  return (
    <div>
      {volver}
      <PageHeader
        titulo={`Caso: ${TEXTO_MOTIVO[caso.motivo]}`}
        descripcion={`Pedido por ${TEXTO_ORIGEN[caso.origen].toLowerCase()} ${tiempoTranscurrido(caso.fechaCreacion)} · prefiere ${TEXTO_CANAL[caso.canal]}`}
        accion={
          <>
            <StatusBadge entity="solicitud" value={caso.estado} />
            {puedeTomar ? (
              <Button loading={tomar.isPending} loadingText="Tomando…" onClick={() => tomar.mutate(caso.id, { onError: (e) => ErrorToast(e) })}>
                Tomar caso
              </Button>
            ) : null}
          </>
        }
      />

      {caso.estado === 'EN_ATENCION' && !caso.asignadoAMi ? (
        <p role="status" className="mb-4 rounded-lg bg-status-info/10 px-3 py-2 text-small text-ink">
          Este caso lo atiende otro asesor.
        </p>
      ) : null}
      {esAdmin && !esAsesor ? (
        <p role="status" className="mb-4 rounded-lg bg-surface-muted px-3 py-2 text-small text-ink-soft">
          Vista de solo lectura.
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <ClienteCard cliente={c} />
          <PlanesCotizadosCard cotizacion={caso.cotizacion} primas={caso.primas} />

          <SimulacionDelCaso cotizacionId={caso.cotizacion.id} puedeVer={puedeVerSimulacion} />
        </div>

        <div className="space-y-4">
          <NegociarDescuentoForm caso={caso} habilitado={puedeActuar} />
          <CerrarCasoForm caso={caso} habilitado={puedeActuar} />
        </div>
      </div>
    </div>
  );
}

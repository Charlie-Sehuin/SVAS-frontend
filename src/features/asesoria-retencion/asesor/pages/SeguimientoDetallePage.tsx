import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Send } from 'lucide-react';
import { useAuth } from '../../../../auth/useAuth';
import { formatearFecha, tiempoTranscurrido } from '../../../../shared/lib/format';
import { Button } from '../../../../shared/ui/button';
import { Card } from '../../../../shared/ui/card';
import { Skeleton } from '../../../../shared/ui/skeleton';
import { EstadoError } from '../../../../shared/ui/domain/EstadoVacio';
import { PageHeader } from '../../../../shared/ui/domain/PageHeader';
import { StatusBadge } from '../../../../shared/ui/domain/StatusBadge';
import { ErrorToast, SuccessToast, WarningToast } from '../../../../shared/ui/domain/toasts';
import { useRegistrarAceptacion, useSeguimientoDetalle } from '../../hooks/useAsesoria';
import { CerrarSeguimientoDialog } from '../components/CerrarSeguimientoDialog';
import { ClienteCard } from '../components/ClienteCard';
import { PlanesCotizadosCard } from '../components/PlanesCotizadosCard';
import { RegistrarIntentoForm } from '../components/RegistrarIntentoForm';
import { TEXTO_CANAL, TEXTO_MOTIVO_CIERRE, TEXTO_RESULTADO_INTENTO } from '../textos';

const MS_DIA = 86_400_000;

/**
 * `/app/seguimientos/:id` (CU-04, diseño §10.4): el cliente, sus planes, el contador de intentos con su límite y el plazo,
 * el formulario de intento (solo el canal preferido), el aviso de que aceptó por teléfono y el cierre con motivo. Los
 * límites (máximo de intentos y días) los manda el backend; solo el ASESOR actúa y el ADMINISTRADOR mira.
 */
export function SeguimientoDetallePage() {
  const { id = '' } = useParams();
  const { roles } = useAuth();
  const { data: seg, isLoading, isError, error, refetch } = useSeguimientoDetalle(id);
  const aceptacion = useRegistrarAceptacion(id);
  const [cerrando, setCerrando] = useState(false);

  const volver = (
    <Button variant="ghost" size="sm" className="mb-3 -ml-3" asChild>
      <Link to="/app/seguimientos">
        <ArrowLeft aria-hidden /> Volver a seguimientos
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
  if (isLoading || !seg) {
    return (
      <div aria-busy aria-label="Cargando el seguimiento">
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
  const abierto = seg.estado === 'EN_SEGUIMIENTO';
  const puedeActuar = esAsesor && abierto;
  // Días que quedan del plazo (RN-10): los días del seguimiento menos los ya transcurridos desde su apertura.
  const transcurridos = Math.floor((Date.now() - new Date(seg.fechaApertura).getTime()) / MS_DIA);
  const diasRestantes = Math.max(0, seg.diasSeguimiento - transcurridos);

  function enviarEnlace() {
    aceptacion.mutate(undefined, {
      onSuccess: (r) => {
        if (r.enlaceEnviado) SuccessToast('Enlace de compra enviado', 'El cliente lo recibirá por su canal preferido.');
        else if (r.warning) WarningToast(r.warning, `warning-seg-${id}`);
      },
      onError: (e) => ErrorToast(e),
    });
  }

  return (
    <div>
      {volver}
      <PageHeader
        titulo="Seguimiento"
        descripcion={`Abierto ${tiempoTranscurrido(seg.fechaApertura)} · ${seg.cotizacion.vehiculo}`}
        accion={<StatusBadge entity="seguimiento" value={seg.estado} />}
      />

      {!abierto ? (
        <p role="status" className="mb-4 rounded-lg bg-surface-muted px-3 py-2 text-small text-ink">
          Cerrado{seg.fechaCierre ? ` el ${formatearFecha(seg.fechaCierre, 'larga')}` : ''}
          {seg.motivoCierre ? ` · Motivo: ${TEXTO_MOTIVO_CIERRE[seg.motivoCierre]}` : ''}.
        </p>
      ) : !esAsesor ? (
        <p role="status" className="mb-4 rounded-lg bg-surface-muted px-3 py-2 text-small text-ink-soft">
          Vista de solo lectura.
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <ClienteCard cliente={seg.cliente} />
          <PlanesCotizadosCard cotizacion={seg.cotizacion} primas={seg.primas} />

          <Card className="p-4">
            <h2 className="text-h3 text-navy-700">Historial de intentos</h2>
            {seg.historial.length === 0 ? (
              <p className="mt-2 text-small text-ink-soft">Todavía no hay intentos de contacto.</p>
            ) : (
              <ol aria-label="Historial de intentos" className="mt-2 divide-y divide-line rounded-lg border border-line">
                {seg.historial.map((i) => (
                  <li key={i.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-small">
                    <span className="flex-1 font-bold text-navy-700">{TEXTO_RESULTADO_INTENTO[i.resultado]}</span>
                    <span className="text-ink-soft">{TEXTO_CANAL[i.canal]}</span>
                    <span className="text-ink-soft">{formatearFecha(i.fecha, 'hora')}</span>
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <RegistrarIntentoForm seguimiento={seg} habilitado={puedeActuar} diasRestantes={diasRestantes} />

          <section aria-labelledby="titulo-aceptacion" className="rounded-xl border border-line bg-surface p-4">
            <h2 id="titulo-aceptacion" className="text-h3 text-navy-700">
              El cliente aceptó por teléfono
            </h2>
            <p className="mt-1 text-small text-ink-soft">Le enviamos el enlace para que complete su compra con su descuento de primera compra.</p>
            {puedeActuar ? (
              <Button className="mt-3" variant="outlineNavy" loading={aceptacion.isPending} loadingText="Enviando…" onClick={enviarEnlace}>
                <Send aria-hidden /> Enviar enlace de compra
              </Button>
            ) : (
              <p className="mt-3 text-small text-ink-soft">Solo el asesor puede enviar el enlace mientras el seguimiento está abierto.</p>
            )}
          </section>

          {puedeActuar ? (
            <section aria-labelledby="titulo-cierre-seg" className="rounded-xl border border-line bg-surface p-4">
              <h2 id="titulo-cierre-seg" className="text-h3 text-navy-700">
                Cerrar el seguimiento
              </h2>
              <p className="mt-1 text-small text-ink-soft">Si el cliente no va a comprar, ciérralo con el motivo.</p>
              <Button className="mt-3" variant="outlineNavy" onClick={() => setCerrando(true)}>
                Cerrar seguimiento
              </Button>
            </section>
          ) : null}
        </div>
      </div>

      <CerrarSeguimientoDialog open={cerrando} onOpenChange={setCerrando} seguimientoId={seg.id} />
    </div>
  );
}

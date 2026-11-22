import { Link } from 'react-router-dom';
import { Headset, MessageCircle, Percent, Phone } from 'lucide-react';
import { formatearFecha, formatearPorcentaje } from '../../../shared/lib/format';
import type { SolicitudMia } from '../../../shared/types/api';
import type { CanalContacto, EstadoSolicitudAsesoria, MotivoAsesoria } from '../../../shared/types/enums';
import { Button } from '../../../shared/ui/button';
import { Card } from '../../../shared/ui/card';
import { Skeleton } from '../../../shared/ui/skeleton';
import { EstadoError, EstadoVacio } from '../../../shared/ui/domain/EstadoVacio';
import { StatusBadge } from '../../../shared/ui/domain/StatusBadge';
import { MiCuentaTabs } from '../../cotizacion/pages/MisCotizacionesPage';
import { useMisAsesorias } from '../hooks/useAsesoria';

/** Lo que pidió la persona, en sus palabras. `INSPECCION` y `NO_ASEGURABLE` los abre el sistema, no ella. */
const MOTIVO: Record<MotivoAsesoria, string> = {
  DUDA: 'Una duda sobre tu seguro',
  NEGOCIACION: 'Conversar el precio',
  DESCUENTO: 'Un descuento',
  INSPECCION: 'Revisión de tu vehículo',
  NO_ASEGURABLE: 'Revisión de tu caso',
};

const CANAL: Record<CanalContacto, { texto: string; icono: typeof Phone }> = {
  WHATSAPP: { texto: 'WhatsApp', icono: MessageCircle },
  LLAMADA: { texto: 'una llamada', icono: Phone },
};

/** Una frase por estado: qué pasó y qué sigue, sin jerga. */
function queSigue(s: SolicitudMia): string {
  const medio = CANAL[s.canal].texto;
  const porEstado: Record<EstadoSolicitudAsesoria, string> = {
    PENDIENTE: `Recibimos tu solicitud. Un asesor la tomará pronto y te contactará por ${medio}.`,
    EN_ATENCION: `Un asesor está atendiendo tu caso. Te contactará por ${medio}.`,
    CERRADA: s.descuentoAceptado ? 'Tu caso se atendió y quedó un descuento para tu compra.' : 'Tu caso ya se atendió.',
  };
  return porEstado[s.estado];
}

/** `/mi-cuenta/asesorias` (CLIENTE): el estado de cada vez que pidió hablar con un asesor. Solo lectura. */
export function MisAsesoriasPage() {
  const { data, isLoading, isError, error, refetch } = useMisAsesorias();

  return (
    <section className="mx-auto max-w-3xl px-4 py-6 lg:py-10">
      <h1 className="mb-4 text-h1 text-navy-700">Mi cuenta</h1>
      <MiCuentaTabs />

      {isError ? (
        <EstadoError error={error} onRetry={() => void refetch()} />
      ) : isLoading ? (
        <div className="space-y-3" aria-busy aria-label="Cargando tus asesorías">
          {Array.from({ length: 2 }, (_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : data && data.length === 0 ? (
        <EstadoVacio
          titulo="Aún no hablaste con un asesor. Cuando pidas ayuda desde una cotización, la verás aquí."
          icono={<Headset className="size-10 text-navy-300" aria-hidden />}
          accion={
            <Button asChild>
              <Link to="/mi-cuenta/cotizaciones">Ver mis cotizaciones</Link>
            </Button>
          }
        />
      ) : (
        <ul className="space-y-3">
          {data?.map((s) => {
            const Canal = CANAL[s.canal].icono;
            return (
              <li key={s.id}>
                <Card className="p-4">
                  <div className="flex flex-wrap items-start gap-x-4 gap-y-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-navy-700">{MOTIVO[s.motivo]}</p>
                      <p className="text-small text-ink-soft">
                        {s.cotizacion.vehiculo} · pedida el {formatearFecha(s.fechaCreacion, 'larga')}
                      </p>
                    </div>
                    <StatusBadge entity="solicitud" value={s.estado} />
                  </div>

                  <p className="mt-3 flex items-start gap-2 text-ink">
                    <Canal className="mt-0.5 size-5 shrink-0 text-navy-700" aria-hidden />
                    <span>{queSigue(s)}</span>
                  </p>

                  {s.descuentoAceptado ? (
                    <p className="mt-3 flex items-center gap-2 rounded-lg bg-status-success/10 p-3 text-small font-bold text-ink">
                      <Percent className="size-5 shrink-0 text-status-success" aria-hidden />
                      Descuento para tu compra: {formatearPorcentaje(s.descuentoAceptado.porcentaje)}
                    </p>
                  ) : null}

                  <Button variant="outlineNavy" size="sm" className="mt-4" asChild>
                    <Link to={`/cotizacion/${s.cotizacion.id}`}>Ver mi cotización</Link>
                  </Button>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

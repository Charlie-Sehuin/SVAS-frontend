import { Link, useNavigate } from 'react-router-dom';
import { Car, MapPin } from 'lucide-react';
import { formatearFecha } from '../../../shared/lib/format';
import type { VehiculoGuardado } from '../../../shared/types/api';
import { TEXTO_USO } from '../../../shared/types/enums';
import { Badge } from '../../../shared/ui/badge';
import { Button } from '../../../shared/ui/button';
import { Card } from '../../../shared/ui/card';
import { Skeleton } from '../../../shared/ui/skeleton';
import { EstadoError, EstadoVacio } from '../../../shared/ui/domain/EstadoVacio';
import { useMisVehiculos } from '../hooks/useCotizacion';
import { nombreVehiculo, vehiculoABorrador } from '../lib/vehiculoABorrador';
import { useCotizarWizardStore } from '../store/useCotizarWizardStore';
import { MiCuentaTabs } from './MisCotizacionesPage';

/** "Miraflores, Lima": el distrito con su provincia, con inicial en mayúscula (la base los guarda en mayúsculas), salvo "de", "del", "la"… */
const MENORES = new Set(['de', 'del', 'la', 'las', 'los', 'el', 'y']);
const titulo = (t: string) =>
  t
    .toLowerCase()
    .split(/\s+/)
    .map((p, i) => (i > 0 && MENORES.has(p) ? p : p.charAt(0).toUpperCase() + p.slice(1)))
    .join(' ');
const dondeCircula = (u: NonNullable<VehiculoGuardado['ubicacion']>) => `${titulo(u.distrito)}, ${titulo(u.provincia)}`;

/** `/mi-cuenta/vehiculos` (CLIENTE): los autos que ya cotizó, con "Cotizar de nuevo" para no volver a escribir sus datos. */
export function MisVehiculosPage() {
  const { data, isLoading, isError, error, refetch } = useMisVehiculos();
  const navigate = useNavigate();

  function cotizarDeNuevo(v: VehiculoGuardado) {
    // Un trámite nuevo con los datos de este auto; lo que ya hubiera a medias se reemplaza porque la persona lo pidió.
    const wizard = useCotizarWizardStore.getState();
    wizard.reiniciar();
    wizard.guardarBorrador(vehiculoABorrador(v));
    navigate('/cotizar');
  }

  return (
    <section className="mx-auto max-w-3xl px-4 py-6 lg:py-10">
      <h1 className="mb-4 text-h1 text-navy-700">Mi cuenta</h1>
      <MiCuentaTabs />

      {isError ? (
        <EstadoError error={error} onRetry={() => void refetch()} />
      ) : isLoading ? (
        <div className="space-y-3" aria-busy aria-label="Cargando tus vehículos">
          {Array.from({ length: 2 }, (_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      ) : data && data.length === 0 ? (
        <EstadoVacio
          titulo="Aún no cotizaste ningún auto. Cuando lo hagas, aparecerá aquí para cotizar de nuevo con un toque."
          icono={<Car className="size-10 text-navy-300" aria-hidden />}
          accion={
            <Button asChild>
              <Link to="/cotizar">Cotizar ahora</Link>
            </Button>
          }
        />
      ) : (
        <ul className="space-y-3">
          {data?.map((v) => (
            <li key={v.clave}>
              <Card className="p-4">
                <div className="flex flex-wrap items-start gap-x-4 gap-y-2">
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-navy-50">
                    <Car className="size-6 text-navy-700" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-navy-700">{nombreVehiculo(v)}</p>
                    <p className="text-small text-ink-soft">
                      {v.placa ? `Placa ${v.placa} · ` : 'Sin placa · '}
                      {TEXTO_USO[v.uso]}
                    </p>
                    {v.ubicacion ? (
                      <p className="mt-0.5 flex items-center gap-1 text-small text-ink-soft">
                        <MapPin className="size-4 shrink-0" aria-hidden /> {dondeCircula(v.ubicacion)}
                      </p>
                    ) : null}
                  </div>
                  {v.asegurado ? <Badge tone="success">Asegurado</Badge> : null}
                </div>

                <p className="mt-3 text-small text-ink-soft">
                  {v.cotizaciones === 1 ? 'Cotizado 1 vez' : `Cotizado ${v.cotizaciones} veces`} · última vez el {formatearFecha(v.ultimaCotizacion, 'larga')}
                </p>

                <Button variant="outlineNavy" size="sm" className="mt-3" onClick={() => cotizarDeNuevo(v)}>
                  Cotizar de nuevo
                </Button>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

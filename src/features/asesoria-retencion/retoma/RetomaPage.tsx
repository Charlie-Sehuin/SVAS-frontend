import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { BadgePercent, Car, LinkIcon } from 'lucide-react';
import { isApiError } from '../../../shared/lib/api-client';
import { formatearFecha, formatearPorcentaje } from '../../../shared/lib/format';
import { qk } from '../../../shared/lib/query-keys';
import { useCotizacionTokenStore } from '../../../shared/stores/useCotizacionTokenStore';
import type { RetomaResponse } from '../../../shared/types/api';
import { Button } from '../../../shared/ui/button';
import { Card } from '../../../shared/ui/card';
import { Skeleton } from '../../../shared/ui/skeleton';
import { useResumenCotizacion } from '../../cotizacion/hooks/useCotizacion';
import * as api from '../api/asesoria.api';
import { marcarComoRetoma } from './retoma';

const CLAVE_RESUELTA = (token: string) => `svas.retoma.${token}`;

/** El enlace es de un solo uso: si la página se recarga, el resultado ya guardado evita pedirlo otra vez y "romper" el enlace. */
function leerResuelta(token: string): RetomaResponse | undefined {
  try {
    const crudo = sessionStorage.getItem(CLAVE_RESUELTA(token));
    return crudo ? (JSON.parse(crudo) as RetomaResponse) : undefined;
  } catch {
    return undefined;
  }
}

async function resolver(token: string): Promise<RetomaResponse> {
  const guardada = leerResuelta(token);
  if (guardada) return guardada;
  const r = await api.resolverRetoma(token);
  // El `tokenAcceso` nuevo sale UNA sola vez: se guarda ya para que la cotización se abra con él (sessionStorage, nunca localStorage).
  useCotizacionTokenStore.getState().guardar(r.cotizacionId, r.tokenAcceso);
  marcarComoRetoma(r.cotizacionId);
  try {
    sessionStorage.setItem(CLAVE_RESUELTA(token), JSON.stringify(r));
  } catch {
    /* sin sessionStorage: la página funciona igual, solo no sobrevive a una recarga */
  }
  return r;
}

/**
 * `/retoma/:token` (RF-21, RN-12). El enlace del mensaje de retención reabre la cotización con el descuento de primera
 * compra. Es público y de un solo uso; si venció o ya se usó, el backend lo dice y se ofrece cotizar de nuevo.
 */
export function RetomaPage() {
  const { token = '' } = useParams();
  const retoma = useQuery({
    queryKey: qk.retoma(token),
    queryFn: () => resolver(token),
    enabled: !!token,
    staleTime: Infinity,
    retry: false,
  });
  const cotizacionQ = useResumenCotizacion(retoma.data?.cotizacionId);

  if (retoma.isLoading || !token) {
    return (
      <section className="mx-auto max-w-xl space-y-4 px-4 py-10" aria-busy aria-label="Abriendo tu cotización">
        <Skeleton className="h-9 w-2/3" />
        <Skeleton className="h-40 w-full" />
      </section>
    );
  }

  if (retoma.isError || !retoma.data) {
    const mensaje = isApiError(retoma.error) ? retoma.error.message : 'No pudimos abrir tu enlace.';
    return (
      <section className="mx-auto max-w-xl px-4 py-10">
        <Card className="flex flex-col items-center gap-3 p-6 text-center">
          <LinkIcon className="size-10 text-navy-300" aria-hidden />
          <h1 className="text-h2 text-navy-700">Este enlace ya no sirve</h1>
          <p role="alert" className="text-ink">
            {mensaje}
          </p>
          <p className="text-ink-soft">Puedes cotizar de nuevo en 1 minuto.</p>
          <Button size="lg" asChild>
            <Link to="/cotizar">Cotizar ahora</Link>
          </Button>
        </Card>
      </section>
    );
  }

  const { cotizacionId, descuento } = retoma.data;
  const cot = cotizacionQ.data?.cotizacion;

  return (
    <section className="mx-auto max-w-xl px-4 py-10">
      <h1 className="mb-4 text-h1 text-navy-700">Retoma tu cotización</h1>

      <Card className="p-5">
        {cot ? (
          <>
            <p className="flex items-center gap-2 font-bold text-navy-700">
              <Car className="size-5" aria-hidden /> {cot.vehiculo.marca} {cot.vehiculo.modelo} {cot.vehiculo.anio}
            </p>
            <p className="mt-1 text-small text-ink-soft">Cotizada el {formatearFecha(cot.fecha, 'larga')}</p>
          </>
        ) : cotizacionQ.isLoading ? (
          <Skeleton className="h-10 w-2/3" aria-label="Cargando tu cotización" />
        ) : (
          <p className="text-ink-soft">Tu cotización está guardada.</p>
        )}

        <p className="mt-4 flex items-start gap-2 rounded-lg bg-status-info/10 px-3 py-2 text-ink">
          <BadgePercent className="mt-0.5 size-5 shrink-0 text-status-info" aria-hidden />
          <span>
            {descuento.tipo === 'PRIMERA_COMPRA'
              ? `Tu ${formatearPorcentaje(descuento.porcentaje)} de descuento por primera compra te está esperando.`
              : `Tienes un descuento negociado de ${formatearPorcentaje(descuento.porcentaje)}.`}
          </span>
        </p>

        <Button size="lg" className="mt-5 w-full" asChild>
          <Link to={`/cotizacion/${cotizacionId}`}>Continuar mi compra</Link>
        </Button>
      </Card>
    </section>
  );
}

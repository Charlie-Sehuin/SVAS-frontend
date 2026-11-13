import { useState } from 'react';
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom';
import { UserPlus } from 'lucide-react';
import { RegistroMinimoDialog } from '../../../auth/RegistroMinimoDialog';
import { UnauthorizedPage } from '../../../auth/UnauthorizedPage';
import { useAuth } from '../../../auth/useAuth';
import { Button } from '../../../shared/ui/button';
import { Card } from '../../../shared/ui/card';
import { Skeleton } from '../../../shared/ui/skeleton';
import { EstadoVacio } from '../../../shared/ui/domain/EstadoVacio';
import { AsistenteCompra } from '../components/AsistenteCompra';

/**
 * `/compra/:cotizacionId`. Un cliente NUEVO no tiene cuenta todavía: aquí se la crea sin salir del embudo
 * (`RegistroMinimoDialog`, CU-02). Quien ya tiene cuenta puede iniciar sesión y vuelve a esta misma pantalla.
 *
 * Con la sesión de un CLIENTE se muestra el asistente de compra (Ola 3): resumen → datos → firma → pago.
 */
export function CompraPage() {
  const { cotizacionId } = useParams();
  const location = useLocation();
  const [params] = useSearchParams();
  const primaCotizadaId = params.get('prima');
  const { estado, roles } = useAuth();
  const [abierto, setAbierto] = useState(true);
  const volver = `/cotizacion/${cotizacionId ?? ''}`;

  if (estado === 'cargando') {
    return (
      <section className="mx-auto max-w-xl space-y-4 px-4 py-10" aria-busy aria-label="Cargando">
        <Skeleton className="h-9 w-2/3" />
        <Skeleton className="h-32 w-full" />
      </section>
    );
  }

  if (estado === 'autenticado') {
    // Solo un CLIENTE compra (doc de dominio §14): asesores y administradores no.
    if (!roles.includes('CLIENTE')) return <UnauthorizedPage />;
    if (!primaCotizadaId || !cotizacionId) {
      return (
        <section className="mx-auto max-w-xl px-4 py-10">
          <EstadoVacio
            titulo="Elige primero el plan que quieres comprar."
            accion={
              <Button asChild>
                <Link to={volver}>Ver los planes de mi cotización</Link>
              </Button>
            }
          />
        </section>
      );
    }
    return (
      <section className="mx-auto max-w-[1000px] px-4 py-6 lg:py-10">
        <AsistenteCompra cotizacionId={cotizacionId} primaCotizadaId={primaCotizadaId} />
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-xl px-4 py-10">
      <Card className="flex flex-col items-center gap-3 p-6 text-center">
        <UserPlus className="size-10 text-navy-700" aria-hidden />
        <h1 className="text-h2 text-navy-700">Crea tu cuenta para comprar</h1>
        <p className="text-ink-soft">
          Es rápido y no pierdes nada: ya tenemos los datos de tu cotización. Solo falta que elijas una contraseña.
        </p>
        <div className="mt-2 flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:justify-center">
          <Button size="lg" onClick={() => setAbierto(true)}>
            Crear mi cuenta
          </Button>
          <Button variant="secondary" size="lg" asChild>
            <Link to="/login" state={{ from: location.pathname + location.search }}>
              Ya tengo cuenta
            </Link>
          </Button>
        </div>
        <Button variant="ghost" asChild>
          <Link to={volver}>Volver a mi cotización</Link>
        </Button>
      </Card>

      <RegistroMinimoDialog open={abierto} onOpenChange={setAbierto} cotizacionId={cotizacionId} />
    </section>
  );
}

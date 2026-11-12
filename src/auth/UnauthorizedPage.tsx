import { Link } from 'react-router-dom';
import { ShieldOff } from 'lucide-react';
import { Button } from '../shared/ui/button';
import { useAuth } from './useAuth';
import { rutaInicial } from '../shared/utils/permissions';

export function UnauthorizedPage() {
  const { roles, signOut } = useAuth();
  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-navy-50">
        <ShieldOff className="size-7 text-navy-700" aria-hidden />
      </div>
      <h1 className="text-h2 text-navy-700">No tienes acceso a esta pantalla</h1>
      <p className="max-w-md text-ink-soft">Tu usuario no tiene permiso para ver esta sección.</p>
      <div className="flex flex-wrap justify-center gap-3">
        <Button asChild>
          <Link to={rutaInicial(roles)}>Ir a mi inicio</Link>
        </Button>
        <Button variant="ghost" onClick={() => void signOut()}>
          Cerrar sesión
        </Button>
      </div>
    </main>
  );
}

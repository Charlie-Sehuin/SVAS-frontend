import { Link, useLocation } from 'react-router-dom';
import { Construction } from 'lucide-react';
import { Button } from '../shared/ui/button';

/**
 * Pantalla provisional para rutas del router (arquitectura §6.2) cuya
 * feature aún no se construye. Se reemplaza ola por ola (§16.2).
 */
export function PantallaPendiente({ titulo, ola }: { titulo: string; ola: 0 | 1 | 2 | 3 | 4 }) {
  const { pathname } = useLocation();
  return (
    <section className="mx-auto flex max-w-xl flex-col items-center gap-4 px-4 py-16 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-navy-50">
        <Construction className="size-7 text-navy-700" aria-hidden />
      </div>
      <h1 className="text-h1 text-navy-700">{titulo}</h1>
      <p className="text-ink-soft">
        Esta pantalla se construye en la <strong>Ola {ola}</strong> del instructivo del frontend.
      </p>
      <p className="font-mono text-small text-ink-soft">{pathname}</p>
      <Button variant="outlineNavy" asChild>
        <Link to="/">Volver al inicio</Link>
      </Button>
    </section>
  );
}
